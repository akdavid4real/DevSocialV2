import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { EnhanceTextDto, PostContentAssistDto } from './dto/ai-assist.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('posts/summarize')
  summarizePost(@Req() req: any, @Body() dto: PostContentAssistDto) {
    return this.aiService.summarizePost(req.user.id, dto.content);
  }

  @Post('posts/explain')
  explainPost(@Req() req: any, @Body() dto: PostContentAssistDto) {
    return this.aiService.explainPost(req.user.id, dto.content);
  }

  @Post('ai/enhance-text')
  enhanceText(@Req() req: any, @Body() dto: EnhanceTextDto) {
    return this.aiService.enhanceText(req.user.id, dto.content, dto.action);
  }
}
