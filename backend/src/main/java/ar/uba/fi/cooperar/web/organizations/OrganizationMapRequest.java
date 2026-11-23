package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.OrganizationSearchCriteria;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Set;

/** The filters of the public map, as in the directory. A filter repeats its parameter to take more than one value. */
public record OrganizationMapRequest(
        @Schema(description = "Any of these types") Set<OrganizationType> type,
        @Schema(description = "Any of these sectors") Set<Sector> sector,
        @Schema(description = "Any of these activity types") Set<ActivityType> activityType,
        Province province) {

    OrganizationSearchCriteria criteria() {
        return new OrganizationSearchCriteria(null, type, sector, activityType, province);
    }
}
