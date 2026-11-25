import { Anchor, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router';
import type { AdminOrganizationUserResponse } from '@/api/generated/model';
import { adminUserPath } from '../adminSections';
import { fullName, userCount } from '../users';
import styles from './OrganizationUsers.module.css';

/**
 * How many accounts manage an organization, and who they are once opened. Closed by default so a card stays short
 * even when many people share an organization.
 */
export function OrganizationUsers({
  organizationId,
  organizationName,
  users,
}: {
  organizationId: string;
  organizationName: string;
  users: AdminOrganizationUserResponse[];
}) {
  const [expanded, setExpanded] = useState(false);
  const listId = `organization-${organizationId}-users`;

  if (users.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        Sin usuarios
      </Text>
    );
  }
  return (
    <Stack gap={6}>
      <UnstyledButton
        className={styles.toggle}
        aria-expanded={expanded}
        aria-controls={listId}
        aria-label={`${expanded ? 'Ocultar' : 'Ver'} los usuarios de ${organizationName}`}
        onClick={() => {
          setExpanded((current) => !current);
        }}
      >
        {userCount(users.length)}
        <IconChevronDown
          size={16}
          aria-hidden
          className={styles.chevron}
          data-expanded={expanded || undefined}
        />
      </UnstyledButton>
      {expanded && (
        <Stack component="ul" gap={4} id={listId} className={styles.list}>
          {users.map((user) => {
            const name = fullName(user);
            return (
              <li key={user.id}>
                <Text size="sm">
                  <Anchor component={Link} to={adminUserPath(user.id)} size="sm" fw={600}>
                    {name || 'Sin nombre'}
                  </Anchor>{' '}
                  <Text span size="sm" c="dimmed">
                    {user.email}
                  </Text>
                </Text>
              </li>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
