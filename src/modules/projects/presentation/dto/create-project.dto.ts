import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateProjectDto {

    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    name!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: `slug must contain only lowercase letters, numbers, and hyphens.`
    })
    slug!: string;
}