import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { HalalModule } from './halal/halal.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AdminPanelModule } from './admin-panel/admin-panel.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env'],
        }),
        HalalModule,
        DatabaseModule,
        AuthModule,
        UsersModule,
        AdminPanelModule,
    ],
    controllers: [AppController],
})
export class AppModule { }
