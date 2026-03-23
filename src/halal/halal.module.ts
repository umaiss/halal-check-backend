import { Module } from '@nestjs/common';
import { HalalController } from './halal.controller';
import { HalalService } from './halal.service';
import { OpenAIModule } from '../openai/openai.module';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [OpenAIModule, DatabaseModule, AuthModule],
    controllers: [HalalController],
    providers: [HalalService],
})
export class HalalModule { }
