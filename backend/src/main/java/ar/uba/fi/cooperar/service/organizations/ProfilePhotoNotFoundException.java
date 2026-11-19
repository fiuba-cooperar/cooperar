package ar.uba.fi.cooperar.service.organizations;

public class ProfilePhotoNotFoundException extends RuntimeException {

    public ProfilePhotoNotFoundException() {
        super("Photo not found");
    }
}
