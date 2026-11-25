package ar.uba.fi.cooperar.web.user;

import ar.uba.fi.cooperar.service.user.UserListService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(value = "/api/admin/users", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "admin-users")
public class AdminUserController {

    private final UserListService listService;

    public AdminUserController(UserListService listService) {
        this.listService = listService;
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
}
