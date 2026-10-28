package ar.uba.fi.cooperar.web.health;

import ar.uba.fi.cooperar.domain.health.SystemHealth;
import ar.uba.fi.cooperar.service.health.HealthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
@Tag(name = "health")
public class HealthController {

    private final HealthService healthService;

    public HealthController(HealthService healthService) {
        this.healthService = healthService;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(operationId = "getHealth", summary = "Application and database health")
    @ApiResponse(responseCode = "200", description = "The application and its database are up")
    @ApiResponse(
            responseCode = "503",
            description = "A dependency is down",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = HealthResponse.class)))
    public ResponseEntity<HealthResponse> getHealth() {
        SystemHealth health = healthService.check();
        HttpStatus httpStatus = health.isUp() ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
        return ResponseEntity.status(httpStatus).body(HealthResponse.from(health));
    }
}
