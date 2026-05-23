import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { HalalController } from './halal.controller';
import { HalalService } from './halal.service';
import { OpenAIModule } from '../openai/openai.module';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { S3Module } from '../s3/s3.module';

@Module({
    imports: [
        OpenAIModule,
        DatabaseModule,
        AuthModule,
        S3Module,
        MulterModule.register({ storage: memoryStorage() }),
    ],
    controllers: [HalalController],
    providers: [HalalService],
})
export class HalalModule { }
