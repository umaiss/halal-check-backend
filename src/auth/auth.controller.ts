import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto, AppleLoginDto } from './dto/social-login.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('signup')
    @HttpCode(HttpStatus.CREATED)
    async signup(@Body() signupDto: SignupDto) {
        return await this.authService.signup(signupDto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto) {
        return await this.authService.login(loginDto);
    }

    @Post('google')
    @HttpCode(HttpStatus.OK)
    async googleLogin(@Body() googleLoginDto: GoogleLoginDto) {
        return await this.authService.googleLogin(googleLoginDto);
    }

    @Post('apple')
    @HttpCode(HttpStatus.OK)
    async appleLogin(@Body() appleLoginDto: AppleLoginDto) {
        return await this.authService.appleLogin(appleLoginDto);
    }

    @Post('admin/login')
    @HttpCode(HttpStatus.OK)
    async adminLogin(@Body() loginDto: LoginDto) {
        return await this.authService.adminLogin(loginDto);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(@Body('refresh_token') refreshToken: string) {
        return await this.authService.refresh(refreshToken);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout() {
        return await this.authService.logout();
    }
}
