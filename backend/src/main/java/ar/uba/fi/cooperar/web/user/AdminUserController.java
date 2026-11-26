package ar.uba.fi.cooperar.web.user;

import ar.uba.fi.cooperar.service.user.PasswordResetService;
import ar.uba.fi.cooperar.service.user.UserListService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(value = "/api/admin/users", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "admin-users")
public class AdminUserController {

    private final UserListService listService;
    private final PasswordResetService passwordResetService;

    public AdminUserController(UserListService listService, PasswordResetService passwordResetService) {
        this.listService = listService;
        this.passwordResetService = passwordResetService;
    }

    @GetMapping
    @Operation(
            operationId = "listUsers",
            summary = "A page of the accounts of the platform, the newest first",
            description = "Every filter is optional: without it, the list is not narrowed by that criterion.")
    public AdminUserPageResponse list(@Valid @ParameterObject AdminUserSearchRequest request) {
        return AdminUserPageResponse.from(
                listService.list(request.criteria(), request.pageOrDefault(), request.sizeOrDefault()));
    }

    @GetMapping("/{id}")
    @Operation(operationId = "getUser", summary = "One account with the organizations it manages")
    public AdminUserDetailResponse get(@PathVariable UUID id) {
        return AdminUserDetailResponse.from(listService.get(id));
    }

    @PostMapping("/{id}/password-reset")
    @Operation(
            operationId = "resetUserPassword",
            summary = "Reset the password of an organization account",
            description = "The current password stops working, the account is signed out everywhere and it is emailed a"
                    + " link to choose a new one. Answers 404 when the account does not exist and 409 when it is an"
                    + " observatory account.")
    public ResponseEntity<Void> resetPassword(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        passwordResetService.resetByAdmin(id, UUID.fromString(jwt.getSubject()));
        return ResponseEntity.noContent().build();
    }
}
