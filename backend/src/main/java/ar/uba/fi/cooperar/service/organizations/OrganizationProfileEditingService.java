package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationProfile;
import ar.uba.fi.cooperar.repository.organizations.OrganizationPhotoRepository;
import java.util.UUID;
import org.locationtech.jts.geom.Point;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizationProfileEditingService {

    private final OrganizationAccess access;
    private final OrganizationPhotoRepository photos;
    private final Geocoder geocoder;

    public OrganizationProfileEditingService(
            OrganizationAccess access, OrganizationPhotoRepository photos, Geocoder geocoder) {
        this.access = access;
        this.photos = photos;
        this.geocoder = geocoder;
    }

    @Transactional(readOnly = true)
    public OrganizationWithPhotos get(UUID organizationId, UUID accountId) {
        Organization organization = access.requireEditable(organizationId, accountId);
        return new OrganizationWithPhotos(organization, photos.findByOrganizationIdOrderBySortOrder(organizationId));
    }

    /** The point on the map follows the address: it is looked up again when the address changes or has none yet. */
    @Transactional
    public OrganizationWithPhotos update(UUID organizationId, UUID accountId, ProfileUpdate update) {
        Organization organization = access.requireEditable(organizationId, accountId);
        Point location = organization.getLocation();
        if (location == null || !organization.getAddress().samePlaceAs(update.address())) {
            location = geocoder.locate(update.address()).orElse(null);
        }
        organization.edit(
                update.sector(),
                update.address(),
                new OrganizationProfile(update.description(), update.phone(), update.email(), location));
        return new OrganizationWithPhotos(organization, photos.findByOrganizationIdOrderBySortOrder(organizationId));
    }
}
