package ar.uba.fi.cooperar.web.inquiries;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.IntegrationTest;
import ar.uba.fi.cooperar.domain.catalog.Product;
import ar.uba.fi.cooperar.domain.catalog.ProductCategory;
import ar.uba.fi.cooperar.domain.catalog.ProductDetails;
import ar.uba.fi.cooperar.domain.catalog.ProductType;
import ar.uba.fi.cooperar.domain.catalog.SaleMode;
import ar.uba.fi.cooperar.domain.inquiries.InquiryStatus;
import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationDetails;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.catalog.ProductCategoryRepository;
import ar.uba.fi.cooperar.repository.catalog.ProductRepository;
import ar.uba.fi.cooperar.repository.inquiries.InquiryRepository;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import com.jayway.jsonpath.JsonPath;
import java.time.Instant;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

@IntegrationTest
@Transactional
class InquiryIntegrationTest {

    private static final String INQUIRY = """
            {"senderName": "Ana Pérez", "senderEmail": "ana@example.com", "senderPhone": "(011) 4444-5555",
             "quantity": 50,
             "message": "¿Hacen remeras con logo?"}
            """;

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private OrganizationRepository organizations;

    @Autowired
    private ProductCategoryRepository categories;

    @Autowired
    private ProductRepository products;

    @Autowired
    private UserAccountRepository users;

    @Autowired
    private InquiryRepository inquiries;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Organization organization;
    private ProductCategory category;
    private Product shirt;

    @BeforeEach
    void createPublishedProduct() {
        category = categories.save(new ProductCategory("Indumentaria de prueba", Instant.now()));
        UserAccount account = users.save(
                new UserAccount("coop@test.local", passwordEncoder.encode("secret-password"), Role.COOPERATIVE));
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
        shirt = product("Remera de algodón", true);
    }

    @Test
    void aVisitorSendsAnInquiryWithoutAnAccountAndItIsSavedForTheOrganization() {
        MvcTestResult result = send(shirt, "10.0.0.1", INQUIRY);

        assertThat(result)
                .hasStatus(HttpStatus.CREATED)
                .bodyJson()
                .extractingPath("$.sentAt")
                .isNotNull();
        assertThat(inquiries.findAll()).singleElement().satisfies(inquiry -> {
            assertThat(inquiry.getOrganizationId()).isEqualTo(organization.getId());
            assertThat(inquiry.getProductId()).isEqualTo(shirt.getId());
            assertThat(inquiry.getProductName()).isEqualTo("Remera de algodón");
            assertThat(inquiry.getSenderName()).isEqualTo("Ana Pérez");
            assertThat(inquiry.getSenderEmail()).isEqualTo("ana@example.com");
            assertThat(inquiry.getSenderPhone()).isEqualTo("(011) 4444-5555");
            assertThat(inquiry.getQuantity()).isEqualTo(50);
            assertThat(inquiry.getMessage()).isEqualTo("¿Hacen remeras con logo?");
            assertThat(inquiry.getStatus()).isEqualTo(InquiryStatus.NEW);
        });
    }

    @Test
    void theReceiptDoesNotEchoWhatTheVisitorWrote() throws Exception {
        assertThat(send(shirt, "10.0.0.2", INQUIRY).getResponse().getContentAsString())
                .doesNotContain("ana@example.com")
                .doesNotContain("Ana Pérez");
    }

    @Test
    void thePhoneAndTheQuantityAreOptional() {
        assertThat(send(shirt, "10.0.0.3", """
                {"senderName": "Ana", "senderEmail": "ana@example.com", "message": "Precio por mayor?"}
                """)).hasStatus(HttpStatus.CREATED);

        assertThat(inquiries.findAll()).singleElement().satisfies(inquiry -> {
            assertThat(inquiry.getSenderPhone()).isNull();
            assertThat(inquiry.getQuantity()).isNull();
        });
    }

