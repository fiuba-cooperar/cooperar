package ar.uba.fi.cooperar.web.user;

import ar.uba.fi.cooperar.service.user.RegistrationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "auth")
public class RegistrationController {

    private final RegistrationService registrationService;

    public RegistrationController(RegistrationService registrationService) {
        this.registrationService = registrationService;
    }

    @PostMapping(value = "/register", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            operationId = "register",
            summary = "Create an account, which needs no approval",
            description = "Organizations are added afterwards, from the panel, with a registration request the "
                    + "observatory reviews. Answers 409 with `conflicts: [\"EMAIL\"]` when the email is taken, and 429 "
                    + "with `Retry-After` when the address created too many accounts in the last hour.")
    public RegistrationResponse register(@Valid @RequestBody RegistrationRequest request, HttpServletRequest http) {
        return new RegistrationResponse(registrationService.register(request.toNewAccount(), http.getRemoteAddr()));
    }
}
