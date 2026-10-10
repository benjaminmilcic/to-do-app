import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/** "HH:mm", 00:00 - 23:59. */
const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateTodoDto {
  /** Client-generated id, makes retries idempotent. */
  @IsUUID('4')
  id: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  notes?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString({ strict: true })
  dueDate?: string | null;

  /** Optional time of day for dueDate ("HH:mm"); requires a dueDate. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(TIME_OF_DAY, { message: 'dueTime must be HH:mm' })
  dueTime?: string | null;
}

export class UpdateTodoDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(10_000)
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  done?: boolean;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString({ strict: true })
  dueDate?: string | null;

  /** Optional time of day for dueDate ("HH:mm"); requires a dueDate. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(TIME_OF_DAY, { message: 'dueTime must be HH:mm' })
  dueTime?: string | null;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  position?: number;
}
