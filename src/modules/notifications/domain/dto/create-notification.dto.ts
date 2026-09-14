import { Prisma } from "@prisma/client";
import { IsEmail, IsNotEmpty, IsObject, IsOptional, IsString, Matches, MaxLength } from "class-validator";





export class CreateNotificationDto {


    @IsEmail()
    @MaxLength(320)
    recipient!: string;


    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message:
            'templateCode must contain only lowercase letters, numbers, and hyphens.',
    })
    templateCode!: string;

    @IsObject()
    payload!: Prisma.InputJsonObject;


    @IsOptional()
    @IsString()
    @MaxLength(255)
    subject?: string;

}