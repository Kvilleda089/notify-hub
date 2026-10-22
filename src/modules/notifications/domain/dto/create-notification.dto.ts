import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, ValidateIf } from "class-validator";
import { NotificationChannel } from "src/generated/prisma/client";

export class CreateNotificationDto {
  @IsIn([NotificationChannel.EMAIL, NotificationChannel.SMS])
  channel!: NotificationChannel;

  @IsString() @IsNotEmpty() @MaxLength(320)
  recipient!: string;

  @ValidateIf(o => o.channel === NotificationChannel.EMAIL)
  @IsString() @IsNotEmpty() @MaxLength(255)
  subject?: string;

  @ValidateIf(o => o.channel === NotificationChannel.EMAIL)
  @IsString() @IsNotEmpty()
  htmlContent?: string;

  @ValidateIf(o => o.channel === NotificationChannel.SMS || o.textContent !== undefined)
  @IsString() @IsNotEmpty() @MaxLength(1600)
  textContent?: string;

  @IsOptional() @IsObject()
  metadata?: Record<string, unknown>;
}