    @Test
    void rejectsAnInquiryWithMissingOrInvalidData() {
        assertThat(send(shirt, "10.0.0.4", """
                {"senderName": " ", "senderEmail": "ana@example.com", "message": "Hola"}
                """)).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(send(shirt, "10.0.0.4", """
                {"senderName": "Ana", "message": "Hola"}
                """)).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(send(shirt, "10.0.0.4", """
                {"senderName": "Ana", "senderEmail": "ana@example.com", "message": ""}
                """)).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(send(shirt, "10.0.0.4", """
                {"senderName": "Ana", "senderEmail": "ana@example.com", "quantity": 0, "message": "Hola"}
                """)).hasStatus(HttpStatus.BAD_REQUEST);

        assertThat(send(shirt, "10.0.0.4", """
                {"senderName": "Ana", "senderEmail": "no-es-un-email", "message": "Hola"}
                """)).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(send(shirt, "10.0.0.4", """
                {"senderName": "Ana", "senderEmail": " ", "senderPhone": "", "message": "Hola"}
                """)).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(send(shirt, "10.0.0.4", """
                {"senderName": "Ana", "senderPhone": "(011) 5555-5555", "message": "Hola"}
                """)).hasStatus(HttpStatus.BAD_REQUEST);

        assertThat(inquiries.findAll()).isEmpty();
    }

    @Test
    void anUnpublishedOrMissingProductCannotBeAskedAbout() {
        Product hidden = product("Buzo", false);

        assertThat(send(hidden, "10.0.0.5", INQUIRY)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(mvc.post()
                        .uri("/api/products/{id}/inquiries", java.util.UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(INQUIRY)
                        .exchange())
                .hasStatus(HttpStatus.NOT_FOUND);
        assertThat(inquiries.findAll()).isEmpty();
    }

    @Test
    void blocksMassSendingFromTheSameAddressButNotFromOthers() {
        for (int i = 0; i < 20; i++) {
            assertThat(send(shirt, "10.0.0.6", INQUIRY)).hasStatus(HttpStatus.CREATED);
        }

        MvcTestResult blocked = send(shirt, "10.0.0.6", INQUIRY);

        assertThat(blocked).hasStatus(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(blocked.getResponse().getHeader("Retry-After")).isNotNull();
        assertThat(inquiries.findAll()).hasSize(20);
        assertThat(send(shirt, "10.0.0.7", INQUIRY)).hasStatus(HttpStatus.CREATED);
    }

    @Test
    void anAccountThatManagesTheOrganizationCannotAskAboutItsOwnProduct() throws Exception {
        String token = JsonPath.read(
                mvc.post()
                        .uri("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\": \"coop@test.local\", \"password\": \"secret-password\"}")
                        .exchange()
                        .getResponse()
                        .getContentAsString(),
                "$.accessToken");

        assertThat(mvc.post()
                        .uri("/api/products/{id}/inquiries", shirt.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(INQUIRY)
                        .exchange())
                .hasStatus(HttpStatus.CONFLICT);
        assertThat(inquiries.findAll()).isEmpty();
    }

    @Test
    void anotherSignedInAccountCanAskAboutTheProduct() throws Exception {
        users.saveAndFlush(
                new UserAccount("other@test.local", passwordEncoder.encode("secret-password"), Role.COOPERATIVE));
        String token = JsonPath.read(
                mvc.post()
                        .uri("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\": \"other@test.local\", \"password\": \"secret-password\"}")
                        .exchange()
                        .getResponse()
                        .getContentAsString(),
                "$.accessToken");

        assertThat(mvc.post()
                        .uri("/api/products/{id}/inquiries", shirt.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(INQUIRY)
                        .exchange())
                .hasStatus(HttpStatus.CREATED);
    }

    private Product product(String name, boolean published) {
        Product product = new Product(
                organization,
                new ProductDetails(name, ProductType.PRODUCT, category, Set.of(SaleMode.RETAIL), "Descripción", null),
                Instant.now());
        if (published) {
            product.publish(Instant.now());
        }
        return products.save(product);
    }

    private MvcTestResult send(Product product, String remoteAddress, String body) {
        return mvc.post()
                .uri("/api/products/{id}/inquiries", product.getId())
                .with(request -> {
                    request.setRemoteAddr(remoteAddress);
                    return request;
                })
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .exchange();
    }
}
