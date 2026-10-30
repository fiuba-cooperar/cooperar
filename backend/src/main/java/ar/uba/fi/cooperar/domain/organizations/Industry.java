package ar.uba.fi.cooperar.domain.organizations;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

/** A cooperative's main line of business ("rubro"), taken from a closed list kept by the observatory. */
@Entity
@Table(name = "industries")
public class Industry {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    protected Industry() {}

    public String getName() {
        return name;
    }
}
