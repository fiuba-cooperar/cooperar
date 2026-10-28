package ar.uba.fi.cooperar.shared.config;

import static org.assertj.core.api.Assertions.assertThat;

import ar.uba.fi.cooperar.IntegrationTest;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * Exports the OpenAPI spec to {@code build/openapi/openapi.json}. CI compares it with the committed
 * {@code api/openapi.json} so the frontend client can never drift from the backend.
 */
@IntegrationTest
class OpenApiSpecExportTest {

    private static final Path OUTPUT = Path.of("build/openapi/openapi.json");

    @Autowired
    private MockMvcTester mvc;

    @Test
    void exportsTheSpec() throws IOException {
        MvcTestResult result = mvc.get().uri("/v3/api-docs").exchange();
        assertThat(result).hasStatusOk();

        String spec = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(spec).contains("\"/api/health\"");

        Files.createDirectories(OUTPUT.getParent());
        Files.writeString(OUTPUT, spec.strip() + "\n", StandardCharsets.UTF_8);
    }
}
