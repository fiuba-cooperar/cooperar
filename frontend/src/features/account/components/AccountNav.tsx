import { IconHome } from '@tabler/icons-react';
import { NavLink } from 'react-router';
import { ACCOUNT_HOME_PATH } from '../accountSections';
import styles from './AccountNav.module.css';

/** Link to the home of the account, shared by the headers of the account pages and of the cooperative panel. */
export function AccountNav() {
  return (
    <nav aria-label="Mi cuenta">
      <NavLink to={ACCOUNT_HOME_PATH} end className={() => styles.navLink}>
        <IconHome size={20} stroke={1.9} aria-hidden />
        Inicio
      </NavLink>
    </nav>
  );
}
