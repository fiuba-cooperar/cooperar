package ar.uba.fi.cooperar.service.geography;

/** A locality to suggest, with the name of its district, so picking it can fill the district too. */
public record LocalityOption(String name, String district) {}
