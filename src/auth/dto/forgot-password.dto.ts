import { IsEmail, IsNotEmpty, IsString, Length, MinLength } from 'class-validator';

export class ForgotPasswordDto {
    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Invalid email format' })
    email: string;
}

export class ResetPasswordDto {
    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Invalid email format' })
    email: string;

    @IsNotEmpty({ message: 'Verification code is required' })
    @IsString()
    @Length(6, 6, { message: 'Verification code must be exactly 6 characters' })
    code: string;

    @IsNotEmpty({ message: 'New password is required' })
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    password: string;
}
