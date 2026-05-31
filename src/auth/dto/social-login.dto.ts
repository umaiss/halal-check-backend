import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleLoginDto {
    @IsNotEmpty({ message: 'idToken is required' })
    @IsString()
    idToken: string;
}

export class AppleLoginDto {
    @IsNotEmpty({ message: 'identityToken is required' })
    @IsString()
    identityToken: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    email?: string;
}
