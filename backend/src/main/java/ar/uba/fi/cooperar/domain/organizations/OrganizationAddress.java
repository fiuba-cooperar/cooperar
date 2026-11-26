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
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Point;

/**
 * An address of an {@link Organization}: its main one or another. A private street also hides the references, and
 * anyone else sees only the area of its point.
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

    /** How the organization calls it ("planta", "sucursal", "depósito"); optional and always public. */
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

    OrganizationAddress(Organization organization, AddressDetails details, int position) {
        this.id = UUID.randomUUID();
        this.organization = organization;
        update(details, position);
    }

    void update(AddressDetails details, int position) {
        this.type = details.type();
        this.name = details.name();
        this.address = details.address();
        this.streetVisibility = details.streetVisibility();
        this.location = details.location();
        this.position = position;
    }

    void locate(Point point) {
        this.location = point;
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

    /**
     * The point anyone may see: the exact one if the street is public, otherwise rounded to about a kilometer, so the
     * public map shows the area without giving the address away.
     */
    public Point getPublicLocation() {
        return publicPoint(location, streetVisibility);
    }

    /** {@code point} as anyone may see it: exact if the street is public, otherwise rounded to its area. */
    public static Point publicPoint(Point point, Visibility streetVisibility) {
        if (point == null || streetVisibility == Visibility.PUBLIC) {
            return point;
        }
        Point area =
                point.getFactory().createPoint(new Coordinate(roundToArea(point.getX()), roundToArea(point.getY())));
        area.setSRID(point.getSRID());
        return area;
    }

    private static double roundToArea(double degrees) {
        return Math.round(degrees * 100) / 100.0;
    }

    public int getPosition() {
        return position;
    }
}
