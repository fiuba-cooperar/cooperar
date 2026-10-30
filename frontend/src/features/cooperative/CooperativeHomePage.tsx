import { Stack, Text, Title } from '@mantine/core';
import { useEffect } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { EmailVerificationNotice } from './components/EmailVerificationNotice';
import { OrganizationStatusCard } from './components/OrganizationStatusCard';
import styles from './CooperativeHomePage.module.css';

export function CooperativeHomePage() {
  const { user, refreshUser } = useAuth();

  // The review may have finished since the session started, so the statuses are reloaded on every visit.
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  if (!user) return null;
  const { organizations } = user;

  return (
    <Stack gap="lg">
      <Title order={1}>Mi organización</Title>
      {!user.emailVerified && <EmailVerificationNotice email={user.email} />}
      {organizations.length > 0 ? (
        <Stack component="ul" gap="sm" className={styles.organizations}>
          {organizations.map((organization) => (
            <li key={organization.id}>
              <OrganizationStatusCard
                organization={organization}
                emailVerified={user.emailVerified}
              />
            </li>
          ))}
        </Stack>
      ) : (
        <Text>Todavía no tenés ninguna organización asociada a tu cuenta.</Text>
      )}
    </Stack>
  );
}
