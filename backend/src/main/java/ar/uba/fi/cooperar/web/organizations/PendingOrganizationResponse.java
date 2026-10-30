package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;

/** What the observatory needs to review a new organization, including the account that registered it. */
public record PendingOrganizationResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) OrganizationType type,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The 11 digits, without dashes")
        String cuit,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Sector sector,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) AddressResponse address,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant registeredAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) RegistrantResponse registeredBy) {

    public record AddressResponse(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            Province province,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String district,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String locality,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String street,

            String additionalReferences) {

        static AddressResponse from(Address address) {
            return new AddressResponse(
                    address.province(),
                    address.district(),
                    address.locality(),
                    address.street(),
                    address.additionalReferences());
        }
    }

    public record RegistrantResponse(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String firstName,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String lastName,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String email) {

        static RegistrantResponse from(UserAccount account) {
            return new RegistrantResponse(account.getFirstName(), account.getLastName(), account.getEmail());
        }
    }

    static PendingOrganizationResponse from(Organization organization) {
        return new PendingOrganizationResponse(
                organization.getId(),
                organization.getName(),
                organization.getType(),
                organization.getCuit().digits(),
                organization.getSector(),
                AddressResponse.from(organization.getAddress()),
                organization.getCreatedAt(),
                RegistrantResponse.from(organization.getRegisteredBy()));
    }
}
