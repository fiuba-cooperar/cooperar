import { SimpleGrid, Stack, Text, Title } from '@mantine/core';
import styles from './AdminHomePage.module.css';

// Tools whose stories are still open: they are listed so the admin knows what is coming.
const UPCOMING_TOOLS = [
  // TODO(#40): link to the survey builder.
  {
    title: 'Relevamientos',
    description: 'Armá cuestionarios y consolidá las respuestas del sector.',
  },
  // TODO(#44): link to the sector metrics.
  { title: 'Métricas del sector', description: 'Mirá cómo se mueve la red de cooperativas.' },
] as const;

export function AdminHomePage() {
  return (
    <Stack gap={28}>
      <Stack gap={6}>
        <Title order={1}>Panel del observatorio</Title>
        <Text c="dimmed" size="lg">
          Gestión central de la plataforma.
        </Text>
      </Stack>
      <Stack component="section" aria-labelledby="upcoming-tools" gap={14}>
        <Title order={2} id="upcoming-tools" fz={18}>
          Próximamente
        </Title>
        <SimpleGrid
          component="ul"
          cols={{ base: 1, sm: 2, lg: 3 }}
          spacing="md"
          className={styles.tools}
        >
          {UPCOMING_TOOLS.map(({ title, description }) => (
            <li key={title} className={styles.tool}>
              <Text fw={700}>{title}</Text>
              <Text c="dimmed" size="sm" lh={1.5}>
                {description}
              </Text>
            </li>
          ))}
        </SimpleGrid>
      </Stack>
    </Stack>
  );
}
