import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateFeedbackCommentDto } from './dto/create-feedback-comment.dto';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
    constructor(private readonly feedbackService: FeedbackService) {}

    @Get()
    findAll(
        @Req() req: any,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Query('status') status?: string,
        @Query('type') type?: string,
        @Query('view') view?: string,
    ) {
        const role = req.user?.role;
        const canViewAll = role === 'ADMIN' || role === 'MODERATOR' || role === 'admin' || role === 'moderator';

        return this.feedbackService.findAll({
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            search,
            status,
            type,
            userId: view === 'all' && canViewAll ? undefined : req.user.id,
        });
    }

    @Post()
    create(@Req() req: any, @Body() dto: CreateFeedbackDto) {
        return this.feedbackService.create(req.user.id, dto);
    }

    @Get(':id')
    findOne(@Req() req: any, @Param('id') id: string) {
        return this.feedbackService.findOne(req.user.id, id);
    }

    @Post(':id/comments')
    createComment(@Req() req: any, @Param('id') id: string, @Body() dto: CreateFeedbackCommentDto) {
        return this.feedbackService.createComment(req.user.id, id, dto);
    }

    @Patch(':id/status')
    updateStatus(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateFeedbackStatusDto) {
        return this.feedbackService.updateStatus(req.user.id, id, dto.status);
    }
}
