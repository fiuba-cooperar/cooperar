package ar.uba.fi.cooperar.domain.organizations;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;
import org.locationtech.jts.geom.Point;

/**
 * An address of an {@link Organization} besides its main one, with the same privacy rules: a private street also
 * hides the references, and anyone else sees only the area of its point.
 */
@Entity
@Table(name = "organization_addresses")
public class OrganizationAddress {

    @Id
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false, updatable = false)
    private Organization organization;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AddressType type;

    /** How the organization calls it ("sucursal", "depósito"); optional and always public. */
    private String name;

    @Embedded
    private Address address;

    @Enumerated(EnumType.STRING)
    @Column(name = "street_visibility", nullable = false)
    private Visibility streetVisibility;

    private Point location;

    @Column(nullable = false)
    private int position;

    protected OrganizationAddress() {}

    OrganizationAddress(Organization organization, OtherAddress details, int position) {
        this.id = UUID.randomUUID();
        this.organization = organization;
        update(details, position);
    }

    void update(OtherAddress details, int position) {
        this.type = details.type();
        this.name = details.name();
        this.address = details.address();
        this.streetVisibility = details.streetVisibility();
        this.location = details.location();
        this.position = position;
    }

    public UUID getId() {
        return id;
    }

    public AddressType getType() {
        return type;
    }

    public String getName() {
        return name;
    }

    public Address getAddress() {
        return address;
    }

    public Visibility getStreetVisibility() {
        return streetVisibility;
    }

    public Point getLocation() {
        return location;
    }

    /** The point anyone may see; see {@link Organization#publicPoint}. */
    public Point getPublicLocation() {
        return Organization.publicPoint(location, streetVisibility);
    }

    public int getPosition() {
        return position;
    }
}
