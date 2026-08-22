import { IsNotEmpty, IsString, MaxLength } from "class-validator";


export class CreateApiKeyDto {

    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    name!: string;
}