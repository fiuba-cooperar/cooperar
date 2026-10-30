package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.Cooperative;
import ar.uba.fi.cooperar.domain.organizations.CooperativeProfile;
import ar.uba.fi.cooperar.domain.organizations.Industry;
import ar.uba.fi.cooperar.domain.organizations.Slugs;
import ar.uba.fi.cooperar.repository.organizations.CooperativeRepository;
import ar.uba.fi.cooperar.repository.organizations.IndustryRepository;
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

@Component
@Profile("dev")
public class DevCooperativeSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(
        DevCooperativeSeeder.class
    );
    private static final GeometryFactory WGS84 = new GeometryFactory(
        new PrecisionModel(),
        4326
    );

    private record Sample(
        String name,
        String industry,
        String description,
        String locality,
        String province,
        String address,
        String phone,
        String email,
        Double latitude,
        Double longitude
    ) {}

    private static final List<Sample> SAMPLES = List.of(
        new Sample(
            "Cooperativa Ejemplo Textil",
            "Textil",
            "Cooperativa ficticia para desarrollo.",
            "Avellaneda",
            "Buenos Aires",
            "Av. Ejemplo 123",
            "11 0000-0001",
            "textil@example.org",
            -34.617608,
            -58.368443
        ),
        new Sample(
            "Cooperativa Ejemplo Alimentos",
            "Alimentos",
            "Cooperativa ficticia para desarrollo.",
            "Ciudad Autónoma de Buenos Aires",
            "Buenos Aires",
            "Calle Ficticia 456",
            "341 000-0002",
            "alimentos@example.org",
            -34.617608,
            -58.368443
        ),
        // Deliberately incomplete, to see how a profile with missing data looks.
        new Sample(
            "Cooperativa Ejemplo Gráfica",
            "Gráfica",
            null,
            "Córdoba",
            "Córdoba",
            null,
            null,
            null,
            null,
            null
        )
    );

    private final CooperativeRepository cooperatives;
    private final IndustryRepository industries;

    public DevCooperativeSeeder(
        CooperativeRepository cooperatives,
        IndustryRepository industries
    ) {
        this.cooperatives = cooperatives;
        this.industries = industries;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        for (Sample sample : SAMPLES) {
            String slug = Slugs.fromName(sample.name());
            if (cooperatives.existsBySlug(slug)) {
                continue;
            }
            Cooperative cooperative = new Cooperative(sample.name(), slug);
            Industry industry = industries
                .findByName(sample.industry())
                .orElse(null);
            cooperative.updateProfile(
                new CooperativeProfile(
                    industry,
                    sample.description(),
                    sample.locality(),
                    sample.province(),
                    sample.address(),
                    sample.phone(),
                    sample.email(),
                    point(sample.latitude(), sample.longitude())
                )
            );
            cooperatives.save(cooperative);
            log.info("Seeded the sample cooperative {}", cooperative.getId());
        }
    }

    private static Point point(Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            return null;
        }
        return WGS84.createPoint(new Coordinate(longitude, latitude));
    }
}
