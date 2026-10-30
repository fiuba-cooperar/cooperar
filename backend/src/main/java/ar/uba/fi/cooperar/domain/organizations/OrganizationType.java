package ar.uba.fi.cooperar.domain.organizations;

/**
 * Whether an organization is a worker cooperative, a worker-recovered company (ERT), or both: many ERTs are organized
 * as cooperatives, but not every cooperative is an ERT.
 */
public enum OrganizationType {
    COOPERATIVE,
    ERT,
    COOPERATIVE_AND_ERT
}
