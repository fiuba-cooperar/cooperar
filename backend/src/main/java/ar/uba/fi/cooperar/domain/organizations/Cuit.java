package ar.uba.fi.cooperar.domain.organizations;

/** An Argentine tax ID (CUIT) as its 11 digits, with a valid check digit. */
public record Cuit(String digits) {

    private static final int[] WEIGHTS = {5, 4, 3, 2, 7, 6, 5, 4, 3, 2};

    public Cuit {
        if (digits == null || !digits.matches("\\d{11}") || checkDigit(digits) != digits.charAt(10) - '0') {
            throw new InvalidCuitException();
        }
    }

    /** Accepts the CUIT with or without dashes or spaces, as people usually type it. */
    public static Cuit parse(String value) {
        return new Cuit(value == null ? null : value.replaceAll("[\\s-]", ""));
    }

    // Modulo 11 with the AFIP weights. A result of 10 never gets assigned, so it can never match a digit.
    private static int checkDigit(String digits) {
        int sum = 0;
        for (int i = 0; i < WEIGHTS.length; i++) {
            sum += (digits.charAt(i) - '0') * WEIGHTS[i];
        }
        int result = 11 - sum % 11;
        return result == 11 ? 0 : result;
    }
}
