import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";


export const NOTIFICATIONS_QUEUE = 'notifications';
export const PROCESS_NOTIFICATION_JOB = 'process-notification';


@Injectable()
export class NotificationQueueService {


    constructor(
        @InjectQueue(NOTIFICATIONS_QUEUE)
        private readonly notificationQueue: Queue,
    ) { }


    async enqueue(notificationId: string) {
        return this.notificationQueue.add(
            PROCESS_NOTIFICATION_JOB,
            { notificationId },
            {
                jobId: `notification-${notificationId}`,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
            },
        );
    }
}