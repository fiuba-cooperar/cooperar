package ar.uba.fi.cooperar.domain.organizations;

import jakarta.persistence.Embeddable;

/** The logo or the cover photo: how the image storage knows it, to delete it, and the address anyone opens it at. */
@Embeddable
public record ProfileImage(String storageRef, String url) {}
