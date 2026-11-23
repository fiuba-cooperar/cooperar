package ar.uba.fi.cooperar.domain.geography;

import ar.uba.fi.cooperar.domain.organizations.Province;

/** A second-level division of a province: departamento, partido or comuna. */
public record District(String id, Province province, String name) {}
