package ar.uba.fi.cooperar.shared.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * The first admin account, created at startup when no admin exists yet. The email and password must be set; the name
 * is optional and is shown in the observatory panel.
 */
@ConfigurationProperties("cooperar.admin")
public record AdminProperties(String email, String password, String firstName, String lastName) {

    public boolean isConfigured() {
        return email != null && !email.isBlank() && password != null && !password.isBlank();
    }
}
