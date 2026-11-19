package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.OrganizationSearchCriteria;
import ar.uba.fi.cooperar.domain.organizations.OrganizationSearchSort;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.Set;

/** The query string of the public directory. A filter repeats its parameter to take more than one value. */
public record OrganizationSearchRequest(
        @Schema(description = "Words to look for in the name, what it does, where it is and its description")
        @Size(max = 200)
        String q,

        @Schema(description = "Any of these types") Set<OrganizationType> type,
        @Schema(description = "Any of these sectors") Set<Sector> sector,
        @Schema(description = "Any of these activity types") Set<ActivityType> activityType,
        Province province,

        @Schema(description = "RELEVANCE by default") OrganizationSearchSort sort,

        @Schema(description = "From 0; 0 by default") @Min(0)
        Integer page,

        @Schema(description = "20 by default") @Min(1) @Max(MAX_SIZE)
        Integer size) {

    static final int MAX_SIZE = 50;
    private static final int DEFAULT_SIZE = 20;

    OrganizationSearchCriteria criteria() {
        return new OrganizationSearchCriteria(q, type, sector, activityType, province);
    }

    OrganizationSearchSort sortOrDefault() {
        return sort == null ? OrganizationSearchSort.RELEVANCE : sort;
    }

    int pageOrDefault() {
        return page == null ? 0 : page;
    }

    int sizeOrDefault() {
        return size == null ? DEFAULT_SIZE : size;
    }
}
