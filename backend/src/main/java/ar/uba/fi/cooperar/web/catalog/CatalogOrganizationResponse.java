package ar.uba.fi.cooperar.web.catalog;

import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.ResponseTime;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Set;

/**
 * The organization that offers a product in the public catalog. Only fields that are always public, and only the zone
 * (never the street), so the catalog cannot show what the profile hides (privacy rule 2).
 */
public record CatalogOrganizationResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Path segment of its public profile")
        String slug,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) OrganizationType type,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Set<Sector> sectors,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Province province,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String district,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String locality,
        ResponseTime responseTime,

        @Schema(description = "Missing until the organization uploads one")
        String logoUrl) {

    static CatalogOrganizationResponse from(Organization organization) {
        Address address = organization.getAddress();
        return new CatalogOrganizationResponse(
                organization.getSlug(),
                organization.getName(),
                organization.getType(),
                organization.getSectors(),
                address.province(),
                address.district(),
                address.locality(),
                organization.getResponseTime(),
                organization.getLogo() == null ? null : organization.getLogo().url());
    }
}
