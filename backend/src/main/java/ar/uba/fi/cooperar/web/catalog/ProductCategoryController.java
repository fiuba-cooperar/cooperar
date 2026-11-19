package ar.uba.fi.cooperar.web.catalog;

import ar.uba.fi.cooperar.service.catalog.ProductCategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(value = "/api/product-categories", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "products")
public class ProductCategoryController {

    private final ProductCategoryService categoryService;

    public ProductCategoryController(ProductCategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    @Operation(operationId = "listProductCategories", summary = "The categories products and services are filed under")
    public List<ProductCategoryResponse> list() {
        return categoryService.list().stream()
                .map(ProductCategoryResponse::from)
                .toList();
    }
}
