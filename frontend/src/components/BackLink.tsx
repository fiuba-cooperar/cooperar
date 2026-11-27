import { IconChevronLeft } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import styles from './BackLink.module.css';

/** «Volver a …» at the top of a page: quiet text with a chevron that shows as a button on hover. */
export function BackLink({
  children,
  ...link
}: Omit<LinkProps, 'className'> & { children: ReactNode }) {
  return (
    <Link {...link} className={styles.back}>
      <IconChevronLeft size={16} stroke={2.4} aria-hidden />
      {children}
    </Link>
  );
}
