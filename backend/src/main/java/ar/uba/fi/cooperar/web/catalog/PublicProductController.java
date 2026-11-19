package ar.uba.fi.cooperar.web.catalog;

import ar.uba.fi.cooperar.service.catalog.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(value = "/api/organizations/{slug}/products", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "products")
public class PublicProductController {

    private final ProductService productService;

    public PublicProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    @Operation(operationId = "listOrganizationProducts", summary = "Active products and services of an organization")
    public List<PublicProductResponse> list(@PathVariable String slug) {
        return productService.listPublic(slug).stream()
                .map(PublicProductResponse::from)
                .toList();
    }
}
