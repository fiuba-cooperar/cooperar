package ar.uba.fi.cooperar.web.inquiries;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.IntegrationTest;
import ar.uba.fi.cooperar.RecordingEmailSender;
import ar.uba.fi.cooperar.domain.catalog.Product;
import ar.uba.fi.cooperar.domain.catalog.ProductCategory;
import ar.uba.fi.cooperar.domain.catalog.ProductDetails;
import ar.uba.fi.cooperar.domain.catalog.ProductType;
import ar.uba.fi.cooperar.domain.catalog.SaleMode;
import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationDetails;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.ProfileContact;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.organizations.Visibility;
import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.catalog.ProductCategoryRepository;
import ar.uba.fi.cooperar.repository.catalog.ProductRepository;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import ar.uba.fi.cooperar.service.notifications.EmailMessage;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * The inbox of the organization: the notice of each new inquiry, the list, the answers by email and the status. Not
 * transactional, since the emails go out after the commit.
 */
@IntegrationTest
class InquiryInboxIntegrationTest {

    private static final String WITH_EMAIL = """
            {"senderName": "Ana Pérez", "senderEmail": "ana@example.com", "senderPhone": "(011) 4444-5555",
             "quantity": 50, "message": "¿Hacen remeras con logo?"}
            """;
    private static final String WITHOUT_PHONE = """
            {"senderName": "Beto", "senderEmail": "beto@example.com", "message": "¿Precio por mayor?"}
            """;

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private RecordingEmailSender emails;

    @Autowired
    private JdbcClient jdbc;

    @Autowired
    private OrganizationRepository organizations;

    @Autowired
    private ProductCategoryRepository categories;

    @Autowired
    private ProductRepository products;

    @Autowired
    private UserAccountRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Organization organization;
    private Product shirt;
    private String token;
    private String inbox;

    @BeforeEach
    void createOrganizationWithAProduct() {
        ProductCategory category = categories.save(new ProductCategory("Indumentaria de bandeja", Instant.now()));
        UserAccount account = users.save(new UserAccount(
                "Carla", "Gómez", "coop@test.local", passwordEncoder.encode("secret-password"), Role.COOPERATIVE));
        organization = organizations.save(new Organization(
                "la-cacerola",
                new OrganizationDetails(
                        "La Cacerola",
                        "La Cacerola Ltda.",
                        OrganizationType.ERT,
                        "30-71234567-1",
                        Set.of(Sector.TEXTILE),
                        Set.of(ActivityType.PRODUCT),
                        new Address(Province.CITY_OF_BUENOS_AIRES, "Comuna 5", "Almagro", "Gascón 1234", null),
                        "Tesorera"),
                account,
                Instant.now()));
        account.getOrganizations().add(organization);
        users.saveAndFlush(account);
        Product product = new Product(
                organization,
                new ProductDetails(
                        "Remera de algodón",
                        ProductType.PRODUCT,
                        category,
                        Set.of(SaleMode.RETAIL),
                        "Descripción",
                        null),
                Instant.now());
        product.publish(Instant.now());
        shirt = products.save(product);
        token = accessToken("coop@test.local");
        inbox = "/api/cooperative/organizations/" + organization.getId() + "/inquiries";
    }

    @AfterEach
    void cleanUp() {
        jdbc.sql("DELETE FROM inquiries").update();
        jdbc.sql("DELETE FROM products").update();
        jdbc.sql("DELETE FROM organizations").update();
        jdbc.sql("DELETE FROM product_categories WHERE name = 'Indumentaria de bandeja'")
                .update();
        jdbc.sql("DELETE FROM users WHERE role <> 'ADMIN'").update();
        emails.clear();
    }

    @Test
    void eachAccountOfTheOrganizationIsToldByEmailWithTheContactDataAndInItsPanel() {
        String id = send(WITH_EMAIL);

        assertThat(emails.sentTo("coop@test.local")).singleElement().satisfies(email -> {
            assertThat(email.subject()).isEqualTo("Nueva consulta sobre Remera de algodón");
            String product = "http://localhost:5173/catalog/" + shirt.getId();
            assertThat(email.body())
                    .startsWith("Hola, Carla:")
                    .contains("Recibiste una consulta en CooperAR para La Cacerola sobre «Remera de algodón (" + product
                            + ")».")
                    .contains("Nombre: Ana Pérez\nEmail: ana@example.com\nTeléfono: (011) 4444-5555\nCantidad: 50")
                    .contains("¿Hacen remeras con logo?")
                    .contains("/cooperative/la-cacerola/inquiries/" + id)
                    .doesNotContain("datos personales");
            assertThat(email.html())
                    .contains("<a href=\"" + product + "\"")
                    .contains(">Remera de algodón</a>")
                    .contains(">Teléfono</td>");
            assertThat(email.replyTo()).isNull();
        });
        assertThat(get("/api/me/notifications")).hasStatusOk().bodyJson().satisfies(json -> {
            assertThat(json).extractingPath("$.unread").isEqualTo(1);
            assertThat(json).extractingPath("$.items[0].type").isEqualTo("INQUIRY_RECEIVED");
            assertThat(json).extractingPath("$.items[0].subject").isEqualTo("Remera de algodón");
            assertThat(json).extractingPath("$.items[0].inquiryId").isEqualTo(id);
            assertThat(json)
                    .extractingPath("$.items[0].organizationId")
                    .isEqualTo(organization.getId().toString());
        });
    }

