import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import type { AuthenticationRequest } from 'src/common';
import { ApiKeyGuard } from 'src/modules/api-keys/application/guards/api-key.guard';
import { CreateNotificationCommand } from '../commands/impl/create-notification.command';
import { CreateNotificationDto } from '../../domain/dto/create-notification.dto';

@Controller('v1/notifications')
@UseGuards(ApiKeyGuard)
export class NotificationsController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  create(
    @Req() request: AuthenticationRequest,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dataNotification: CreateNotificationDto,
  ) {
    
    if(!idempotencyKey?.trim()) {
      throw new BadRequestException('Idempotency-Key header is required.');
    };


    return this.commandBus.execute(
      new CreateNotificationCommand(
        request.auth.projectId,
        idempotencyKey,
        dataNotification,
      ),
    );
  }
}