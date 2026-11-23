package ar.uba.fi.cooperar.domain.geography;

import java.util.List;

/** Every district and locality of the country, as the provider lists them. */
public record Places(List<District> districts, List<Locality> localities) {

    public static final Places NONE = new Places(List.of(), List.of());

    public Places {
        districts = List.copyOf(districts);
        localities = List.copyOf(localities);
    }
}
