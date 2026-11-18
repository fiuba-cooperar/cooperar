import { Button, Group, Stack, Text, Title } from '@mantine/core';
import { IconCircleCheck } from '@tabler/icons-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { COOPERATIVE_REGISTRATION_REQUESTS_PATH } from '../cooperativeSections';
import styles from './RequestSent.module.css';

/** Confirms that a request went to the observatory. It replaces the form, so it takes the focus. */
export function RequestSent({ title, children }: { title: string; children: string }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <Stack gap="md" align="flex-start">
      <Group gap="xs" wrap="nowrap">
        <IconCircleCheck size={28} stroke={1.8} aria-hidden className={styles.doneIcon} />
        <Title order={2} fz={20} ref={headingRef} tabIndex={-1} className={styles.heading}>
          {title}
        </Title>
      </Group>
      <Text>{children}</Text>
      <Button component={Link} to={COOPERATIVE_REGISTRATION_REQUESTS_PATH} variant="default" h={44}>
        Ver mis solicitudes
      </Button>
    </Stack>
  );
}
