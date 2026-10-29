import { Paper, Text, Title } from '@mantine/core';
import { HealthStatus } from '@/api/generated/model';
import { useSystemHealth } from '../api/useSystemHealth';
import styles from './SystemStatus.module.css';

export function SystemStatus() {
  const { data, isPending, isError } = useSystemHealth();

  return (
    <Paper component="section" withBorder radius="lg" p="lg" aria-labelledby="system-status-title">
      <Title order={2} size="h4" id="system-status-title" mb="xs">
        Estado del sistema
      </Title>
      <Text role="status">
        {isPending && 'Consultando el estado del servidor…'}
        {isError && <span className={styles.down}>No pudimos conectarnos con el servidor.</span>}
        {data?.status === HealthStatus.UP && (
          <span className={styles.up}>El servidor y la base de datos funcionan correctamente.</span>
        )}
        {data?.status === HealthStatus.DOWN && (
          <span className={styles.down}>
            El servidor responde, pero la base de datos no está disponible.
          </span>
        )}
      </Text>
    </Paper>
  );
}
