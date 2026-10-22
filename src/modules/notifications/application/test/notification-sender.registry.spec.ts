jest.mock('src/config', () => ({ env: {} }));

import { NotificationChannel } from 'src/generated/prisma/client';
import { NotificationSenderRegistry } from '../senders/notification-sender.registry';

describe('NotificationSenderRegistry', () => {
  const emailSender: any = { channel: 'EMAIL', providerName: 'RESEND' };
  const smsSender: any = { channel: 'SMS', providerName: 'MOCK_SMS' };
  let registry: NotificationSenderRegistry;

  beforeEach(() => {
    registry = new NotificationSenderRegistry(emailSender, smsSender);
  });

  it('resuelve el sender de EMAIL', () => {
    expect(registry.resolve(NotificationChannel.EMAIL)).toBe(emailSender);
  });

  it('resuelve el sender de SMS', () => {
    expect(registry.resolve(NotificationChannel.SMS)).toBe(smsSender);
  });

  it('lanza error si el canal no tiene sender registrado (WHATSAPP)', () => {
    expect(() => registry.resolve(NotificationChannel.WHATSAPP)).toThrow(
      'No sender registered for channel WHATSAPP.',
    );
  });
});
