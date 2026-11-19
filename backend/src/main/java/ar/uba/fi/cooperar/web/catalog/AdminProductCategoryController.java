package ar.uba.fi.cooperar.web.catalog;

import ar.uba.fi.cooperar.domain.catalog.ProductCategory;
import ar.uba.fi.cooperar.service.catalog.ProductCategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(value = "/api/admin/product-categories", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "admin-product-categories")
public class AdminProductCategoryController {

    private final ProductCategoryService categoryService;

    public AdminProductCategoryController(ProductCategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    @Operation(operationId = "listAdminProductCategories", summary = "The product categories with their product count")
    public List<AdminProductCategoryResponse> list() {
        return categoryService.list().stream().map(this::response).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            operationId = "createProductCategory",
            summary = "Add a product category",
            description = "Answers 409 when another category has the same name, ignoring case.")
    public AdminProductCategoryResponse create(@Valid @RequestBody ProductCategoryRequest request) {
        return response(categoryService.create(request.name()));
    }

    @PutMapping("/{id}")
    @Operation(
            operationId = "renameProductCategory",
            summary = "Rename a product category; its products keep it",
            description = "Answers 409 when another category has the same name, ignoring case.")
    public AdminProductCategoryResponse rename(
            @PathVariable UUID id, @Valid @RequestBody ProductCategoryRequest request) {
        return response(categoryService.rename(id, request.name()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(
            operationId = "deleteProductCategory",
            summary = "Delete a product category",
            description = "Answers 409 while there are products filed under it.")
    public void delete(@PathVariable UUID id) {
        categoryService.delete(id);
    }

    private AdminProductCategoryResponse response(ProductCategory category) {
        return AdminProductCategoryResponse.from(category, categoryService.productCount(category.getId()));
    }
}
