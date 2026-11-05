package ar.uba.fi.cooperar.service.organizations;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class ImageFormatTest {

    @Test
    void recognizesJpeg() {
        assertThat(ImageFormat.detect(new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0}))
                .contains(ImageFormat.JPEG);
    }

    @Test
    void recognizesPng() {
        byte[] signature = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0};

        assertThat(ImageFormat.detect(signature)).contains(ImageFormat.PNG);
    }

    @Test
    void recognizesWebp() {
        byte[] header = "RIFF\0\0\0\0WEBPVP8 ".getBytes(StandardCharsets.ISO_8859_1);

        assertThat(ImageFormat.detect(header)).contains(ImageFormat.WEBP);
    }

    @Test
    void rejectsOtherFilesWhateverTheirName() {
        assertThat(ImageFormat.detect("<svg xmlns=\"http://www.w3.org/2000/svg\"/>".getBytes(StandardCharsets.UTF_8)))
                .isEmpty();
        assertThat(ImageFormat.detect("GIF89a".getBytes(StandardCharsets.UTF_8)))
                .isEqualTo(Optional.empty());
    }

    @Test
    void rejectsAFileTooShortToBeAnyImage() {
        assertThat(ImageFormat.detect(new byte[0])).isEmpty();
        assertThat(ImageFormat.detect(new byte[] {(byte) 0xFF, (byte) 0xD8})).isEmpty();
        assertThat(ImageFormat.detect("RIFF".getBytes(StandardCharsets.ISO_8859_1)))
                .isEmpty();
    }
}
