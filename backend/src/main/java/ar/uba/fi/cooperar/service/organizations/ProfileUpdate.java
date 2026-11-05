package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Sector;

/** What an organization changes in its profile. The optional fields come out as null when left blank. */
public record ProfileUpdate(Sector sector, Address address, String description, String phone, String email) {

    public ProfileUpdate {
        description = blankToNull(description);
        phone = blankToNull(phone);
        email = blankToNull(email);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
