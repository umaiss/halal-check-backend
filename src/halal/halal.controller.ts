import { Controller, Post, Get, Body, HttpException, HttpStatus, UseGuards, Request, Patch, Param, ParseIntPipe, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { HalalService } from './halal.service';
import { CheckHalalDto } from './dto/check-halal.dto';
import { SaveHistoryDto } from './dto/save-history.dto';
import { ImproveCheckDto } from './dto/improve-check.dto';
import { HalalCheckResponse } from '../openai/interfaces/halal-response.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { S3Service } from '../s3/s3.service';

@Controller('check-halal')
export class HalalController {
    constructor(
        private readonly halalService: HalalService,
        private readonly s3Service: S3Service,
    ) { }

    /**
     * POST /api/check-halal/upload-image
     * Upload 1–5 product images to S3 and get back their public URLs.
     * The mobile app calls this FIRST, then passes the returned URLs
     * in the `front_image`, `back_image`, etc. fields of POST /check-halal.
     *
     * Form-data field name: "images"
     */
    @Post('upload-image')
    @UseInterceptors(FilesInterceptor('images', 5))
    async uploadImages(@UploadedFiles() files: Array<Express.Multer.File>) {
        if (!files || files.length === 0) {
            throw new HttpException(
                { error: 'No image files provided. Use multipart field name "images".' },
                HttpStatus.BAD_REQUEST,
            );
        }
        try {
            const urls = await this.s3Service.uploadFiles('product-images', files);
            return { urls };
        } catch (error) {
            throw new HttpException(
                { error: 'Failed to upload images to S3.', details: (error as Error).message },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

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

    @Patch(':id/improve')
    async improveCheck(
        @Param('id', ParseIntPipe) id: number,
        @Body() improveCheckDto: ImproveCheckDto
    ) {
        try {
            return await this.halalService.improveCheck(id, improveCheckDto);
        } catch (error) {
            throw new HttpException(
                {
                    error: 'Failed to update product with improvement data.',
                    details: (error as Error).message,
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
