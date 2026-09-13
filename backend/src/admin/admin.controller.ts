import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';
import {
  UpdateUserRoleDto,
  BanUserDto,
  ResolveReportDto,
  GetReportsQueryDto,
  UpdatePostStatusDto,
  GetPostsQueryDto,
  DateRangeDto,
  UpdateUserXpDto,
  AdminResetPasswordDto,
  GetAiLogsQueryDto,
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ============= ANALYTICS =============
  @Get('dashboard/stats')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.ANALYTICS)
  async getDashboardStats(@Query() dateRange: DateRangeDto) {
    return this.adminService.getDashboardStats(dateRange);
  }

  @Get('dashboard/user-growth')
  @Roles(UserRole.ADMIN, UserRole.ANALYTICS)
  async getUserGrowth(@Query('days') days?: number) {
    return this.adminService.getUserGrowth(days ? parseInt(days.toString()) : 30);
  }

  @Get('ai-logs')
  @Roles(UserRole.ADMIN, UserRole.ANALYTICS)
  async getAiLogs(@Query() query: GetAiLogsQueryDto) {
    return this.adminService.getAiLogs(query);
  }

  // ============= USER MANAGEMENT =============
  @Get('users')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async getAllUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllUsers(
      page ? parseInt(page.toString()) : 1,
      limit ? parseInt(limit.toString()) : 20,
      search,
    );
  }

  @Get('users/:userId')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async getUserDetails(@Param('userId') userId: string) {
    return this.adminService.getUserDetails(userId);
  }

  @Put('users/:userId/role')
  @Roles(UserRole.ADMIN)
  async updateUserRole(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRoleDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.adminService.updateUserRole(userId, dto, req.user.id);
  }

  @Post('users/:userId/ban')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @HttpCode(HttpStatus.OK)
  async banUser(
    @Param('userId') userId: string,
    @Body() dto: BanUserDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.adminService.banUser(userId, dto, req.user.id);
  }

  @Post('users/:userId/unban')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @HttpCode(HttpStatus.OK)
  async unbanUser(@Param('userId') userId: string, @Request() req: AuthenticatedRequest) {
    return this.adminService.unbanUser(userId, req.user.id);
  }

  @Put('users/:userId/xp')
  @Roles(UserRole.ADMIN)
  async updateUserXp(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserXpDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.adminService.updateUserXp(userId, dto, req.user.id);
  }

  @Post('users/:userId/reset-password')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async resetUserPassword(
    @Param('userId') userId: string,
    @Body() dto: AdminResetPasswordDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.adminService.resetUserPassword(userId, dto, req.user.id);
  }

  @Delete('users/:userId')
  @Roles(UserRole.ADMIN)
  async deleteUser(@Param('userId') userId: string, @Request() req: AuthenticatedRequest) {
    return this.adminService.deleteUser(userId, req.user.id);
  }

  // ============= REPORT MANAGEMENT =============
  @Get('reports')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async getReports(@Query() query: GetReportsQueryDto) {
    return this.adminService.getReports(query);
  }

  @Get('reports/:reportId')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async getReportDetails(@Param('reportId') reportId: string) {
    return this.adminService.getReportDetails(reportId);
  }

  @Put('reports/:reportId/resolve')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async resolveReport(
    @Param('reportId') reportId: string,
    @Body() dto: ResolveReportDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.adminService.resolveReport(reportId, dto, req.user.id);
  }

  // ============= CONTENT MODERATION =============
  @Get('posts')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async getPosts(@Query() query: GetPostsQueryDto) {
    return this.adminService.getPosts(query);
  }

  @Put('posts/:postId/status')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async updatePostStatus(
    @Param('postId') postId: string,
    @Body() dto: UpdatePostStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.adminService.updatePostStatus(postId, dto, req.user.id);
  }

  @Delete('posts/:postId')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async deletePost(
    @Param('postId') postId: string,
    @Body('reason') reason: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.adminService.deletePost(postId, reason, req.user.id);
  }

  // ============= AUDIT LOGS =============
  @Get('audit-logs')
  @Roles(UserRole.ADMIN)
  async getAuditLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getAuditLogs(
      page ? parseInt(page.toString()) : 1,
      limit ? parseInt(limit.toString()) : 50,
    );
  }
}
