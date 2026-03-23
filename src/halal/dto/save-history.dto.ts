import { IsInt, IsNotEmpty } from 'class-validator';

export class SaveHistoryDto {
    @IsInt()
    @IsNotEmpty()
    halal_check_id: number;
}
