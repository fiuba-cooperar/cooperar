package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityProfile;
import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Set;

/** The activity section of the profile. */
public record ProfileActivityRequest(
        @NotEmpty Set<@NotNull Sector> sectors,

        @NotEmpty @Schema(description = "What the organization offers: labor, services or products")
        Set<@NotNull ActivityType> activityTypes,

        @Size(max = 1500) String description,

        @Min(1800) @Max(2100) @Schema(description = "For an ERT, the year the workers recovered it")
        Integer foundingYear,

        @Min(1) @Max(100_000) Integer workerCount,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean workerCountPublic) {

    ActivityProfile toActivity() {
        return new ActivityProfile(sectors, activityTypes, description, foundingYear, workerCount, workerCountPublic);
    }
}
