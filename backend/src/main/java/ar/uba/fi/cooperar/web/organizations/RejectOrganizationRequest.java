package ar.uba.fi.cooperar.web.organizations;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RejectOrganizationRequest(
        @NotBlank @Size(max = 1000) String reason) {}
