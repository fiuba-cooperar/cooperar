package ar.uba.fi.cooperar.service.organizations;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ar.uba.fi.cooperar.domain.organizations.Cooperative;
import ar.uba.fi.cooperar.repository.organizations.CooperativeRepository;
import ar.uba.fi.cooperar.repository.organizations.IndustryRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class DevCooperativeSeederTest {

    private final CooperativeRepository cooperatives = mock(CooperativeRepository.class);
    private final IndustryRepository industries = mock(IndustryRepository.class);
    private final DevCooperativeSeeder seeder = new DevCooperativeSeeder(cooperatives, industries);

    @Test
    void seedsTheSampleCooperativesOnAnEmptyDatabase() {
        when(industries.findByName(anyString())).thenReturn(Optional.empty());

        seeder.run(null);

        verify(cooperatives, times(3)).save(any(Cooperative.class));
        verify(cooperatives)
                .save(argThat(cooperative -> cooperative.getSlug().equals("cooperativa-ejemplo-textil")
                        && cooperative.getLocation().getY() == -34.6624
                        && cooperative.getLocation().getX() == -58.3649));
        verify(cooperatives)
                .save(argThat(cooperative -> cooperative.getSlug().equals("cooperativa-ejemplo-grafica")
                        && cooperative.getLocation() == null));
    }

    @Test
    void leavesExistingSamplesUntouched() {
        when(cooperatives.existsBySlug(anyString())).thenReturn(true);

        seeder.run(null);

        verify(cooperatives, never()).save(any());
    }
}
