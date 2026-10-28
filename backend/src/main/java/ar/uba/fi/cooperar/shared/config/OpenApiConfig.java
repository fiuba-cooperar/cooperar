package ar.uba.fi.cooperar.shared.config;

import io.swagger.v3.core.jackson.ModelResolver;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    public static final String BEARER_AUTH = "bearerAuth";

    static {
        // Enums become named schemas, so the generated TypeScript client gets one reusable type per enum.
        ModelResolver.enumsAsRef = true;
    }

    /** A fixed relative server keeps the exported spec identical across runs, regardless of host and port. */
    @Bean
    OpenAPI cooperarOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("CooperAR API")
                        .version("v1")
                        .description("Open observatory of worker-recovered companies and worker cooperatives"))
                .servers(List.of(new Server().url("/")))
                .components(new Components()
                        .addSecuritySchemes(
                                BEARER_AUTH,
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")));
    }
}
