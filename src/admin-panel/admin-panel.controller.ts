import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminPanelService } from './admin-panel.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('admin-panel')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminPanelController {
    constructor(private readonly adminPanelService: AdminPanelService) {}

    @Get('scanned-products')
    async getAllScannedProducts() {
        return this.adminPanelService.getAllScannedProducts();
    }
}