    @Test
    void listsTheInquiriesNewestFirstWithTheCountOfEachStatusAndWithoutTheContactData() throws Exception {
        String first = send(WITH_EMAIL);
        String second = send(WITHOUT_PHONE);
        changeStatus(first, "CLOSED");

        MvcTestResult all = get(inbox);
        assertThat(all).hasStatusOk().bodyJson().satisfies(json -> {
            assertThat(json).extractingPath("$.total").isEqualTo(2);
            assertThat(json).extractingPath("$.items[*].id").isEqualTo(List.of(second, first));
            assertThat(json).extractingPath("$.items[0].senderName").isEqualTo("Beto");
            assertThat(json).extractingPath("$.items[0].productName").isEqualTo("Remera de algodón");
            assertThat(json).extractingPath("$.counts.newCount").isEqualTo(1);
            assertThat(json).extractingPath("$.counts.respondedCount").isEqualTo(0);
            assertThat(json).extractingPath("$.counts.closedCount").isEqualTo(1);
        });
        assertThat(all.getResponse().getContentAsString())
                .doesNotContain("ana@example.com")
                .doesNotContain("beto@example.com")
                .doesNotContain("4444-5555");
        assertThat(get(inbox + "?status=CLOSED")).bodyJson().satisfies(json -> {
            assertThat(json).extractingPath("$.total").isEqualTo(1);
            assertThat(json).extractingPath("$.items[*].id").isEqualTo(List.of(first));
            assertThat(json).extractingPath("$.counts.newCount").isEqualTo(1);
        });
        assertThat(get(inbox + "?size=1&page=1")).bodyJson().satisfies(json -> {
            assertThat(json).extractingPath("$.items[*].id").isEqualTo(List.of(first));
            assertThat(json).extractingPath("$.size").isEqualTo(1);
        });
    }

    @Test
    void searchesAnyDataOfTheInquiryWithEveryWordRegardlessOfCaseAndAccents() throws Exception {
        String ana = send(WITH_EMAIL);
        String beto = send(WITHOUT_PHONE);
        changeStatus(ana, "CLOSED");

        assertThat(search("perez")).isEqualTo(List.of(ana));
        assertThat(search("BETO@example")).isEqualTo(List.of(beto));
        assertThat(search("44445555")).isEqualTo(List.of(ana));
        assertThat(search("4444-5555")).isEqualTo(List.of(ana));
        assertThat(search("algodon")).isEqualTo(List.of(beto, ana));
        assertThat(search("mayor")).isEqualTo(List.of(beto));
        assertThat(search("50")).isEqualTo(List.of(ana));
        assertThat(search("ana mayor")).isEmpty();
        assertThat(search("100%")).isEmpty();
        assertThat(search("   ")).isEqualTo(List.of(beto, ana));
        assertThat(get(inbox + "?q=remera&status=CLOSED")).bodyJson().satisfies(json -> {
            assertThat(json).extractingPath("$.items[*].id").isEqualTo(List.of(ana));
            assertThat(json).extractingPath("$.counts.newCount").isEqualTo(1);
            assertThat(json).extractingPath("$.counts.closedCount").isEqualTo(1);
        });
        assertThat(get(inbox + "?q=beto")).bodyJson().satisfies(json -> {
            assertThat(json).extractingPath("$.total").isEqualTo(1);
            assertThat(json).extractingPath("$.counts.newCount").isEqualTo(1);
            assertThat(json).extractingPath("$.counts.closedCount").isEqualTo(0);
        });
        assertThat(get(inbox + "?q=" + "a".repeat(201))).hasStatus(HttpStatus.BAD_REQUEST);
    }

