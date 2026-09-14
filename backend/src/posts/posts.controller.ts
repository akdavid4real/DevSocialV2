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
import { PostVisibilityService } from './post-visibility.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CommentRateLimitGuard } from './guards/comment-rate-limit.guard';

@Controller('posts')
export class PostsController {
    constructor(
        private readonly postsService: PostsService,
        private readonly visibility: PostVisibilityService,
    ) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    async create(@Req() req: any, @Body() createPostDto: CreatePostDto) {
        await this.visibility.assertCanPostInCommunity(req.user.id, createPostDto.communityId);
        return this.postsService.create(req.user.id, createPostDto);
    }

    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    async findAll(
        @Req() req: any,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
    ) {
        const viewerId = req.user?.id;
        if (search) {
            const posts = await this.postsService.searchPosts(search);
            return this.visibility.filterPosts(posts, viewerId);
        }

        const pageNum = page ? parseInt(page) : 1;
        const limitNum = limit ? parseInt(limit) : 10;
        const result = await this.postsService.findAll(pageNum, limitNum);
        const visiblePosts = await this.visibility.filterPosts(result.posts, viewerId);
        const safePage = Math.max(pageNum || 1, 1);
        const safeLimit = Math.min(Math.max(limitNum || 10, 1), 50);

        return {
            ...result,
            posts: visiblePosts,
            total: (safePage - 1) * safeLimit + visiblePosts.length,
            lastPage: visiblePosts.length === safeLimit ? safePage + 1 : safePage,
        };
    }

    @Get('tag/:tagName')
    @UseGuards(OptionalJwtAuthGuard)
    async findByTag(
        @Req() req: any,
        @Param('tagName') tagName: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const pageNum = page ? parseInt(page) : 1;
        const limitNum = limit ? parseInt(limit) : 10;
        const result = await this.postsService.findByTag(tagName, pageNum, limitNum);
        const visiblePosts = await this.visibility.filterPosts(result.posts, req.user?.id);
        const safePage = Math.max(pageNum || 1, 1);
        const safeLimit = Math.min(Math.max(limitNum || 10, 1), 50);

        return {
            ...result,
            posts: visiblePosts,
            total: (safePage - 1) * safeLimit + visiblePosts.length,
            lastPage: visiblePosts.length === safeLimit ? safePage + 1 : safePage,
        };
    }

    @Post('comments/:id/like')
    @UseGuards(JwtAuthGuard)
    async toggleCommentLike(@Param('id') id: string, @Req() req: any) {
        await this.visibility.assertCommentVisible(id, req.user.id);
        return this.postsService.toggleCommentLike(id, req.user.id);
    }

    @Delete('comments/:id')
    @UseGuards(JwtAuthGuard)
    async removeComment(@Param('id') id: string, @Req() req: any) {
        return this.postsService.removeComment(id, req.user.id);
    }

    @Get('comments/:id/replies')
    @UseGuards(OptionalJwtAuthGuard)
    async getReplies(
        @Param('id') id: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Req() req?: any,
    ) {
        const userId = req?.user?.id;
        await this.visibility.assertCommentVisible(id, userId);
        return this.postsService.getReplies(
            id,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 10,
            userId,
        );
    }

    @Post(':id/poll/vote')
    @UseGuards(JwtAuthGuard)
    async votePoll(
        @Req() req: any,
        @Param('id') id: string,
        @Body('optionIds') optionIds: string[],
    ) {
        await this.visibility.assertPostVisible(id, req.user.id);
        return this.postsService.votePoll(id, req.user.id, optionIds);
    }

    @Get(':id')
    @UseGuards(OptionalJwtAuthGuard)
    async findOne(@Param('id') id: string, @Req() req?: any) {
        const userId = req?.user?.id;
        await this.visibility.assertPostVisible(id, userId);

        const ipAddress = req?.ip || req?.connection?.remoteAddress || 'unknown';
        const userAgent = req?.headers?.['user-agent'];
        await this.visibility.trackUniqueView(id, userId, ipAddress, userAgent);

        return this.postsService.findOne(id);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Req() req: any, @Param('id') id: string) {
        return this.postsService.remove(id, req.user.id);
    }

    @Post(':id/like')
    @UseGuards(JwtAuthGuard)
    async toggleLike(@Req() req: any, @Param('id') id: string) {
        await this.visibility.assertPostVisible(id, req.user.id);
        return this.postsService.toggleLike(id, req.user.id);
    }

    @Post(':id/comments')
    @UseGuards(JwtAuthGuard, CommentRateLimitGuard)
    async addComment(
        @Req() req: any,
        @Param('id') id: string,
        @Body() body: CreateCommentDto,
    ) {
        await this.visibility.assertPostVisible(id, req.user.id);
        return this.postsService.addComment(
            id,
            req.user.id,
            body.content,
            body.parentId,
            body.imageUrls,
            body.videoUrls,
        );
    }

    @Get(':id/comments')
    @UseGuards(OptionalJwtAuthGuard)
    async getComments(
        @Param('id') id: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Req() req?: any,
    ) {
        const userId = req?.user?.id;
        await this.visibility.assertPostVisible(id, userId);
        return this.postsService.getComments(
            id,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
            userId,
        );
    }
}
