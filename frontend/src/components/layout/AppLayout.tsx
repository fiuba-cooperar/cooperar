import { Link, Outlet } from 'react-router';
import styles from './AppLayout.module.css';

export function AppLayout() {
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">
        Saltar al contenido principal
      </a>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link to="/" className={styles.brand}>
            CooperAR
          </Link>
        </div>
      </header>
      <main id="main-content" className={styles.main} tabIndex={-1}>
        <div className={styles.inner}>
          <Outlet />
        </div>
      </main>
      <footer className={styles.footer}>
        <div className={styles.inner}>
          <p>
            Trabajo Profesional de Ingeniería en Informática, FIUBA, junto a la Secretaría de
            Extensión Universitaria.
          </p>
        </div>
      </footer>
    </div>
  );
}
