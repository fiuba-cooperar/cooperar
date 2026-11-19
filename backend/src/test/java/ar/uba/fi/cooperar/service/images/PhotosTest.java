package ar.uba.fi.cooperar.service.images;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;

class PhotosTest {

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};

    private final ImageStorage storage = mock(ImageStorage.class);
    private final Photos photos = new Photos(storage);

    @Test
    void recognisesAnAcceptedImageByItsContent() {
        assertThat(Photos.check(PNG)).isEqualTo(ImageFormat.PNG);
    }

    @Test
    void rejectsEmptyHugeOrUnknownFiles() {
        assertThatThrownBy(() -> Photos.check(new byte[0])).isInstanceOf(InvalidImageException.class);
        assertThatThrownBy(() -> Photos.check(new byte[Photos.MAX_BYTES + 1]))
                .isInstanceOf(InvalidImageException.class);
        assertThatThrownBy(() -> Photos.check(new byte[] {1, 2, 3, 4})).isInstanceOf(InvalidImageException.class);
    }

    @Test
    void deletesTheStoredImageWhenAttachingItFails() {
        when(storage.store(any(), any())).thenReturn(new ImageStorage.StoredImage("ref-1", "https://img/1"));
        IllegalStateException failure = new IllegalStateException("full");

        assertThatThrownBy(() -> photos.store(PNG, ImageFormat.PNG, stored -> {
                    throw failure;
                }))
                .isSameAs(failure);
        verify(storage).delete("ref-1");
    }

    @Test
    void aFailedDeleteDoesNotFailTheRequest() {
        doThrow(new ImageStorageException("down", null)).when(storage).delete("ref-1");

        photos.deleteQuietly("ref-1");

        verify(storage).delete("ref-1");
    }
}
