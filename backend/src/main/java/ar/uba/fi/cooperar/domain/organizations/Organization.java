package ar.uba.fi.cooperar.domain.organizations;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import org.locationtech.jts.geom.Point;

@Entity
@Table(name = "organizations")
public class Organization {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    /** Fixed at creation: renaming the organization must not break links that were already shared. */
    @Column(nullable = false, unique = true, updatable = false)
    private String slug;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrganizationType type;

    @Column(nullable = false)
    private String cuit;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Sector sector;

    @Embedded
    private Address address;

    private String description;

    private String phone;

    private String email;

    private Point location;

    protected Organization() {}

    public Organization(String name, String slug, OrganizationType type, Cuit cuit, Sector sector, Address address) {
        this.id = UUID.randomUUID();
        this.name = name;
        this.slug = slug;
        this.type = type;
        this.cuit = cuit.digits();
        this.sector = sector;
        this.address = address;
    }

    public void updateProfile(OrganizationProfile profile) {
        this.description = profile.description();
        this.phone = profile.phone();
        this.email = profile.email();
        this.location = profile.location();
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getSlug() {
        return slug;
    }

    public OrganizationType getType() {
        return type;
    }

    public Cuit getCuit() {
        return new Cuit(cuit);
    }

    public Sector getSector() {
        return sector;
    }

    public Address getAddress() {
        return address;
    }

    public String getDescription() {
        return description;
    }

    public String getPhone() {
        return phone;
    }

    public String getEmail() {
        return email;
    }

    public Point getLocation() {
        return location;
    }
}
