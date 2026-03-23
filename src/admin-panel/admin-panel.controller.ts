import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminPanelService } from './admin-panel.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('admin-panel')
export class AdminPanelController {
    constructor(private readonly adminPanelService: AdminPanelService) {}

    @Get('scanned-products')
    // @UseGuards(JwtAuthGuard) // Optionally add guards if needed later
    async getAllScannedProducts() {
        return this.adminPanelService.getAllScannedProducts();
    }
}
