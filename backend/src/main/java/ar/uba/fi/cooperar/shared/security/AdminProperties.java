package ar.uba.fi.cooperar.shared.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Credentials of the first admin account, created at startup when no admin exists yet. Both must be set. */
@ConfigurationProperties("cooperar.admin")
public record AdminProperties(String email, String password) {

    public boolean isConfigured() {
        return email != null && !email.isBlank() && password != null && !password.isBlank();
    }
}
