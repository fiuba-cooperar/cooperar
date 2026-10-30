package ar.uba.fi.cooperar.domain.organizations;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "organizations")
public class Organization {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

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

    protected Organization() {}

    public Organization(String name, OrganizationType type, Cuit cuit, Sector sector, Address address) {
        this.id = UUID.randomUUID();
        this.name = name;
        this.type = type;
        this.cuit = cuit.digits();
        this.sector = sector;
        this.address = address;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
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
}
