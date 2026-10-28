import { HealthStatus } from '@/api/generated/model';
import { useSystemHealth } from '../api/useSystemHealth';
import styles from './SystemStatus.module.css';

export function SystemStatus() {
  const { data, isPending, isError } = useSystemHealth();

  return (
    <section className={styles.card} aria-labelledby="system-status-title">
      <h2 id="system-status-title" className={styles.title}>
        Estado del sistema
      </h2>
      <p role="status" className={styles.message}>
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
      </p>
    </section>
  );
}
