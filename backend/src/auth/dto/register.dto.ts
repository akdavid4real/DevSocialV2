import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional, IsInt } from 'class-validator';

export class RegisterDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    password: string;

    @IsString()
    @MinLength(3)
    @MaxLength(20)
    @Matches(/^[a-zA-Z0-9_]+$/, {
        message: 'Username can only contain letters, numbers and underscores',
    })
    username: string;

    @IsString()
    @MaxLength(50)
    firstName: string;

    @IsString()
    @MaxLength(50)
    lastName: string;

    @IsOptional()
    @IsInt()
    birthMonth?: number;

    @IsOptional()
    @IsInt()
    birthDay?: number;

    @IsOptional()
    @IsString()
    affiliation?: string;

    @IsOptional()
    @IsString()
    affiliationType?: string;

    @IsOptional()
    @IsString()
    referralCode?: string;

    @IsOptional()
    @IsString()
    confirmPassword?: string;
}
