package ar.uba.fi.cooperar.shared.error;

import ar.uba.fi.cooperar.domain.catalog.TooManyPhotosException;
import ar.uba.fi.cooperar.domain.organizations.ChangesNotRequestedException;
import ar.uba.fi.cooperar.domain.organizations.GalleryFullException;
import ar.uba.fi.cooperar.domain.organizations.InvalidCuitException;
import ar.uba.fi.cooperar.domain.organizations.InvalidStartYearException;
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
import ar.uba.fi.cooperar.service.organizations.CuitAlreadyRegisteredException;
import ar.uba.fi.cooperar.service.organizations.InvalidGalleryOrderException;
import ar.uba.fi.cooperar.service.organizations.OrganizationNotFoundException;
import ar.uba.fi.cooperar.service.organizations.ProfilePhotoNotFoundException;
import ar.uba.fi.cooperar.service.organizations.RegistrationRequestNotFoundException;
import ar.uba.fi.cooperar.service.user.AccountNotFoundException;
import ar.uba.fi.cooperar.service.user.EmailAlreadyVerifiedException;
import ar.uba.fi.cooperar.service.user.InvalidCredentialsException;
import ar.uba.fi.cooperar.service.user.InvalidRefreshTokenException;
import ar.uba.fi.cooperar.service.user.InvalidVerificationTokenException;
import ar.uba.fi.cooperar.service.user.PasswordTooLongException;
import ar.uba.fi.cooperar.service.user.RegistrationConflictException;
import java.util.List;
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

    @ExceptionHandler({
        InvalidCuitException.class,
        InvalidStartYearException.class,
        TooManyAddressesException.class,
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
        RegistrationRequestNotFoundException.class,
        ProductNotFoundException.class,
        ProductCategoryNotFoundException.class,
        ProductPhotoNotFoundException.class,
        ProfilePhotoNotFoundException.class
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
        GalleryFullException.class
    })
    public ProblemDetail handleStateConflict(RuntimeException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, exception.getMessage());
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

    /** Same shape as a registration conflict, so the client points at the CUIT field in both forms. */
    @ExceptionHandler(CuitAlreadyRegisteredException.class)
    public ProblemDetail handleCuitConflict(CuitAlreadyRegisteredException exception) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, exception.getMessage());
        problem.setProperty("conflicts", List.of("CUIT"));
        return problem;
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
