package ar.uba.fi.cooperar.shared.error;

import ar.uba.fi.cooperar.domain.organizations.InvalidCuitException;
import ar.uba.fi.cooperar.service.user.AccountNotFoundException;
import ar.uba.fi.cooperar.service.user.InvalidCredentialsException;
import ar.uba.fi.cooperar.service.user.InvalidRefreshTokenException;
import ar.uba.fi.cooperar.service.user.PasswordTooLongException;
import ar.uba.fi.cooperar.service.user.RegistrationConflictException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Every API error is returned as an RFC 9457 {@link ProblemDetail}. Spring MVC exceptions (validation, unsupported
 * media type, etc.) are handled by the superclass; anything unexpected becomes a 500 without leaking internals.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler({
        InvalidCredentialsException.class,
        InvalidRefreshTokenException.class,
        AccountNotFoundException.class
    })
    public ProblemDetail handleAuthenticationFailure(RuntimeException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, exception.getMessage());
    }

    @ExceptionHandler({InvalidCuitException.class, PasswordTooLongException.class})
    public ProblemDetail handleInvalidInput(RuntimeException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage());
    }

    /** Lists the conflicting fields so the client can point at them. */
    @ExceptionHandler(RegistrationConflictException.class)
    public ProblemDetail handleRegistrationConflict(RegistrationConflictException exception) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, exception.getMessage());
        problem.setProperty(
                "conflicts",
                exception.getFields().stream().map(Enum::name).sorted().toList());
        return problem;
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(Exception exception) {
        log.error("Unexpected error", exception);
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
    }
}
