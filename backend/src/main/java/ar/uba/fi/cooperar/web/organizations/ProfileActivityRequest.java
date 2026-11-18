package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.ProfileActivity;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.organizations.Visibility;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.Set;

public record ProfileActivityRequest(
        @NotEmpty Set<@NotNull Sector> sectors,

        @NotEmpty @Schema(description = "What the organization offers: labor, services or products")
        Set<@NotNull ActivityType> activityTypes,

        @Size(max = 1500) String description,

        @Min(1800)
        @Schema(
                description = "When it began working as a cooperative (for an ERT, when it was recovered);"
                        + " it cannot be in the future")
        Integer startYear,

        @Positive @Max(1_000_000) Integer workerCount,

        @NotNull Visibility workerCountVisibility) {

    ProfileActivity toActivity() {
        return new ProfileActivity(sectors, activityTypes, description, startYear, workerCount, workerCountVisibility);
    }
}
