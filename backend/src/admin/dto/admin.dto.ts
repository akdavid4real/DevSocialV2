import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole, ReportStatus, ReportAction, PostStatus, AiService } from '@prisma/client';

// User Management DTOs
export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}

export class BanUserDto {
  @IsString()
  reason: string;

  @IsBoolean()
  @IsOptional()
  permanent?: boolean;
}

export enum XpAdjustmentAction {
  ADD = 'add',
  REMOVE = 'remove',
  SET = 'set',
}

export class UpdateUserXpDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount: number;

  @IsEnum(XpAdjustmentAction)
  action: XpAdjustmentAction;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class AdminResetPasswordDto {
  @IsString()
  @MinLength(8)
  newPassword: string;
}

// Report Management DTOs
export class ResolveReportDto {
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @IsEnum(ReportAction)
  @IsOptional()
  action?: ReportAction;

  @IsString()
  @IsOptional()
  reviewNote?: string;
}

export class GetReportsQueryDto {
  @IsEnum(ReportStatus)
  @IsOptional()
  status?: ReportStatus;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  _t?: number;
}

// Content Moderation DTOs
export class UpdatePostStatusDto {
  @IsEnum(PostStatus)
  status: PostStatus;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class GetPostsQueryDto {
  @IsEnum(PostStatus)
  @IsOptional()
  status?: PostStatus;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  _t?: number;
}

// Analytics DTOs
export class DateRangeDto {
  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  _t?: number;
}

export class GetAiLogsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 50;

  @IsEnum(AiService)
  @IsOptional()
  service?: AiService;

  @IsString()
  @IsOptional()
  taskType?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  _t?: number;
}
