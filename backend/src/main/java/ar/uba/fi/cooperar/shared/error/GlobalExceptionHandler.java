package ar.uba.fi.cooperar.shared.error;

import ar.uba.fi.cooperar.domain.catalog.TooManyPhotosException;
import ar.uba.fi.cooperar.domain.organizations.ChangesNotRequestedException;
import ar.uba.fi.cooperar.domain.organizations.GalleryFullException;
import ar.uba.fi.cooperar.domain.organizations.InvalidCuitException;
import ar.uba.fi.cooperar.domain.organizations.InvalidOpeningHoursException;
import ar.uba.fi.cooperar.domain.organizations.InvalidStartYearException;
import ar.uba.fi.cooperar.domain.organizations.MainAddressRequiredException;
import ar.uba.fi.cooperar.domain.organizations.RegistrationNotAwaitingReviewException;
import ar.uba.fi.cooperar.domain.organizations.TooManyAddressesException;
import ar.uba.fi.cooperar.service.catalog.InvalidPhotoOrderException;
import ar.uba.fi.cooperar.service.catalog.InvalidProductCategoryException;
import ar.uba.fi.cooperar.service.catalog.ProductCategoryInUseException;
import ar.uba.fi.cooperar.service.catalog.ProductCategoryNameTakenException;
import ar.uba.fi.cooperar.service.catalog.ProductCategoryNotFoundException;
import ar.uba.fi.cooperar.service.catalog.ProductNotFoundException;
import ar.uba.fi.cooperar.service.catalog.ProductPhotoNotFoundException;
import ar.uba.fi.cooperar.service.images.ImageStorageException;
import ar.uba.fi.cooperar.service.images.InvalidImageException;
import ar.uba.fi.cooperar.service.inquiries.OwnProductInquiryException;
import ar.uba.fi.cooperar.service.notifications.NotificationNotFoundException;
import ar.uba.fi.cooperar.service.organizations.CuitAlreadyRegisteredException;
import ar.uba.fi.cooperar.service.organizations.EmailNotVerifiedException;
import ar.uba.fi.cooperar.service.organizations.InvalidGalleryOrderException;
import ar.uba.fi.cooperar.service.organizations.OrganizationNotFoundException;
import ar.uba.fi.cooperar.service.organizations.ProfilePhotoNotFoundException;
import ar.uba.fi.cooperar.service.organizations.RegistrationRequestNotFoundException;
import ar.uba.fi.cooperar.service.user.AccountNotFoundException;
import ar.uba.fi.cooperar.service.user.EmailAlreadyRegisteredException;
import ar.uba.fi.cooperar.service.user.EmailAlreadyVerifiedException;
import ar.uba.fi.cooperar.service.user.InvalidCredentialsException;
import ar.uba.fi.cooperar.service.user.InvalidRefreshTokenException;
import ar.uba.fi.cooperar.service.user.InvalidVerificationTokenException;
import ar.uba.fi.cooperar.service.user.PasswordTooLongException;
import ar.uba.fi.cooperar.service.user.UserNotFoundException;
import ar.uba.fi.cooperar.shared.ratelimit.TooManyRequestsException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
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

    @ExceptionHandler({
        InvalidCuitException.class,
        InvalidStartYearException.class,
        InvalidOpeningHoursException.class,
        TooManyAddressesException.class,
        MainAddressRequiredException.class,
        InvalidProductCategoryException.class,
        InvalidImageException.class,
        InvalidPhotoOrderException.class,
        InvalidGalleryOrderException.class,
        PasswordTooLongException.class,
        InvalidVerificationTokenException.class
    })
    public ProblemDetail handleInvalidInput(RuntimeException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage());
    }

    @ExceptionHandler({
        OrganizationNotFoundException.class,
        NotificationNotFoundException.class,
        RegistrationRequestNotFoundException.class,
        ProductNotFoundException.class,
        ProductCategoryNotFoundException.class,
        ProductPhotoNotFoundException.class,
        ProfilePhotoNotFoundException.class,
        UserNotFoundException.class
    })
    public ProblemDetail handleNotFound(RuntimeException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, exception.getMessage());
    }

    @ExceptionHandler({
        RegistrationNotAwaitingReviewException.class,
        ChangesNotRequestedException.class,
        EmailAlreadyVerifiedException.class,
        ProductCategoryNameTakenException.class,
        ProductCategoryInUseException.class,
        TooManyPhotosException.class,
        GalleryFullException.class,
        OwnProductInquiryException.class
    })
    public ProblemDetail handleStateConflict(RuntimeException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, exception.getMessage());
    }

    /** Same shape as the CUIT conflict, so the client points at the email field. */
    @ExceptionHandler(EmailAlreadyRegisteredException.class)
    public ProblemDetail handleEmailConflict(EmailAlreadyRegisteredException exception) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, exception.getMessage());
        problem.setProperty("conflicts", List.of("EMAIL"));
        return problem;
    }

    /** Names the conflicting field so the client can point at it. */
    @ExceptionHandler(CuitAlreadyRegisteredException.class)
    public ProblemDetail handleCuitConflict(CuitAlreadyRegisteredException exception) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, exception.getMessage());
        problem.setProperty("conflicts", List.of("CUIT"));
        return problem;
    }

    /** Anti-spam: tells the sender how long to wait, in seconds, rounded up. */
    @ExceptionHandler(TooManyRequestsException.class)
    public ResponseEntity<ProblemDetail> handleTooManyRequests(TooManyRequestsException exception) {
        long seconds = Math.max(1, exception.getRetryAfter().plusSeconds(1).toSeconds());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(seconds))
                .body(ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS, exception.getMessage()));
    }

    /** The account is signed in but not allowed yet: the client asks it to confirm the email. */
    @ExceptionHandler(EmailNotVerifiedException.class)
    public ProblemDetail handleEmailNotVerified(EmailNotVerifiedException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, exception.getMessage());
    }

    /** The image storage is down or refused the image: not the client's fault, and worth retrying later. */
    @ExceptionHandler(ImageStorageException.class)
    public ProblemDetail handleImageStorage(ImageStorageException exception) {
        log.error("Image storage failed", exception);
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_GATEWAY, "The photo could not be stored");
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(Exception exception) {
        log.error("Unexpected error", exception);
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
    }
}
