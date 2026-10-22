import { BadRequestException, ConflictException, Logger } from '@nestjs/common';

import { NotificationChannel, NotificationStatus } from 'src/generated/prisma/client';
import { CreateNotificationCommand } from '../commands/impl/create-notification.command';
import { CreateNotificationHandler } from '../commands/handler/create-notification.handler';


describe('CreateNotificationHandler', () => {
  let prisma: any;
  let queue: any;
  let handler: CreateNotificationHandler;

  const dto: any = {
    channel: NotificationChannel.SMS,
    recipient: '+50255551234',
    textContent: 'Hola',
  };
  const existing = {
    id: 'n1', channel: 'SMS', recipient: '+50255551234', subject: null,
    htmlContent: null, textContent: 'Hola', metadata: null,
    status: NotificationStatus.QUEUED,
  };
  const run = (data: any = dto) =>
    handler.execute(new CreateNotificationCommand('p1', 'key-1', data));

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    prisma = { notification: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() } };
    queue = { enqueue: jest.fn() };
    handler = new CreateNotificationHandler(prisma, queue);
  });

  it('crea la notificación y la encola', async () => {
    prisma.notification.findUnique.mockResolvedValue(null);
    prisma.notification.create.mockResolvedValue({ id: 'n1' });
    prisma.notification.update.mockResolvedValue({ id: 'n1', status: NotificationStatus.QUEUED });
    await run();
    expect(queue.enqueue).toHaveBeenCalledWith('n1');
  });

  it('devuelve la existente al repetir un SMS con la misma llave', async () => {
    prisma.notification.findUnique.mockResolvedValue(existing);
    await expect(run()).resolves.toEqual(existing);
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('lanza 409 si la llave se reutiliza con datos distintos', async () => {
    prisma.notification.findUnique.mockResolvedValue(existing);
    await expect(run({ ...dto, textContent: 'Otro' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('reencola una notificación PENDING al reintentar', async () => {
    prisma.notification.findUnique.mockResolvedValue({ ...existing, status: NotificationStatus.PENDING });
    prisma.notification.update.mockResolvedValue({ ...existing, status: NotificationStatus.QUEUED });
    await run();
    expect(queue.enqueue).toHaveBeenCalledWith('n1');
  });

  it('vuelve a PENDING si falla el encolado', async () => {
    prisma.notification.findUnique.mockResolvedValue(null);
    prisma.notification.create.mockResolvedValue({ id: 'n1' });
    prisma.notification.update.mockResolvedValue({ id: 'n1' });
    queue.enqueue.mockRejectedValue(new Error('redis down'));
    await expect(run()).rejects.toThrow();
    expect(prisma.notification.update).toHaveBeenLastCalledWith({
      where: { id: 'n1' },
      data: { status: NotificationStatus.PENDING, queuedAt: null },
    });
  });

  it('rechaza un teléfono que no está en formato E.164', async () => {
    await expect(run({ ...dto, recipient: '55551234' })).rejects.toBeInstanceOf(BadRequestException);
  });
});