import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdminPanelController } from './admin-panel.controller';
import { AdminPanelService } from './admin-panel.service';
import { DatabaseModule } from '../database/database.module';
import { S3Module } from '../s3/s3.module';

@Module({
    imports: [
        DatabaseModule,
        S3Module,
        MulterModule.register({ storage: memoryStorage() }),
    ],
    controllers: [AdminPanelController],
    providers: [AdminPanelService],
})
export class AdminPanelModule {}

