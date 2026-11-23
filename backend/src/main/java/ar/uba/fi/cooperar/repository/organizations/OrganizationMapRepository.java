package ar.uba.fi.cooperar.repository.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Province;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.domain.organizations.Visibility;
import java.util.List;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * The organizations on the public map, in one query that reads only the columns the map needs: no private field, no
 * photos and no other addresses (privacy rule 10), and one row per organization.
 */
@Repository
public class OrganizationMapRepository {

    private static final GeometryFactory WGS84 = new GeometryFactory(new PrecisionModel(), 4326);

    private final JdbcClient jdbcClient;

    public OrganizationMapRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    /** Every organization whose main address has a point, by name. */
    public List<LocatedOrganization> findLocated() {
        return jdbcClient
                .sql("""
                        SELECT o.slug, o.name, o.type, main.province, main.district, main.locality, o.logo_url,
                               main.street_visibility, ST_X(main.location) AS longitude,
                               ST_Y(main.location) AS latitude,
                               array(SELECT s.sector FROM organization_sectors s
                                     WHERE s.organization_id = o.id) AS sectors,
                               array(SELECT a.activity_type FROM organization_activity_types a
                                     WHERE a.organization_id = o.id) AS activity_types
                        FROM organizations o
                            JOIN organization_addresses main ON main.organization_id = o.id AND main.type = 'MAIN'
                        WHERE main.location IS NOT NULL
                        ORDER BY lower(o.name), o.id
                        """)
                .query((row, number) -> new LocatedOrganization(
                        row.getString("slug"),
                        row.getString("name"),
                        OrganizationType.valueOf(row.getString("type")),
                        SqlArrays.enums(row, "sectors", Sector.class),
                        SqlArrays.enums(row, "activity_types", ActivityType.class),
                        Province.valueOf(row.getString("province")),
                        row.getString("district"),
                        row.getString("locality"),
                        row.getString("logo_url"),
                        WGS84.createPoint(new Coordinate(row.getDouble("longitude"), row.getDouble("latitude"))),
                        Visibility.valueOf(row.getString("street_visibility"))))
                .list();
    }
}
