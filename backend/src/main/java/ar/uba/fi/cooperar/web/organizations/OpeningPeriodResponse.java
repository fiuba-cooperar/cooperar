package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.OpeningDay;
import ar.uba.fi.cooperar.domain.organizations.OpeningPeriod;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalTime;

public record OpeningPeriodResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) OpeningDay day,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, type = "string", example = "08:00")
        @JsonFormat(pattern = "HH:mm")
        LocalTime opensAt,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, type = "string", example = "17:00")
        @JsonFormat(pattern = "HH:mm")
        LocalTime closesAt) {

    static OpeningPeriodResponse from(OpeningPeriod period) {
        return new OpeningPeriodResponse(period.day(), period.opensAt(), period.closesAt());
    }
}
