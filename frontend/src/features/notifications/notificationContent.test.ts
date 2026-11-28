import { describe, expect, it } from 'vitest';
import { NotificationType } from '@/api/generated/model';
import { notificationContent } from './notificationContent';

describe('notificationContent', () => {
  const inquiry = {
    id: 'n1',
    type: NotificationType.INQUIRY_RECEIVED,
    subject: 'Remera de algodón',
    organizationId: 'c1',
    inquiryId: 'i1',
    createdAt: '2026-11-20T15:00:00Z',
  };

  it('links a new inquiry to it in the panel of its organization', () => {
    expect(notificationContent(inquiry, [{ id: 'c1', slug: 'la-litoralena' }])).toMatchObject({
      title: 'Nueva consulta sobre «Remera de algodón»',
      actionLabel: 'Ver consulta',
      to: '/cooperative/la-litoralena/inquiries/i1',
    });
  });

  it('falls back to the panel when the organization is no longer the account’s', () => {
    expect(notificationContent(inquiry, []).to).toBe('/cooperative');
  });
});
