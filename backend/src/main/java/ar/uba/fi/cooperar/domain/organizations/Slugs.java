package ar.uba.fi.cooperar.domain.organizations;

import java.text.Normalizer;
import java.util.Locale;

/** URL-safe identifiers derived from names, so a profile can be shared with a readable link. */
public final class Slugs {

    private static final String FALLBACK = "cooperativa";

    private Slugs() {}

    /** Lower-case ASCII words joined by hyphens: "Cooperativa A" becomes "cooperativa-a". */
    public static String fromName(String name) {
        String slug = Normalizer.normalize(name, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        return slug.isEmpty() ? FALLBACK : slug;
    }
}
