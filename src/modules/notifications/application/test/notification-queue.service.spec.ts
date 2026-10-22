import {
  NotificationQueueService,
  PROCESS_NOTIFICATION_JOB,
  RESEND_NOTIFICATION_JOB,
} from '../queues/notification-queue.service';

describe('NotificationQueueService', () => {
  let queue: { add: jest.Mock };
  let service: NotificationQueueService;

  beforeEach(() => {
    queue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    service = new NotificationQueueService(queue as any);
  });

  afterEach(() => jest.restoreAllMocks());

  it('enqueue agrega un job con jobId determinista, 3 intentos y backoff exponencial', async () => {
    const result = await service.enqueue('n1');

    expect(queue.add).toHaveBeenCalledWith(
      PROCESS_NOTIFICATION_JOB,
      { notificationId: 'n1' },
      {
        jobId: 'notification-n1',
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );
    expect(result).toEqual({ id: 'job-1' });
  });

  it('enqueueResend usa un jobId único por timestamp para no chocar con el original', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

    await service.enqueueResend('n1');

    expect(queue.add).toHaveBeenCalledWith(
      RESEND_NOTIFICATION_JOB,
      { notificationId: 'n1' },
      {
        jobId: 'notification-resend-n1-1700000000000',
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );
  });

  it('propaga el error si la cola (Redis) falla', async () => {
    queue.add.mockRejectedValue(new Error('redis down'));

    await expect(service.enqueue('n1')).rejects.toThrow('redis down');
    await expect(service.enqueueResend('n1')).rejects.toThrow('redis down');
  });
});
