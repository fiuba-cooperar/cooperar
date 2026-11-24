import { Group, Paper, ThemeIcon, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import styles from './Panel.module.css';

export interface PanelProps {
  id: string;
  icon: ReactNode;
  title: string;
  /** Next to the title, like a count. */
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

/** A titled block of the page: a tinted header with its icon and actions, and the content below. */
export function Panel({ id, icon, title, badge, actions, children }: PanelProps) {
  return (
    <Paper component="section" withBorder radius="lg" aria-labelledby={id} className={styles.panel}>
      <Group justify="space-between" align="center" gap="sm" className={styles.panelHeader}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon variant="light" size={28} radius="md" aria-hidden>
            {icon}
          </ThemeIcon>
          <Title order={2} fz={16} id={id}>
            {title}
          </Title>
          {badge}
        </Group>
        {actions}
      </Group>
      <div className={styles.panelBody}>{children}</div>
    </Paper>
  );
}
