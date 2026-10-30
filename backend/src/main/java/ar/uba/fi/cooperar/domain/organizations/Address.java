package ar.uba.fi.cooperar.domain.organizations;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

/**
 * Postal address typed by hand, except for the province. The district is the second-level division (departamento,
 * partido or comuna) and the locality may be a neighborhood. Geocoding arrives with #13.
 */
@Embeddable
public record Address(
        @Enumerated(EnumType.STRING) @Column(nullable = false)
        Province province,

        @Column(nullable = false) String district,
        @Column(nullable = false) String locality,
        @Column(nullable = false) String street,
        @Column(name = "additional_references") String additionalReferences) {

    public Address {
        district = district.trim();
        locality = locality.trim();
        street = street.trim();
        additionalReferences =
                additionalReferences == null || additionalReferences.isBlank() ? null : additionalReferences.trim();
    }
}
