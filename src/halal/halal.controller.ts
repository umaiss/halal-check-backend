import { Controller, Post, Get, Body, HttpException, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { HalalService } from './halal.service';
import { CheckHalalDto } from './dto/check-halal.dto';
import { SaveHistoryDto } from './dto/save-history.dto';
import { HalalCheckResponse } from '../openai/interfaces/halal-response.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('check-halal')
export class HalalController {
    constructor(private readonly halalService: HalalService) { }

    @UseGuards(OptionalJwtAuthGuard)
    @Post()
    async checkHalalStatus(@Request() req: any, @Body() checkHalalDto: CheckHalalDto): Promise<HalalCheckResponse & { id?: number }> {
        const userId = req.user?.userId || req.user?.id;
        if (!checkHalalDto.text) {
            throw new HttpException(
                { error: 'Missing "text" in request body.' },
                HttpStatus.BAD_REQUEST,
            );
        }

        try {
            return await this.halalService.checkHalalStatus(checkHalalDto, userId);
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

    @UseGuards(JwtAuthGuard)
    @Post('history')
    async saveScanHistory(@Request() req: any, @Body() saveHistoryDto: SaveHistoryDto) {
        const userId = req.user.userId;
        try {
            return await this.halalService.saveScanHistory(userId, saveHistoryDto.halal_check_id);
        } catch (error) {
            throw new HttpException(
                {
                    error: 'Failed to save scan history.',
                    details: (error as Error).message,
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @UseGuards(JwtAuthGuard)
    @Get('history')
    async getScanHistory(@Request() req: any) {
        const userId = req.user.userId;
        try {
            return await this.halalService.getUserScanHistory(userId);
        } catch (error) {
            throw new HttpException(
                {
                    error: 'Failed to retrieve scan history.',
                    details: (error as Error).message,
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
