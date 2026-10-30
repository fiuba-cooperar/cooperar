import { Link } from 'react-router';
import styles from './Brand.module.css';

/** The cooperAR logo, linking to the public home page. */
export function Brand() {
  return (
    <Link to="/" className={styles.brand} aria-label="cooperAR, ir al inicio">
      <img src="/brand/symbol-mocks.png" alt="" />
      <span>
        cooper<span style={{ fontWeight: 600 }}>AR</span>
      </span>
    </Link>
  );
}
