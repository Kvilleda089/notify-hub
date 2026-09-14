import { IsEmail, IsNotEmpty, IsObject, IsOptional, IsString, Matches, MaxLength } from "class-validator";





export class CreateNotificationDto {


    @IsEmail()
    @MaxLength(320)
    recipient!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    subject!: string;

    @IsString()
    @IsNotEmpty()
    htmlContent!: string;

    @IsOptional()
    @IsString()
    textContent?: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;

}