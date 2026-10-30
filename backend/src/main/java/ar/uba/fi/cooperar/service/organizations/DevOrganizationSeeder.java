package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Cuit;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationProfile;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.organizations.Slugs;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import java.util.List;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Fictitious organizations so the public profile can be seen locally before profiles can be edited (#13). Only runs in
 * the dev profile: production data must come from public sources (#10).
 */
@Component
@Profile("dev")
public class DevOrganizationSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevOrganizationSeeder.class);
    private static final GeometryFactory WGS84 = new GeometryFactory(new PrecisionModel(), 4326);

    private record Sample(
            String name,
            String cuit,
            Sector sector,
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
                    Sector.TEXTILE,
                    new Address(Province.BUENOS_AIRES, "Avellaneda", "Avellaneda", "Av. Ejemplo 123", null),
                    "Cooperativa ficticia para desarrollo.",
                    "11 0000-0001",
                    "textil@example.org",
                    -34.617608,
                    -58.368443),
            new Sample(
                    "Cooperativa Ejemplo Alimentos",
                    "30000000023",
                    Sector.FOOD,
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
                    Sector.PRINTING,
                    new Address(Province.CORDOBA, "Capital", "Córdoba", "Calle Ficticia 789", null),
                    null,
                    null,
                    null,
                    null,
                    null));

    private final OrganizationRepository organizations;

    public DevOrganizationSeeder(OrganizationRepository organizations) {
        this.organizations = organizations;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        for (Sample sample : SAMPLES) {
            String slug = Slugs.fromName(sample.name());
            if (organizations.existsBySlug(slug)) {
                continue;
            }
            Organization organization = new Organization(
                    sample.name(),
                    slug,
                    OrganizationType.COOPERATIVE,
                    new Cuit(sample.cuit()),
                    sample.sector(),
                    sample.address());
            organization.updateProfile(new OrganizationProfile(
                    sample.description(),
                    sample.phone(),
                    sample.email(),
                    point(sample.latitude(), sample.longitude())));
            organizations.save(organization);
            log.info("Seeded the sample organization {}", organization.getId());
        }
    }

    private static Point point(Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            return null;
        }
        return WGS84.createPoint(new Coordinate(longitude, latitude));
    }
}
