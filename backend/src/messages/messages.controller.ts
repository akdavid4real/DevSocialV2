import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Delete,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { MessageReactionDto } from './dto/message-reaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  sendMessage(@Req() req: any, @Body() dto: SendMessageDto) {
    return this.messagesService.sendMessage(req.user.id, dto);
  }

  @Post('conversations')
  createConversation(@Req() req: any, @Body() dto: CreateConversationDto) {
    return this.messagesService.getOrCreateConversation(req.user.id, dto.participantId);
  }

  @Get('conversations')
  getConversations(@Req() req: any) {
    return this.messagesService.getConversations(req.user.id);
  }

  @Get('unread-count')
  getUnreadCount(@Req() req: any) {
    return this.messagesService.getUnreadCount(req.user.id);
  }

  @Get(':conversationId')
  getMessages(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.messagesService.getMessages(
      conversationId,
      req.user.id,
      limit ? parseInt(limit) : 50,
      before,
    );
  }

  @Patch(':conversationId/read')
  markAsRead(@Req() req: any, @Param('conversationId') conversationId: string) {
    return this.messagesService.markAsRead(conversationId, req.user.id);
  }

  @Post(':conversationId/:messageId/reactions')
  addReaction(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() dto: MessageReactionDto,
  ) {
    return this.messagesService.addReaction(conversationId, messageId, req.user.id, dto.emoji);
  }

  @Delete(':conversationId/:messageId/reactions')
  removeReaction(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() dto: Partial<MessageReactionDto>,
  ) {
    return this.messagesService.removeReaction(conversationId, messageId, req.user.id, dto.emoji);
  }
}
