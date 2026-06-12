import { IsEnum, IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export enum ReviewStatus {
  PENDING = 'pending',
  HALAL = 'halal',
  HARAM = 'haram',
  MUSHBOOH = 'mushbooh',
}

/**
 * DTO for reviewing a product.
 * Includes optional attachments URLs array for image uploads.
 */
export class ReviewProductDto {
  @IsEnum(ReviewStatus)
  @IsNotEmpty()
  status: ReviewStatus;

  @IsString()
  @IsNotEmpty()
  reasoning: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  attachments?: string[];

  @IsArray()
  @IsOptional()
  ingredients_analysis?: any[];
}
