package ar.uba.fi.cooperar.web.catalog;

import ar.uba.fi.cooperar.domain.catalog.Product;
import ar.uba.fi.cooperar.service.catalog.ProductSearchService;
import ar.uba.fi.cooperar.service.catalog.ProductService;
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
@RequestMapping(value = "/api/products", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "products")
public class CatalogController {

    private static final int MORE_FROM_ORGANIZATION = 4;

    private final ProductSearchService searchService;
    private final ProductService productService;

    public CatalogController(ProductSearchService searchService, ProductService productService) {
        this.searchService = searchService;
        this.productService = productService;
    }

    @GetMapping
    @Operation(
            operationId = "searchProducts",
            summary = "Public catalog of products and services: full-text search, filters and pagination",
            description = "Words match in Spanish, ignoring accents and as prefixes of a word with the same stem."
                    + " Every search that narrows the catalog is logged, without anything that identifies the"
                    + " visitor.")
    public ProductSearchResponse search(@Valid @ParameterObject ProductSearchRequest request) {
        return ProductSearchResponse.from(searchService.search(
                request.criteria(), request.sortOrDefault(), request.pageOrDefault(), request.sizeOrDefault()));
    }

    @GetMapping("/{id}")
    @Operation(
            operationId = "getProduct",
            summary = "A published product or service, with the organization that offers it")
    public CatalogProductDetailResponse get(@PathVariable UUID id) {
        Product product = productService.getPublic(id);
        return new CatalogProductDetailResponse(
                CatalogProductResponse.from(product),
                productService.listMorePublic(product, MORE_FROM_ORGANIZATION).stream()
                        .map(CatalogProductResponse::from)
                        .toList());
    }
}
