// import { NestFactory } from '@nestjs/core';
// import { ValidationPipe } from '@nestjs/common';
// import { AppModule } from './app.module';

// async function bootstrap() {
//     const app = await NestFactory.create(AppModule);

//     // Enable global validation pipe
//     app.useGlobalPipes(new ValidationPipe({
//         whitelist: true,
//         forbidNonWhitelisted: true,
//         transform: true,
//     }));

//     // Enable CORS if needed
//     app.enableCors();

//     // Set global prefix for all routes
//     app.setGlobalPrefix('api');

//     const port = process.env.PORT || 3000;
//     await app.listen(port, "0.0.0.0");

//     console.log(`Server running on http://localhost:${port}`);
// }

// bootstrap();


import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Enable global validation pipe
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));

    // Enable CORS with proper configuration
    app.enableCors({
        origin: '*', // Allow all origins (or specify your frontend URL)
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
        credentials: true,
        preflightContinue: false,
        optionsSuccessStatus: 204,
    });

    // Set global prefix for all routes
    app.setGlobalPrefix('api');

    const port = process.env.PORT || 3000;
    await app.listen(port, "0.0.0.0");

    console.log(`Server running on http://localhost:${port}`);
}
bootstrap();