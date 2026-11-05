package ar.uba.fi.cooperar;

import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.service.organizations.Geocoder;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/** Answers with a fixed point instead of calling a geocoding service, and remembers what it was asked. */
public class FakeGeocoder implements Geocoder {

    public static final Point ROSARIO = point(-32.95, -60.64);

    private final List<Address> asked = new CopyOnWriteArrayList<>();
    private volatile Optional<Point> answer = Optional.of(ROSARIO);

    public static Point point(double latitude, double longitude) {
        return new GeometryFactory(new PrecisionModel(), 4326).createPoint(new Coordinate(longitude, latitude));
    }

    @Override
    public Optional<Point> locate(Address address) {
        asked.add(address);
        return answer;
    }

    public void answer(Optional<Point> answer) {
        this.answer = answer;
    }

    public List<Address> asked() {
        return new ArrayList<>(asked);
    }

    public void reset() {
        asked.clear();
        answer = Optional.of(ROSARIO);
    }

    @TestConfiguration(proxyBeanMethods = false)
    public static class Config {

        @Bean
        @Primary
        FakeGeocoder fakeGeocoder() {
            return new FakeGeocoder();
        }
    }
}
