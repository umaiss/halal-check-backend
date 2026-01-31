import { IsNotEmpty, IsString } from 'class-validator';

export class CheckHalalDto {
    @IsString()
    @IsNotEmpty()
    text: string;
}
