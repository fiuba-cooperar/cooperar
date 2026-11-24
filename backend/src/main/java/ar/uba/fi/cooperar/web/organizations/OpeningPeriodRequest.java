package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.OpeningDay;
import ar.uba.fi.cooperar.domain.organizations.OpeningPeriod;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.LocalTime;

/** A range of hours of a day, as "HH:mm" in the local time of the organization. */
public record OpeningPeriodRequest(
        @NotNull OpeningDay day,

        @NotNull
        @JsonFormat(pattern = "HH:mm")
        @Schema(type = "string", example = "08:00", pattern = "^([01]\\d|2[0-3]):[0-5]\\d$")
        LocalTime opensAt,

        @NotNull
        @JsonFormat(pattern = "HH:mm")
        @Schema(type = "string", example = "17:00", pattern = "^([01]\\d|2[0-3]):[0-5]\\d$")
        LocalTime closesAt) {

    OpeningPeriod toPeriod() {
        return new OpeningPeriod(day, opensAt, closesAt);
    }
}
