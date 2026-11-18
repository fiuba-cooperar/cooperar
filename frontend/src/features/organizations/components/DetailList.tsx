import { Text } from '@mantine/core';
import type { Detail } from '../registrationDetails';
import styles from './DetailList.module.css';

/** Read-only data as a description list: the term on the left and its value beside it, stacked on phones. */
export function DetailList({ details }: { details: Detail[] }) {
  return (
    <dl className={styles.details}>
      {details.map(({ term, description }) => (
        <div key={term} className={styles.detail}>
          <Text component="dt" size="sm" c="dimmed">
            {term}
          </Text>
          <Text component="dd" size="sm">
            {description}
          </Text>
        </div>
      ))}
    </dl>
  );
}
