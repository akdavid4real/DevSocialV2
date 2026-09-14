import { createHash } from 'crypto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) {}

    @Get()
    findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Query('status') status?: string,
        @Query('tech') tech?: string,
    ) {
        return this.projectsService.findAll({
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 12,
            search,
            status,
            tech,
        });
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    findMine(
        @Req() req: any,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('status') status?: string,
    ) {
        return this.projectsService.findMine(req.user.id, {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 24,
            status,
        });
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Req() req: any, @Body() dto: CreateProjectDto) {
        return this.projectsService.create(req.user.id, dto);
    }

    @Get(':id')
    @UseGuards(OptionalJwtAuthGuard)
    findOne(@Req() req: any, @Param('id') id: string) {
        const viewerId = req.user?.id as string | undefined;
        const ip = String(req.ip || req.connection?.remoteAddress || 'unknown');
        const userAgent = String(req.headers?.['user-agent'] || 'unknown');
        const visitorKey = viewerId
            ? `user:${viewerId}`
            : `guest:${createHash('sha256').update(`${ip}|${userAgent}`).digest('hex')}`;

        return this.projectsService.findOne(id, viewerId, visitorKey);
    }

    @Put(':id/status')
    @UseGuards(JwtAuthGuard)
    updateStatus(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateProjectStatusDto) {
        return this.projectsService.updateStatus(req.user.id, id, dto.status);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Req() req: any, @Param('id') id: string) {
        return this.projectsService.remove(req.user.id, id);
    }
}
