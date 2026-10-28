import { SystemStatus } from '@/features/health/components/SystemStatus';
import styles from './HomePage.module.css';

export function HomePage() {
  return (
    <div className={styles.page}>
      <h1>CooperAR</h1>
      <p className={styles.lead}>
        Observatorio abierto de empresas recuperadas por sus trabajadores y cooperativas de trabajo.
      </p>
      <SystemStatus />
    </div>
  );
}
