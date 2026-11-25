package ar.uba.fi.cooperar.web.user;

import ar.uba.fi.cooperar.service.user.PasswordResetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/password-reset")
@Tag(name = "auth")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    public PasswordResetController(PasswordResetService passwordResetService) {
        this.passwordResetService = passwordResetService;
    }

    @PostMapping
    @Operation(
            operationId = "requestPasswordReset",
            summary = "Email a link to choose a new password, if the email has an account",
            description = "Answers 204 whether the email has an account or not. Each address and each email can ask a"
                    + " limited number of times per hour; past it the answer is 429 with `Retry-After`.")
    public ResponseEntity<Void> request(@Valid @RequestBody PasswordResetRequest request, HttpServletRequest http) {
        passwordResetService.requestLink(request.email(), http.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    // POST rather than GET, so the token does not end up in access logs.
    @PostMapping(value = "/check", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            operationId = "checkPasswordResetToken",
            summary = "Whose password the link is for",
            description = "Answers 400 when the token is unknown, already used or expired.")
    public PasswordResetAccountResponse check(@Valid @RequestBody PasswordResetTokenRequest request) {
        return new PasswordResetAccountResponse(
                passwordResetService.accountFor(request.token()).getEmail());
    }

    @PostMapping("/confirm")
    @Operation(
            operationId = "resetPassword",
            summary = "Choose a new password with the token from the emailed link",
            description = "Signs the account out everywhere and confirms its email. Answers 400 when the token is"
                    + " unknown, already used or expired.")
    public ResponseEntity<Void> confirm(@Valid @RequestBody NewPasswordRequest request) {
        passwordResetService.resetPassword(request.token(), request.password());
        return ResponseEntity.noContent().build();
    }
}
