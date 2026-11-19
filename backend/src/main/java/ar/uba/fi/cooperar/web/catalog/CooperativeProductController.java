package ar.uba.fi.cooperar.web.catalog;

import ar.uba.fi.cooperar.service.catalog.ProductPhotoService;
import ar.uba.fi.cooperar.service.catalog.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Every operation answers 404 when the organization or the product does not exist, or the account does not manage it. */
@RestController
@RequestMapping(
        value = "/api/cooperative/organizations/{organizationId}/products",
        produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "cooperative-products")
public class CooperativeProductController {

    private final ProductService productService;
    private final ProductPhotoService photoService;

    public CooperativeProductController(ProductService productService, ProductPhotoService photoService) {
        this.productService = productService;
        this.photoService = photoService;
    }

    @GetMapping
    @Operation(
            operationId = "listManagedProducts",
            summary = "Every product of an organization the account manages, unpublished ones included")
    public List<ProductResponse> list(@PathVariable UUID organizationId, @AuthenticationPrincipal Jwt jwt) {
        return productService.listManaged(organizationId, accountId(jwt)).stream()
                .map(ProductResponse::from)
                .toList();
    }

    @GetMapping("/{productId}")
    @Operation(operationId = "getManagedProduct", summary = "A product of an organization the account manages")
    public ProductResponse get(
            @PathVariable UUID organizationId, @PathVariable UUID productId, @AuthenticationPrincipal Jwt jwt) {
        return ProductResponse.from(productService.getManaged(organizationId, accountId(jwt), productId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            operationId = "createProduct",
            summary = "Add a product or service",
            description = "It is saved unpublished unless the request says to publish it.")
    public ProductResponse create(
            @PathVariable UUID organizationId,
            @Valid @RequestBody ProductRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return ProductResponse.from(productService.create(organizationId, accountId(jwt), request.toDraft()));
    }

    @PutMapping("/{productId}")
    @Operation(operationId = "updateProduct", summary = "Edit a product, published or not")
    public ProductResponse update(
            @PathVariable UUID organizationId,
            @PathVariable UUID productId,
            @Valid @RequestBody ProductRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return ProductResponse.from(
                productService.update(organizationId, accountId(jwt), productId, request.toDraft()));
    }

    @PostMapping("/{productId}/unpublish")
    @Operation(
            operationId = "unpublishProduct",
            summary = "Take a product off the public profile",
            description = "The product is kept, only hidden. Unpublishing one that already is changes nothing.")
    public ProductResponse unpublish(
            @PathVariable UUID organizationId, @PathVariable UUID productId, @AuthenticationPrincipal Jwt jwt) {
        return ProductResponse.from(productService.unpublish(organizationId, accountId(jwt), productId));
    }

    @PostMapping("/{productId}/publish")
    @Operation(
            operationId = "publishProduct",
            summary = "Show a product on the public profile",
            description = "Publishing one that is already active changes nothing.")
    public ProductResponse publish(
            @PathVariable UUID organizationId, @PathVariable UUID productId, @AuthenticationPrincipal Jwt jwt) {
        return ProductResponse.from(productService.publish(organizationId, accountId(jwt), productId));
    }

    @DeleteMapping("/{productId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(
            operationId = "deleteProduct",
            summary = "Delete a product and its photos for good",
            description = "Published or not. Unpublishing hides a product and keeps it; this does not.")
    public void delete(
            @PathVariable UUID organizationId, @PathVariable UUID productId, @AuthenticationPrincipal Jwt jwt) {
        productService.delete(organizationId, accountId(jwt), productId);
    }

    @PostMapping(value = "/{productId}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            operationId = "addProductPhoto",
            summary = "Add a photo to a product, after the others",
            description = "A JPEG, PNG or WebP of at most 5 MB, checked by its content. Answers 400 for anything else"
                    + " and 409 when the product already has 5 photos.")
    public ProductResponse addPhoto(
            @PathVariable UUID organizationId,
            @PathVariable UUID productId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal Jwt jwt)
            throws IOException {
        return ProductResponse.from(photoService.add(organizationId, accountId(jwt), productId, file.getBytes()));
    }

    @PutMapping("/{productId}/photos/order")
    @Operation(
            operationId = "reorderProductPhotos",
            summary = "Set the order of the photos of a product",
            description = "The list must have every photo of the product exactly once; the first one is the cover."
                    + " Answers 400 otherwise.")
    public ProductResponse reorderPhotos(
            @PathVariable UUID organizationId,
            @PathVariable UUID productId,
            @Valid @RequestBody PhotoOrderRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return ProductResponse.from(
                photoService.reorder(organizationId, accountId(jwt), productId, request.photoIds()));
    }

    @DeleteMapping("/{productId}/photos/{photoId}")
    @Operation(operationId = "removeProductPhoto", summary = "Remove a photo of a product")
    public ProductResponse removePhoto(
            @PathVariable UUID organizationId,
            @PathVariable UUID productId,
            @PathVariable UUID photoId,
            @AuthenticationPrincipal Jwt jwt) {
        return ProductResponse.from(photoService.remove(organizationId, accountId(jwt), productId, photoId));
    }

    private static UUID accountId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
