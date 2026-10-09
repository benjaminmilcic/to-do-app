import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class RegisterDto {
  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  displayName?: string;
}

export class LoginDto {
  @Transform(trim)
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  refreshToken: string;
}

export class ExchangeCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code: string;
}

export class GoogleStartQuery {
  @IsOptional()
  @IsIn(['web', 'native'])
  platform?: 'web' | 'native';
}
