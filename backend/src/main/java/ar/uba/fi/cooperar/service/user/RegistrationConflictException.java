package ar.uba.fi.cooperar.service.user;

import java.util.Set;

/** The email or the CUIT (or both) already belong to someone else. */
public class RegistrationConflictException extends RuntimeException {

    public enum Field {
        EMAIL,
        CUIT
    }

    private final Set<Field> fields;

    public RegistrationConflictException(Set<Field> fields) {
        super(message(fields));
        this.fields = Set.copyOf(fields);
    }

    public Set<Field> getFields() {
        return fields;
    }

    private static String message(Set<Field> fields) {
        if (fields.containsAll(Set.of(Field.EMAIL, Field.CUIT))) {
            return "The email and the CUIT are already registered";
        }
        return fields.contains(Field.EMAIL) ? "The email is already registered" : "The CUIT is already registered";
    }
}
