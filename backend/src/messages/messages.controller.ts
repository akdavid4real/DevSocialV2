import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
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

  /**
   * Send a message to another user
   */
  @Post()
  sendMessage(@Req() req: any, @Body() dto: SendMessageDto) {
    return this.messagesService.sendMessage(req.user.id, dto);
  }

  /**
   * Create or get a conversation with another user
   */
  @Post('conversations')
  createConversation(@Req() req: any, @Body() dto: CreateConversationDto) {
    return this.messagesService.getOrCreateConversation(req.user.id, dto.participantId);
  }

  /**
   * Get all conversations for the current user
   */
  @Get('conversations')
  getConversations(@Req() req: any) {
    return this.messagesService.getConversations(req.user.id);
  }

  /**
   * Get total unread message count
   */
  @Get('unread-count')
  getUnreadCount(@Req() req: any) {
    return this.messagesService.getUnreadCount(req.user.id);
  }

  /**
   * Get messages for a specific conversation
   */
  @Get(':conversationId')
  getMessages(@Req() req: any, @Param('conversationId') conversationId: string) {
    return this.messagesService.getMessages(conversationId, req.user.id);
  }

  /**
   * Mark all messages in a conversation as read
   */
  @Patch(':conversationId/read')
  markAsRead(@Req() req: any, @Param('conversationId') conversationId: string) {
    return this.messagesService.markAsRead(conversationId, req.user.id);
  }

  /**
   * Add or replace the current user's reaction on a message
   */
  @Post(':conversationId/:messageId/reactions')
  addReaction(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() dto: MessageReactionDto,
  ) {
    return this.messagesService.addReaction(conversationId, messageId, req.user.id, dto.emoji);
  }

  /**
   * Remove the current user's reaction from a message
   */
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
