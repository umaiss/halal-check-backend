import { IsArray, IsOptional, IsString, IsUrl } from 'class-validator';

export class ImproveCheckDto {
    @IsOptional()
    @IsUrl()
    barcode_image?: string;

    @IsOptional()
    @IsUrl()
    manufacturer_image?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    additional_images?: string[];
}
