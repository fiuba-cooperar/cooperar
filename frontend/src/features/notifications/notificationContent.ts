import {
  NotificationType,
  type NotificationResponse,
  type OrganizationSummary,
} from '@/api/generated/model';
import {
  ACCOUNT_REGISTRATION_REQUESTS_PATH,
  registrationRequestPath,
} from '@/features/account/accountSections';
import { COOPERATIVE_PATH, cooperativePanel } from '@/features/cooperative/cooperativeSections';

export type NotificationTone = 'blue' | 'green' | 'orange' | 'red';

/** How a notification reads and where it leads, which depends on its type. */
export interface NotificationContent {
  title: string;
  description?: string;
  tone: NotificationTone;
  actionLabel: string;
  to: string;
  /** Which organization the panel opens on, for the links to a panel. */
  organizationId?: string;
}

/** `organizations` are the account's, to link straight to the panel of the one a notification is about. */
export function notificationContent(
  notification: NotificationResponse,
  organizations: readonly Pick<OrganizationSummary, 'id' | 'slug'>[] = [],
): NotificationContent {
  const subject = notification.subject ?? '';
  const message = notification.message ? { description: notification.message } : {};
  switch (notification.type) {
    case NotificationType.INQUIRY_RECEIVED: {
      const organization = organizations.find(({ id }) => id === notification.organizationId);
      return {
        title: `Nueva consulta sobre «${subject}»`,
        tone: 'blue',
        actionLabel: 'Ver consulta',
        to:
          organization && notification.inquiryId
            ? cooperativePanel(organization.slug).inquiry(notification.inquiryId)
            : COOPERATIVE_PATH,
      };
    }
    case NotificationType.REGISTRATION_APPROVED:
      return {
        title: `Aprobaron la solicitud de «${subject}»`,
        description: 'Ya podés administrar la entidad desde su panel.',
        tone: 'green',
        actionLabel: 'Ir al panel',
        to: COOPERATIVE_PATH,
        ...(notification.organizationId ? { organizationId: notification.organizationId } : {}),
      };
    case NotificationType.REGISTRATION_REJECTED:
      return {
        title: `Rechazaron la solicitud de «${subject}»`,
        ...message,
        tone: 'red',
        actionLabel: 'Ver solicitudes',
        to: ACCOUNT_REGISTRATION_REQUESTS_PATH,
      };
    case NotificationType.REGISTRATION_CHANGES_REQUESTED:
    default:
      return {
        title: `Cambios solicitados en «${subject}»`,
        ...message,
        tone: 'orange',
        actionLabel: 'Corregir solicitud',
        to: notification.registrationRequestId
          ? registrationRequestPath(notification.registrationRequestId)
          : ACCOUNT_REGISTRATION_REQUESTS_PATH,
      };
  }
}
