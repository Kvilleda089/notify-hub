import { Logger } from '@nestjs/common';
import { NotificationStatus } from 'src/generated/prisma/client';
import {
  PROCESS_NOTIFICATION_JOB,
  RESEND_NOTIFICATION_JOB,
} from '../queues/notification-queue.service';
import { NotificationProcessor } from '../processors/notification.processor';





describe('NotificationProcessor', () => {
  let prisma: any;
  let sender: any;
  let registry: any;
  let processor: NotificationProcessor;

  const notification = { id: 'n1', channel: 'SMS', status: NotificationStatus.QUEUED };

  const makeJob = (overrides: any = {}): any => ({
    id: 'job-1',
    name: PROCESS_NOTIFICATION_JOB,
    data: { notificationId: 'n1' },
    opts: { attempts: 3 },
    attemptsMade: 0,
    ...overrides,
  });

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    prisma = {
      notification: {
        findUnique: jest.fn().mockResolvedValue(notification),
        update: jest.fn().mockResolvedValue({}),
      },
      deliveryAttempt: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'a1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    sender = { providerName: 'MOCK', send: jest.fn().mockResolvedValue('provider-msg-1') };
    registry = { resolve: jest.fn().mockReturnValue(sender) };
    processor = new NotificationProcessor(prisma, registry);
  });

  it('envía y marca la notificación como SENT', async () => {
    const result = await processor.process(makeJob());
    expect(sender.send).toHaveBeenCalledWith(notification, { idempotencyKey: 'notification/n1' });
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result).toEqual({ notificationId: 'n1', providerMessageId: 'provider-msg-1' });
  });

  it('ignora notificaciones que ya fueron enviadas', async () => {
    prisma.notification.findUnique.mockResolvedValue({ ...notification, status: NotificationStatus.SENT });
    await processor.process(makeJob());
    expect(sender.send).not.toHaveBeenCalled();
  });

  it('un reenvío manual usa una llave distinta y reenvía aunque esté SENT', async () => {
    prisma.notification.findUnique.mockResolvedValue({ ...notification, status: NotificationStatus.SENT });
    await processor.process(makeJob({ name: RESEND_NOTIFICATION_JOB, id: 'resend-1' }));
    expect(sender.send).toHaveBeenCalledWith(expect.anything(), {
      idempotencyKey: 'notification/n1/resend-1',
    });
  });

  it('si falla y quedan intentos, vuelve a QUEUED y relanza el error', async () => {
    sender.send.mockRejectedValue(new Error('boom'));
    await expect(processor.process(makeJob())).rejects.toThrow('boom');
    expect(prisma.notification.update).toHaveBeenLastCalledWith({
      where: { id: 'n1' },
      data: { status: NotificationStatus.QUEUED, failedAt: null },
    });
  });

  it('si falla en el último intento, queda en FAILED', async () => {
    sender.send.mockRejectedValue(new Error('boom'));
    await expect(processor.process(makeJob({ attemptsMade: 2 }))).rejects.toThrow('boom');
    expect(prisma.notification.update).toHaveBeenLastCalledWith({
      where: { id: 'n1' },
      data: { status: NotificationStatus.FAILED, failedAt: expect.any(Date) },
    });
  });
});