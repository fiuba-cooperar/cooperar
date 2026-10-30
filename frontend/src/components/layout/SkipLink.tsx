import styles from './SkipLink.module.css';

/** First focusable element of every layout; jumps over the header to the `main` with id `main-content`. */
export function SkipLink() {
  return (
    <a className={styles.skipLink} href="#main-content">
      Saltar al contenido principal
    </a>
  );
}
