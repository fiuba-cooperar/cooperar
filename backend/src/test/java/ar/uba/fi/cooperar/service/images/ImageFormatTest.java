package ar.uba.fi.cooperar.service.images;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Optional;
import org.junit.jupiter.api.Test;

class ImageFormatTest {

    @Test
    void recognisesTheFormatsByTheirFirstBytes() {
        assertThat(ImageFormat.detect(new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0}))
                .contains(ImageFormat.JPEG);
        assertThat(ImageFormat.detect(new byte[] {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A}))
                .contains(ImageFormat.PNG);
        assertThat(ImageFormat.detect("RIFF....WEBPVP8 ".getBytes())).contains(ImageFormat.WEBP);
    }

    @Test
    void rejectsAnythingElse() {
        assertThat(ImageFormat.detect("GIF89a......".getBytes())).isEmpty();
        assertThat(ImageFormat.detect(new byte[0])).isEmpty();
        assertThat(ImageFormat.detect("RIFF....WAVEfmt ".getBytes())).isEmpty();
    }

    @Test
    void findsAFormatByExtension() {
        assertThat(ImageFormat.ofExtension("JPG")).contains(ImageFormat.JPEG);
        assertThat(ImageFormat.ofExtension("exe")).isEqualTo(Optional.empty());
    }
}
