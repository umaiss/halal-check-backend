import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CheckHalalDto {
    @IsString()
    @IsNotEmpty()
    text: string;

    @IsOptional()
    @IsUrl()
    front_image?: string;

    @IsOptional()
    @IsUrl()
    back_image?: string;

    @IsOptional()
    @IsUrl()
    ingredients_image?: string;
}