    private List<String> search(String query) throws Exception {
        MvcTestResult result = mvc.get()
                .uri(inbox)
                .queryParam("q", query)
                .header("Authorization", "Bearer " + token)
                .exchange();
        assertThat(result).hasStatusOk();
        return JsonPath.read(result.getResponse().getContentAsString(StandardCharsets.UTF_8), "$.items[*].id");
    }

    @Test
    void goesThroughTheInquiriesInTheOrderOfTheInboxAsSearchedAndFiltered() {
        String oldest = send(WITH_EMAIL);
        String middle = send(WITHOUT_PHONE);
        String newest = send(WITH_EMAIL);

        assertThat(get(inbox + "/" + middle + "/neighbors"))
                .hasStatusOk()
                .bodyJson()
                .satisfies(json -> {
                    assertThat(json).extractingPath("$.previousId").isEqualTo(newest);
                    assertThat(json).extractingPath("$.nextId").isEqualTo(oldest);
                    assertThat(json).extractingPath("$.total").isEqualTo(3);
                });
        assertThat(get(inbox + "/" + newest + "/neighbors")).bodyJson().satisfies(json -> {
            assertThat(json).extractingPath("$.previousId").isNull();
        });
        assertThat(get(inbox + "/" + newest + "/neighbors?q=ana")).bodyJson().satisfies(json -> {
            assertThat(json).extractingPath("$.nextId").isEqualTo(oldest);
            assertThat(json).extractingPath("$.total").isEqualTo(2);
        });

        changeStatus(middle, "CLOSED");
        assertThat(get(inbox + "/" + middle + "/neighbors?status=NEW"))
                .bodyJson()
                .satisfies(json -> {
                    assertThat(json).extractingPath("$.previousId").isEqualTo(newest);
                    assertThat(json).extractingPath("$.nextId").isEqualTo(oldest);
                    assertThat(json).extractingPath("$.total").isEqualTo(2);
                });
        assertThat(get(inbox + "/" + UUID.randomUUID() + "/neighbors")).hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void theDetailHasTheContactDataAndNoReplyAddressWhileTheProfileHasNoEmail() {
        String id = send(WITH_EMAIL);

        assertThat(get(inbox + "/" + id)).hasStatusOk().bodyJson().satisfies(json -> {
            assertThat(json).extractingPath("$.senderEmail").isEqualTo("ana@example.com");
            assertThat(json).extractingPath("$.senderPhone").isEqualTo("(011) 4444-5555");
            assertThat(json).extractingPath("$.quantity").isEqualTo(50);
            assertThat(json)
                    .extractingPath("$.productId")
                    .isEqualTo(shirt.getId().toString());
            assertThat(json).extractingPath("$.status").isEqualTo("NEW");
            assertThat(json).extractingPath("$.replyTo").isNull();
            assertThat(json).extractingPath("$.replies").asArray().isEmpty();
        });
        assertThat(reply(id, "Sí, hacemos.")).hasStatus(HttpStatus.CONFLICT);
        assertThat(emails.sentTo("ana@example.com")).isEmpty();
    }

    @Test
    void anAnswerGoesToTheSenderByEmailWithTheProfileEmailToReplyToAndMarksItResponded() {
        giveProfileEmail("ventas@lacacerola.coop");
        String id = send(WITH_EMAIL);

        assertThat(reply(id, "  Sí, desde 20 unidades.  "))
                .hasStatusOk()
                .bodyJson()
                .satisfies(json -> {
                    assertThat(json).extractingPath("$.status").isEqualTo("RESPONDED");
                    assertThat(json).extractingPath("$.replyTo").isEqualTo("ventas@lacacerola.coop");
                    assertThat(json).extractingPath("$.replies[0].message").isEqualTo("Sí, desde 20 unidades.");
                    assertThat(json).extractingPath("$.replies[0].authorName").isEqualTo("Carla");
                    assertThat(json).extractingPath("$.replies[0].sentAt").isNotNull();
                });

        EmailMessage email = emails.sentTo("ana@example.com").getFirst();
        assertThat(email.subject()).isEqualTo("Respuesta de La Cacerola a tu consulta");
        assertThat(email.replyTo()).isEqualTo("ventas@lacacerola.coop");
        assertThat(email.body())
                .startsWith("Hola, Ana Pérez:")
                .contains("sobre «Remera de algodón (http://localhost:5173/catalog/" + shirt.getId() + ")»:")
                .contains("Sí, desde 20 unidades.")
                .contains("respondé este email: tu mensaje le llega directamente a La Cacerola.")
                .contains("Ver la ficha de La Cacerola: http://localhost:5173/organizations/la-cacerola");
        assertThat(email.html())
                .contains(">Remera de algodón</a>")
                .contains("background:#fff6e0")
                .contains("respondé este email: tu mensaje le llega directamente a La Cacerola.");
        assertThat(get(inbox + "/" + id))
                .bodyJson()
                .extractingPath("$.replies")
                .asArray()
                .hasSize(1);
    }

    @Test
    void anInquiryAnsweredAnotherWayCanBeMarkedRespondedWithoutAnEmail() {
        String id = send(WITH_EMAIL);

        assertThat(changeStatus(id, "RESPONDED")).hasStatusOk().bodyJson().satisfies(json -> {
            assertThat(json).extractingPath("$.status").isEqualTo("RESPONDED");
            assertThat(json).extractingPath("$.replies").asArray().isEmpty();
        });
        assertThat(emails.sentTo("ana@example.com")).isEmpty();
    }

    @Test
    void whenTheProductWasDeletedItsNameIsNotLinked() {
        giveProfileEmail("ventas@lacacerola.coop");
        String id = send(WITH_EMAIL);
        products.deleteById(shirt.getId());

        assertThat(reply(id, "Ya no lo hacemos, pero tenemos otros.")).hasStatusOk();

        assertThat(emails.sentTo("ana@example.com").getFirst().body())
                .contains("sobre «Remera de algodón»:")
                .doesNotContain("/catalog/");
    }

    @Test
    void answeringAClosedInquiryReopensIt() {
        giveProfileEmail("ventas@lacacerola.coop");
        String id = send(WITH_EMAIL);
        changeStatus(id, "CLOSED");

        assertThat(reply(id, "Te escribimos de nuevo."))
                .bodyJson()
                .extractingPath("$.status")
                .isEqualTo("RESPONDED");
    }

    @Test
    void rejectsAnEmptyAnswerAndAMissingStatus() {
        giveProfileEmail("ventas@lacacerola.coop");
        String id = send(WITH_EMAIL);

        assertThat(reply(id, " ")).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(put(inbox + "/" + id + "/status", "{}")).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(emails.sentTo("ana@example.com")).isEmpty();
    }

    @Test
    void anotherAccountOrAnUnknownInquiryGetsNotFound() {
        String id = send(WITH_EMAIL);
        users.saveAndFlush(
                new UserAccount("other@test.local", passwordEncoder.encode("secret-password"), Role.COOPERATIVE));
        String other = accessToken("other@test.local");

        assertThat(exchange(mvc.get().uri(inbox), other)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(exchange(mvc.get().uri(inbox + "/" + id), other)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(get(inbox + "/" + UUID.randomUUID())).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(changeStatus(UUID.randomUUID().toString(), "CLOSED")).hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void theInboxNeedsACooperativeSession() {
        assertThat(mvc.get().uri(inbox).exchange()).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    private void giveProfileEmail(String email) {
        Organization saved = organizations.findById(organization.getId()).orElseThrow();
        saved.updateContact(new ProfileContact(
                null, Visibility.PUBLIC, null, Visibility.PUBLIC, email, Visibility.PUBLIC, null, null, null, null));
        organizations.saveAndFlush(saved);
    }

    private String send(String body) {
        try {
            String response = mvc.post()
                    .uri("/api/products/{id}/inquiries", shirt.getId())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body)
                    .exchange()
                    .getResponse()
                    .getContentAsString();
            return JsonPath.read(response, "$.id");
        } catch (java.io.UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }

    private MvcTestResult reply(String id, String message) {
        return mvc.post()
                .uri(inbox + "/" + id + "/replies")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"message\": \"" + message + "\"}")
                .exchange();
    }

    private MvcTestResult changeStatus(String id, String status) {
        return put(inbox + "/" + id + "/status", "{\"status\": \"" + status + "\"}");
    }

    private MvcTestResult put(String uri, String body) {
        return mvc.put()
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .exchange();
    }

    private MvcTestResult get(String uri) {
        return exchange(mvc.get().uri(uri), token);
    }

    private MvcTestResult exchange(MockMvcTester.MockMvcRequestBuilder request, String bearer) {
        return request.header(HttpHeaders.AUTHORIZATION, "Bearer " + bearer).exchange();
    }

    private String accessToken(String email) {
        try {
            return JsonPath.read(
                    mvc.post()
                            .uri("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"email\": \"" + email + "\", \"password\": \"secret-password\"}")
                            .exchange()
                            .getResponse()
                            .getContentAsString(),
                    "$.accessToken");
        } catch (java.io.UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
