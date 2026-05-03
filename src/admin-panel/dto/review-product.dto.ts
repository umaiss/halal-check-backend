import { IsEnum, IsString, IsNotEmpty } from 'class-validator';

export enum ReviewStatus {
  PENDING = 'pending',
  HALAL = 'halal',
  HARAM = 'haram',
  MUSHBOOH = 'mushbooh',
}

export class ReviewProductDto {
  @IsEnum(ReviewStatus)
  @IsNotEmpty()
  status: ReviewStatus;

  @IsString()
  @IsNotEmpty()
  reasoning: string;
}
