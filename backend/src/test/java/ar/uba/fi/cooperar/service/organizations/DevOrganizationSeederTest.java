package ar.uba.fi.cooperar.service.organizations;

import static org.mockito.AdditionalAnswers.returnsFirstArg;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationStatus;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class DevOrganizationSeederTest {

    private final OrganizationRepository organizations = mock(OrganizationRepository.class);
    private final UserAccountRepository users = mock(UserAccountRepository.class);
    private final DevOrganizationSeeder seeder = new DevOrganizationSeeder(
            organizations,
            users,
            new BCryptPasswordEncoder(),
            Clock.fixed(Instant.parse("2026-10-30T12:00:00Z"), ZoneOffset.UTC));

    @BeforeEach
    void saveReturnsTheEntity() {
        when(users.saveAndFlush(any())).then(returnsFirstArg());
        when(organizations.save(any())).then(returnsFirstArg());
    }

    @Test
    void seedsTheSampleOrganizationsOnAnEmptyDatabase() {
        seeder.run(null);

        verify(organizations, times(3)).save(any(Organization.class));
        verify(organizations)
                .save(argThat(organization -> organization.getSlug().equals("cooperativa-ejemplo-textil")
                        && organization.getStatus() == OrganizationStatus.APPROVED
                        && organization.getLocation().getY() == -34.617608
                        && organization.getLocation().getX() == -58.368443));
        verify(organizations)
                .save(argThat(organization -> organization.getSlug().equals("cooperativa-ejemplo-grafica")
                        && organization.getLocation() == null));
    }

    @Test
    void leavesExistingSamplesUntouched() {
        when(organizations.existsBySlug(anyString())).thenReturn(true);

        seeder.run(null);

        verify(organizations, never()).save(any());
    }
}
