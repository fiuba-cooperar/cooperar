package ar.uba.fi.cooperar.web.geography;

import ar.uba.fi.cooperar.domain.geography.District;

public record DistrictResponse(String name) {

    static DistrictResponse from(District district) {
        return new DistrictResponse(district.name());
    }
}
