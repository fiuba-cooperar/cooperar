package ar.uba.fi.cooperar.web.organizations;

import ar.uba.fi.cooperar.service.organizations.RegistrationRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cooperative/registration-requests")
@Tag(name = "cooperative-registration-requests")
public class CooperativeRegistrationRequestController {

    private final RegistrationRequestService requestService;

    public CooperativeRegistrationRequestController(RegistrationRequestService requestService) {
        this.requestService = requestService;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(operationId = "listRegistrationRequestsSent", summary = "Every request the account sent, newest first")
    public List<CooperativeRegistrationRequestResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return requestService.list(UUID.fromString(jwt.getSubject())).stream()
                .map(CooperativeRegistrationRequestResponse::from)
                .toList();
    }

    @PostMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            operationId = "createRegistrationRequest",
            summary = "Send a request to add another organization",
            description = "It reaches the review once the account has confirmed its email. Answers 409 with a"
                    + " `conflicts` list (`CUIT`) when another organization or request under review has that CUIT.")
    public CooperativeRegistrationRequestResponse create(
            @Valid @RequestBody RegistrationOrganizationRequest request, @AuthenticationPrincipal Jwt jwt) {
        return CooperativeRegistrationRequestResponse.from(
                requestService.create(UUID.fromString(jwt.getSubject()), request.toDetails()));
    }

    @GetMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            operationId = "getRegistrationRequest",
            summary = "A registration request that the account sent",
            description = "Answers 404 when the request does not exist or another account sent it.")
    public CooperativeRegistrationRequestResponse get(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return CooperativeRegistrationRequestResponse.from(requestService.get(id, UUID.fromString(jwt.getSubject())));
    }

    @PutMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            operationId = "resubmitRegistrationRequest",
            summary = "Correct the request as the observatory asked and send it back to the review",
            description = "Answers 409 when the observatory did not ask for changes, or with a `conflicts` list"
                    + " (`CUIT`) when another organization or request under review has that CUIT.")
    public CooperativeRegistrationRequestResponse resubmit(
            @PathVariable UUID id,
            @Valid @RequestBody RegistrationOrganizationRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return CooperativeRegistrationRequestResponse.from(
                requestService.resubmit(id, UUID.fromString(jwt.getSubject()), request.toDetails()));
    }
}
