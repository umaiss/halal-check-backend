
import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AdminPanelService } from './admin-panel.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ReviewProductDto } from './dto/review-product.dto';

@Controller('admin-panel')
@UseGuards(JwtAuthGuard)
export class AdminPanelController {
    constructor(private readonly adminPanelService: AdminPanelService) { }

    @Get('scanned-products')
    async getAllScannedProducts(@Req() req: any) {
        return this.adminPanelService.getAllScannedProducts(req.user);
    }

    @Get('scanned-products/:id')
    async getProduct(@Param('id') id: string, @Req() req: any) {
        return this.adminPanelService.getProduct(Number(id), req.user);
    }

    @Get('my-stats')
    async getMyStats(@Req() req: any) {
        return this.adminPanelService.getMyStats(req.user.userId);
    }

    @Get('stats')
    @UseGuards(JwtAuthGuard, AdminGuard)
    async getAdminStats() {
        return this.adminPanelService.getAdminStats();
    }

    @Get('all-reviews')
    @UseGuards(JwtAuthGuard, AdminGuard)
    async getAllReviews() {
        return this.adminPanelService.getAllReviews();
    }

    @Post('scanned-products/:id/claim')
    async claimProduct(@Param('id') id: string, @Req() req: any) {
        // req.user from JwtStrategy has userId and role
        return this.adminPanelService.claimProduct(Number(id), req.user.userId);
    }

    @Patch('scanned-products/:id/review')
    async reviewProduct(
        @Param('id') id: string,
        @Body() reviewDto: ReviewProductDto,
        @Req() req: any
    ) {
        return this.adminPanelService.reviewProduct(Number(id), req.user.userId, req.user.role, reviewDto);
    }

    @Post('scanned-products/:id/upload')
    @UseInterceptors(FilesInterceptor('files'))
    async uploadAttachments(
        @Param('id') id: string,
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Req() req: any
    ) {
        return this.adminPanelService.uploadAttachments(Number(id), files);
    }
}
