package ar.uba.fi.cooperar.domain.organizations;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;
import org.locationtech.jts.geom.Point;

@Entity
@Table(name = "cooperatives")
public class Cooperative {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    /** Fixed at creation: renaming the cooperative must not break links that were already shared. */
    @Column(nullable = false, unique = true, updatable = false)
    private String slug;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "industry_id")
    private Industry industry;

    private String description;

    private String locality;

    private String province;

    private String address;

    private String phone;

    private String email;

    private Point location;

    protected Cooperative() {}

    public Cooperative(String name, String slug) {
        this.id = UUID.randomUUID();
        this.name = name;
        this.slug = slug;
    }

    public void updateProfile(CooperativeProfile profile) {
        this.industry = profile.industry();
        this.description = profile.description();
        this.locality = profile.locality();
        this.province = profile.province();
        this.address = profile.address();
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

    public Industry getIndustry() {
        return industry;
    }

    public String getDescription() {
        return description;
    }

    public String getLocality() {
        return locality;
    }

    public String getProvince() {
        return province;
    }

    public String getAddress() {
        return address;
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
