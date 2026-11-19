package ar.uba.fi.cooperar.web.catalog;

import ar.uba.fi.cooperar.domain.catalog.SaleMode;
import ar.uba.fi.cooperar.service.catalog.ProductDraft;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.Set;
import java.util.UUID;

public record ProductRequest(
        @NotBlank @Size(max = 120) String name,

        @NotNull @Schema(description = "Id of one of the product categories")
        UUID categoryId,

        @NotEmpty Set<@NotNull SaleMode> saleModes,
        @Size(max = 2000) String description,

        @DecimalMin("0")
        @DecimalMax("9999999999.99")
        @Schema(description = "Indicative price in Argentine pesos; optional")
        BigDecimal indicativePrice,

        @Schema(
                description = "Publish the product when saving. Without it a new product is saved unpublished and an"
                        + " existing one keeps its status")
        Boolean publish) {

    ProductDraft toDraft() {
        return new ProductDraft(
                name, categoryId, saleModes, description, indicativePrice, Boolean.TRUE.equals(publish));
    }
}
