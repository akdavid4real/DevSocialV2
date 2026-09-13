import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    UseGuards,
    Query,
    Req,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommentRateLimitGuard } from './guards/comment-rate-limit.guard';

@Controller('posts')
export class PostsController {
    constructor(private readonly postsService: PostsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Req() req: any, @Body() createPostDto: CreatePostDto) {
        return this.postsService.create(req.user.id, createPostDto);
    }

    @Get()
    findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
    ) {
        if (search) {
            return this.postsService.searchPosts(search);
        }
        return this.postsService.findAll(
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 10,
        );
    }

    @Get('tag/:tagName')
    findByTag(
        @Param('tagName') tagName: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.postsService.findByTag(
            tagName,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 10,
        );
    }

    // Comment routes MUST come before :id routes to avoid conflicts
    @Post('comments/:id/like')
    @UseGuards(JwtAuthGuard)
    async toggleCommentLike(@Param('id') id: string, @Req() req: any) {
        return this.postsService.toggleCommentLike(id, req.user.id);
    }

    @Delete('comments/:id')
    @UseGuards(JwtAuthGuard)
    async removeComment(@Param('id') id: string, @Req() req: any) {
        return this.postsService.removeComment(id, req.user.id);
    }

    @Get('comments/:id/replies')
    async getReplies(
        @Param('id') id: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Req() req?: any,
    ) {
        const userId = req?.user?.id;
        return this.postsService.getReplies(
            id,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 10,
            userId,
        );
    }

    @Post(':id/poll/vote')
    @UseGuards(JwtAuthGuard)
    votePoll(
        @Req() req: any,
        @Param('id') id: string,
        @Body('optionIds') optionIds: string[],
    ) {
        return this.postsService.votePoll(id, req.user.id, optionIds);
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Req() req?: any) {
        // Track view first
        const userId = req?.user?.id;
        const ipAddress = req?.ip || req?.connection?.remoteAddress || 'unknown';
        const userAgent = req?.headers?.['user-agent'];
        
        await this.postsService.trackView(id, userId, ipAddress, userAgent);
        
        // Return post with updated viewsCount
        return this.postsService.findOne(id);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Req() req: any, @Param('id') id: string) {
        return this.postsService.remove(id, req.user.id);
    }

    @Post(':id/like')
    @UseGuards(JwtAuthGuard)
    toggleLike(@Req() req: any, @Param('id') id: string) {
        return this.postsService.toggleLike(id, req.user.id);
    }

    @Post(':id/comments')
    @UseGuards(JwtAuthGuard, CommentRateLimitGuard)
    addComment(
        @Req() req: any,
        @Param('id') id: string,
        @Body() body: CreateCommentDto
    ) {
        return this.postsService.addComment(id, req.user.id, body.content, body.parentId, body.imageUrls, body.videoUrls);
    }

    @Get(':id/comments')
    async getComments(
        @Param('id') id: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Req() req?: any,
    ) {
        const userId = req?.user?.id; // Optional - works for both authenticated and guest users
        return this.postsService.getComments(
            id,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
            userId,
        );
    }
}
