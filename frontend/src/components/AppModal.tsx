import { Modal, type ModalProps } from '@mantine/core';
import styles from './AppModal.module.css';

/** The dialog every screen uses: rounded, with a bold title over a separator line. Takes the props of Mantine's Modal. */
export function AppModal({ classNames, ...props }: ModalProps) {
  return (
    <Modal
      centered
      radius="lg"
      padding="xl"
      classNames={{
        content: styles.content,
        header: styles.header,
        title: styles.title,
        body: styles.body,
        ...(typeof classNames === 'object' ? classNames : {}),
      }}
      {...props}
    />
  );
}
