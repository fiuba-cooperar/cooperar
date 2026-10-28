package ar.uba.fi.cooperar.shared.error;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.ProblemDetail;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void hidesTheDetailsOfUnexpectedErrors() {
        ProblemDetail problem = handler.handleUnexpected(new IllegalStateException("connection string with password"));

        assertThat(problem.getStatus()).isEqualTo(500);
        assertThat(problem.getDetail())
                .isEqualTo("An unexpected error occurred")
                .doesNotContain("password");
    }
}
