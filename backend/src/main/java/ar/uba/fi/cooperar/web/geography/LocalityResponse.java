package ar.uba.fi.cooperar.web.geography;

import ar.uba.fi.cooperar.service.geography.LocalityOption;
import io.swagger.v3.oas.annotations.media.Schema;

public record LocalityResponse(
        String name,

        @Schema(description = "The departamento, partido or comuna it belongs to")
        String district) {

    static LocalityResponse from(LocalityOption locality) {
        return new LocalityResponse(locality.name(), locality.district());
    }
}
