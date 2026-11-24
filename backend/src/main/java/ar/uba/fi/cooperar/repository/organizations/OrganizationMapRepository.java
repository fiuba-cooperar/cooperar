package ar.uba.fi.cooperar.repository.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.AddressType;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.organizations.Visibility;
import java.util.List;
import java.util.UUID;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * The addresses on the public map, in one query that reads only the columns the map needs: no private field and no
 * photos (privacy rule 10).
 */
@Repository
public class OrganizationMapRepository {

    private static final GeometryFactory WGS84 = new GeometryFactory(new PrecisionModel(), 4326);

    private final JdbcClient jdbcClient;

    public OrganizationMapRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    /** Every address with a point, by the name of its organization and then in the organization's order. */
    public List<LocatedAddress> findLocated() {
        return jdbcClient
                .sql("""
                        SELECT o.id, o.slug, o.name, o.type, o.logo_url,
                               a.type AS address_type, a.name AS address_name, a.province, a.district, a.locality, a.street,
                               a.street_visibility, ST_X(a.location) AS longitude, ST_Y(a.location) AS latitude,
                               array(SELECT s.sector FROM organization_sectors s
                                     WHERE s.organization_id = o.id) AS sectors,
                               array(SELECT t.activity_type FROM organization_activity_types t
                                     WHERE t.organization_id = o.id) AS activity_types
                        FROM organizations o
                            JOIN organization_addresses a ON a.organization_id = o.id
                        WHERE a.location IS NOT NULL
                        ORDER BY lower(o.name), o.id, a.position
                        """)
                .query((row, number) -> new LocatedAddress(
                        row.getObject("id", UUID.class),
                        row.getString("slug"),
                        row.getString("name"),
                        OrganizationType.valueOf(row.getString("type")),
                        SqlArrays.enums(row, "sectors", Sector.class),
                        SqlArrays.enums(row, "activity_types", ActivityType.class),
                        row.getString("logo_url"),
                        AddressType.valueOf(row.getString("address_type")),
                        row.getString("address_name"),
                        Province.valueOf(row.getString("province")),
                        row.getString("district"),
                        row.getString("locality"),
                        row.getString("street"),
                        WGS84.createPoint(new Coordinate(row.getDouble("longitude"), row.getDouble("latitude"))),
                        Visibility.valueOf(row.getString("street_visibility"))))
                .list();
    }
}
