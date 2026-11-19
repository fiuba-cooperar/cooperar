package ar.uba.fi.cooperar.web.catalog;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProductCategoryRequest(
        @NotBlank @Size(max = 80) String name) {}
