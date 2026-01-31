import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { HalalService } from './halal.service';
import { CheckHalalDto } from './dto/check-halal.dto';
import { HalalCheckResponse } from '../openai/interfaces/halal-response.interface';

@Controller('check-halal')
export class HalalController {
    constructor(private readonly halalService: HalalService) { }

    @Post()
    async checkHalalStatus(@Body() checkHalalDto: CheckHalalDto): Promise<HalalCheckResponse> {
        if (!checkHalalDto.text) {
            throw new HttpException(
                { error: 'Missing "text" in request body.' },
                HttpStatus.BAD_REQUEST,
            );
        }

        try {
            return await this.halalService.checkHalalStatus(checkHalalDto);
        } catch (error) {
            const errorMessage = (error as Error).message;
            throw new HttpException(
                {
                    error: 'An error occurred during the Halal analysis.',
                    details: errorMessage,
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
