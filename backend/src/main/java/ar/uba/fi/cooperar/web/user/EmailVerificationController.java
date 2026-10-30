package ar.uba.fi.cooperar.web.user;

import ar.uba.fi.cooperar.service.user.EmailVerificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "auth")
public class EmailVerificationController {

    private final EmailVerificationService emailVerificationService;

    public EmailVerificationController(EmailVerificationService emailVerificationService) {
        this.emailVerificationService = emailVerificationService;
    }

    @PostMapping("/api/auth/verify-email")
    @Operation(
            operationId = "verifyEmail",
            summary = "Confirm the account's email with the token from the emailed link",
            description = "Answers 400 when the token is unknown, already used or expired.")
    public ResponseEntity<Void> verify(@Valid @RequestBody VerifyEmailRequest request) {
        emailVerificationService.verify(request.token());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/me/email-verification")
    @Operation(
            operationId = "resendVerificationEmail",
            summary = "Email a new confirmation link to the signed-in account",
            description = "Previous links stop working. Answers 409 when the email is already confirmed.")
    public ResponseEntity<Void> resend(@AuthenticationPrincipal Jwt jwt) {
        emailVerificationService.resendLink(UUID.fromString(jwt.getSubject()));
        return ResponseEntity.noContent().build();
    }
}
