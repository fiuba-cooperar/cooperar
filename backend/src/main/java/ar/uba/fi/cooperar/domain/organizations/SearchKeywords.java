package ar.uba.fi.cooperar.domain.organizations;

import java.util.Collection;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * The Spanish words a visitor types for what an organization stores as codes, so that searching "textil" or "Córdoba"
 * finds it. They feed the full-text index along with the name, the place and the description. Migration V10 fills in
 * the existing organizations with these same words.
 */
public final class SearchKeywords {

    private static final Map<OrganizationType, String> TYPES = Map.of(
            OrganizationType.COOPERATIVE, "cooperativa de trabajo",
            OrganizationType.ERT, "empresa recuperada ERT");

    private static final Map<Sector, String> SECTORS = Map.of(
            Sector.FOOD, "alimentos",
            Sector.TEXTILE, "textil",
            Sector.METALWORKING, "metalúrgica",
            Sector.PRINTING, "gráfica",
            Sector.SERVICES, "servicios",
            Sector.OTHER, "");

    private static final Map<ActivityType, String> ACTIVITY_TYPES = Map.of(
            ActivityType.WORK, "trabajo",
            ActivityType.SERVICE, "servicio",
            ActivityType.PRODUCT, "producto");

    private static final Map<Province, String> PROVINCES = Map.ofEntries(
            Map.entry(Province.BUENOS_AIRES, "Buenos Aires"),
            Map.entry(Province.CITY_OF_BUENOS_AIRES, "Ciudad Autónoma de Buenos Aires CABA"),
            Map.entry(Province.CATAMARCA, "Catamarca"),
            Map.entry(Province.CHACO, "Chaco"),
            Map.entry(Province.CHUBUT, "Chubut"),
            Map.entry(Province.CORDOBA, "Córdoba"),
            Map.entry(Province.CORRIENTES, "Corrientes"),
            Map.entry(Province.ENTRE_RIOS, "Entre Ríos"),
            Map.entry(Province.FORMOSA, "Formosa"),
            Map.entry(Province.JUJUY, "Jujuy"),
            Map.entry(Province.LA_PAMPA, "La Pampa"),
            Map.entry(Province.LA_RIOJA, "La Rioja"),
            Map.entry(Province.MENDOZA, "Mendoza"),
            Map.entry(Province.MISIONES, "Misiones"),
            Map.entry(Province.NEUQUEN, "Neuquén"),
            Map.entry(Province.RIO_NEGRO, "Río Negro"),
            Map.entry(Province.SALTA, "Salta"),
            Map.entry(Province.SAN_JUAN, "San Juan"),
            Map.entry(Province.SAN_LUIS, "San Luis"),
            Map.entry(Province.SANTA_CRUZ, "Santa Cruz"),
            Map.entry(Province.SANTA_FE, "Santa Fe"),
            Map.entry(Province.SANTIAGO_DEL_ESTERO, "Santiago del Estero"),
            Map.entry(Province.TIERRA_DEL_FUEGO, "Tierra del Fuego"),
            Map.entry(Province.TUCUMAN, "Tucumán"));

    private SearchKeywords() {}

    static String of(
            OrganizationType type,
            Collection<Sector> sectors,
            Collection<ActivityType> activityTypes,
            Province province) {
        return Stream.of(
                        Stream.of(TYPES.get(type)),
                        sectors.stream().map(SECTORS::get),
                        activityTypes.stream().map(ACTIVITY_TYPES::get),
                        Stream.of(PROVINCES.get(province)))
                .flatMap(words -> words)
                .filter(words -> !words.isEmpty())
                .collect(Collectors.joining(" "));
    }
}
