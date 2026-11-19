package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityProfile;
import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.ContactProfile;
import ar.uba.fi.cooperar.domain.organizations.GeoPoints;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationDetails;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.ResponseTime;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.organizations.Slugs;
import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.locationtech.jts.geom.Point;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Fictitious organizations, created as if their requests had been approved, so the public profile can be seen locally
 * with sample data in every section. Only runs in the dev profile: production data must come from public sources (#10).
 */
@Component
@Profile("dev")
public class DevOrganizationSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevOrganizationSeeder.class);
    private static final String SAMPLE_ACCOUNT_EMAIL = "ejemplos@example.org";

    private record Sample(
            String name,
            String cuit,
            Set<Sector> sectors,
            Set<ActivityType> activityTypes,
            Address address,
            String description,
            String phone,
            String email,
            Double latitude,
            Double longitude) {}

    private static final List<Sample> SAMPLES = List.of(
            new Sample(
                    "Cooperativa Ejemplo Textil",
                    "30000000015",
                    Set.of(Sector.TEXTILE),
                    Set.of(ActivityType.PRODUCT, ActivityType.WORK),
                    new Address(Province.BUENOS_AIRES, "Avellaneda", "Avellaneda", "Av. Ejemplo 123", null),
                    "Cooperativa ficticia para desarrollo.",
                    "11 0000-0001",
                    "textil@example.org",
                    -34.617608,
                    -58.368443),
            new Sample(
                    "Cooperativa Ejemplo Alimentos",
                    "30000000023",
                    Set.of(Sector.FOOD, Sector.SERVICES),
                    Set.of(ActivityType.PRODUCT, ActivityType.SERVICE),
                    new Address(
                            Province.CITY_OF_BUENOS_AIRES,
                            "Comuna 1",
                            "Ciudad Autónoma de Buenos Aires",
                            "Calle Ficticia 456",
                            null),
                    "Cooperativa ficticia para desarrollo.",
                    "341 000-0002",
                    "alimentos@example.org",
                    -34.617608,
                    -58.368443),
            // Deliberately incomplete, to see how a profile with missing data looks.
            new Sample(
                    "Cooperativa Ejemplo Gráfica",
                    "30000000031",
                    Set.of(Sector.PRINTING),
                    Set.of(ActivityType.SERVICE),
                    new Address(Province.CORDOBA, "Capital", "Córdoba", "Calle Ficticia 789", null),
                    null,
                    null,
                    null,
                    null,
                    null));

    private final OrganizationRepository organizations;
    private final UserAccountRepository users;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    public DevOrganizationSeeder(
            OrganizationRepository organizations,
            UserAccountRepository users,
            PasswordEncoder passwordEncoder,
            Clock clock) {
        this.organizations = organizations;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Instant now = clock.instant();
        UserAccount account = users.findByEmail(SAMPLE_ACCOUNT_EMAIL).orElseGet(() -> createSampleAccount(now));
        for (Sample sample : SAMPLES) {
            String slug = Slugs.fromName(sample.name());
            if (organizations.existsBySlug(slug)) {
                continue;
            }
            Organization organization = new Organization(
                    slug,
                    new OrganizationDetails(
                            sample.name(),
                            sample.name(),
                            OrganizationType.COOPERATIVE,
                            sample.cuit(),
                            sample.sectors(),
                            sample.activityTypes(),
                            sample.address(),
                            null),
                    account,
                    now);
            organization.updateIdentification(sample.name(), sample.name(), true);
            organization.updateActivity(new ActivityProfile(
                    sample.sectors(), sample.activityTypes(), sample.description(), null, null, false));
            Point location = point(sample.latitude(), sample.longitude());
            // Every sample shows its street except the incomplete one, to see the map showing only the area.
            organization.updateLocation(sample.address(), location != null, location);
            organization.updateContact(new ContactProfile(
                    sample.phone(),
                    true,
                    sample.phone(),
                    false,
                    sample.email(),
                    true,
                    null,
                    null,
                    sample.phone() == null ? null : "Lunes a viernes de 8 a 17",
                    sample.phone() == null ? null : ResponseTime.TWO_DAYS));
            account.getOrganizations().add(organizations.save(organization));
            log.info("Seeded the sample organization {}", organization.getId());
        }
    }

    /** Nobody needs to sign in with it, so its password is random. */
    private UserAccount createSampleAccount(Instant now) {
        UserAccount account = new UserAccount(
                SAMPLE_ACCOUNT_EMAIL, passwordEncoder.encode(UUID.randomUUID().toString()), Role.COOPERATIVE);
        account.verifyEmail(now);
        return users.saveAndFlush(account);
    }

    private static Point point(Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            return null;
        }
        return GeoPoints.of(latitude, longitude);
    }
}
