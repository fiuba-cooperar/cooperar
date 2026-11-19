package ar.uba.fi.cooperar.integration.disk;

import ar.uba.fi.cooperar.service.images.ImageFormat;
import io.swagger.v3.oas.annotations.Hidden;
import java.io.IOException;
import java.nio.file.Path;
import java.time.Duration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** Serves the photos kept on the disk. Public, like the public profiles that show them. */
@RestController
@ConditionalOnProperty(name = "cooperar.images.provider", havingValue = "disk", matchIfMissing = true)
@Hidden
public class DiskImageController {

    private final DiskImageStorage storage;

    public DiskImageController(DiskImageStorage storage) {
        this.storage = storage;
    }

    @GetMapping("/api/images/{name}")
    public ResponseEntity<Resource> get(@PathVariable String name) throws IOException {
        Path file = storage.find(name).orElse(null);
        if (file == null) {
            return ResponseEntity.notFound().build();
        }
        String extension = name.substring(name.lastIndexOf('.') + 1);
        ImageFormat format = ImageFormat.ofExtension(extension).orElseThrow();
        // The name is a random id that is never reused, so the browser can keep the image for good.
        return ResponseEntity.ok()
                .cacheControl(
                        CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                .header("X-Content-Type-Options", "nosniff")
                .contentType(MediaType.parseMediaType(format.contentType()))
                .body(new FileSystemResource(file));
    }
}
