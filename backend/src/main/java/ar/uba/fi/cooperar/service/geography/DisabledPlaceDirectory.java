package ar.uba.fi.cooperar.service.geography;

import ar.uba.fi.cooperar.domain.geography.Places;
import ar.uba.fi.cooperar.domain.organizations.Province;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Lists nothing: the address fields offer no suggestions and are typed by hand. */
@Component
@ConditionalOnProperty(name = "cooperar.geography.provider", havingValue = "none", matchIfMissing = true)
public class DisabledPlaceDirectory implements PlaceDirectory {

    @Override
    public Places places() {
        return Places.NONE;
    }

    @Override
    public List<String> streets(Province province, String districtId, String query, int limit) {
        return List.of();
    }
}
