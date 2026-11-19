package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.service.organizations.OrganizationSearchResult;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;

/** One page of the public directory, with the count of each filter value. */
public record OrganizationSearchResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<OrganizationSummaryResponse> items,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Organizations found, on every page")
        int total,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int page,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int size,

        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description = "Every type, with how many would be found with it and the other filters as they are")
        List<TypeCount> types,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Every sector, counted the same way")
        List<SectorCount> sectors,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Every activity type, counted the same way")
        List<ActivityTypeCount> activityTypes) {

    public record TypeCount(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            OrganizationType type,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            int count) {}

    public record SectorCount(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            Sector sector,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            int count) {}

    public record ActivityTypeCount(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            ActivityType activityType,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            int count) {}

    static OrganizationSearchResponse from(OrganizationSearchResult result) {
        return new OrganizationSearchResponse(
                result.items().stream().map(OrganizationSummaryResponse::from).toList(),
                result.total(),
                result.page(),
                result.size(),
                counts(result.typeCounts(), TypeCount::new),
                counts(result.sectorCounts(), SectorCount::new),
                counts(result.activityTypeCounts(), ActivityTypeCount::new));
    }

    private static <E, C> List<C> counts(Map<E, Integer> counts, BiFunction<E, Integer, C> count) {
        return counts.entrySet().stream()
                .map(entry -> count.apply(entry.getKey(), entry.getValue()))
                .toList();
    }
}
