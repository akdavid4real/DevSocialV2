import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AiService as AiProvider, Prisma } from '../generated/prisma';
import { PrismaService } from '../common/prisma/prisma.service';

type UsageKey = 'summaries' | 'explanations' | 'enhancements';
type EnhancementAction = 'professional' | 'casual' | 'funny' | 'hashtags';

type UsageBucket = {
  used: number;
  limit: number;
  period: string;
};

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  async summarizePost(userId: string, content: string) {
    const start = Date.now();
    const user = await this.assertUsageAvailable(userId, 'summaries');
    const summary = this.buildSummary(content);

    await this.recordUsage(user.id, 'summaries', user.aiUsage, user.limit);
    await this.logAssist(user.id, 'post_summarize', content, summary, start);

    return {
      summary,
      remainingUsage: Math.max(user.limit - user.used - 1, 0),
      monthlyLimit: user.limit,
    };
  }

  async explainPost(userId: string, content: string) {
    const start = Date.now();
    const user = await this.assertUsageAvailable(userId, 'explanations');
    const explanation = this.buildExplanation(content);

    await this.recordUsage(user.id, 'explanations', user.aiUsage, user.limit);
    await this.logAssist(user.id, 'post_explain', content, explanation, start);

    return {
      explanation,
      remainingUsage: Math.max(user.limit - user.used - 1, 0),
      dailyLimit: user.limit,
    };
  }

  async enhanceText(userId: string, content: string, action: EnhancementAction) {
    const start = Date.now();
    const user = await this.assertUsageAvailable(userId, 'enhancements');
    const enhanced = this.buildEnhancement(content, action);

    await this.recordUsage(user.id, 'enhancements', user.aiUsage, user.limit);
    await this.logAssist(user.id, `text_enhance_${action}`, content, enhanced, start);

    return {
      enhanced,
      remainingUsage: Math.max(user.limit - user.used - 1, 0),
      monthlyLimit: user.limit,
    };
  }

  private async assertUsageAvailable(userId: string, key: UsageKey) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        aiUsage: true,
        isPremium: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const aiUsage = this.normalizeUsage(user.aiUsage);
    const limit = this.getLimit(key, user.isPremium);
    const bucket = this.getCurrentBucket(aiUsage, key, limit);

    if (bucket.used >= limit) {
      throw new HttpException(`Monthly limit of ${limit} AI ${key} reached`, HttpStatus.TOO_MANY_REQUESTS);
    }

    return {
      id: user.id,
      aiUsage,
      limit,
      used: bucket.used,
    };
  }

  private async recordUsage(userId: string, key: UsageKey, currentUsage: Record<string, any>, limit: number) {
    const period = this.getCurrentPeriod();
    const nextUsage = {
      ...currentUsage,
      resetsOn: this.getNextResetDate(),
      [key]: {
        ...this.getCurrentBucket(currentUsage, key, limit),
        used: this.getCurrentBucket(currentUsage, key, limit).used + 1,
        limit,
        period,
      },
    };

    await this.prisma.user.update({
      where: { id: userId },
      data: { aiUsage: nextUsage as Prisma.InputJsonValue },
    });
  }

  private async logAssist(userId: string, taskType: string, input: string, output: string, start: number) {
    await this.prisma.aiLog.create({
      data: {
        service: AiProvider.GEMINI,
        aiModel: 'local-deterministic-assist',
        taskType,
        inputLength: input.length,
        outputSummary: output.slice(0, 500),
        userId,
        executionTime: Date.now() - start,
      },
    });
  }

  private normalizeUsage(rawUsage: unknown) {
    return rawUsage && typeof rawUsage === 'object' && !Array.isArray(rawUsage)
      ? rawUsage as Record<string, any>
      : {};
  }

  private getCurrentBucket(usage: Record<string, any>, key: UsageKey, limit: number): UsageBucket {
    const period = this.getCurrentPeriod();
    const bucket = usage[key];

    if (!bucket || typeof bucket !== 'object' || bucket.period !== period) {
      return { used: 0, limit, period };
    }

    return {
      used: typeof bucket.used === 'number' ? bucket.used : 0,
      limit,
      period,
    };
  }

  private getLimit(key: UsageKey, isPremium: boolean) {
    if (isPremium) return 100;
    return key === 'explanations' ? 10 : 5;
  }

  private getCurrentPeriod() {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private getNextResetDate() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
  }

  private buildSummary(content: string) {
    const normalized = this.normalizeContent(content);
    const sentences = normalized.match(/[^.!?]+[.!?]*/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [];
    const summary = sentences.slice(0, 2).join(' ');
    return this.truncate(summary || normalized, 280);
  }

  private buildExplanation(content: string) {
    const normalized = this.normalizeContent(content);
    const topics = this.extractTopics(normalized);
    const mainPoint = this.truncate(normalized, 180);
    const topicText = topics.length ? ` It seems to focus on ${topics.join(', ')}.` : '';
    return `In plain terms, this post is saying: ${mainPoint}${topicText}`;
  }

  private buildEnhancement(content: string, action: EnhancementAction) {
    const normalized = this.normalizeContent(content);

    if (action === 'hashtags') {
      const tags = this.extractTopics(normalized)
        .slice(0, 5)
        .map((topic) => `#${topic.replace(/[^a-z0-9]/gi, '')}`)
        .filter((tag) => tag.length > 1);
      return tags.length ? `${normalized}\n\n${tags.join(' ')}` : normalized;
    }

    if (action === 'professional') {
      return `Sharing an update: ${this.sentenceCase(normalized)}`;
    }

    if (action === 'funny') {
      return `${this.sentenceCase(normalized)} Small bug-fix for the mood: we survived the build.`;
    }

    return this.sentenceCase(normalized);
  }

  private normalizeContent(content: string) {
    return content.replace(/\s+/g, ' ').trim();
  }

  private truncate(content: string, maxLength: number) {
    if (content.length <= maxLength) return content;
    return `${content.slice(0, maxLength - 3).trim()}...`;
  }

  private sentenceCase(content: string) {
    if (!content) return content;
    return `${content.charAt(0).toUpperCase()}${content.slice(1)}`;
  }

  private extractTopics(content: string) {
    const explicitTags = content.match(/#[a-zA-Z0-9_]+/g)?.map((tag) => tag.slice(1).toLowerCase()) || [];
    const words = content
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[^a-z0-9#\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !COMMON_WORDS.has(word));

    return [...new Set([...explicitTags, ...words])].slice(0, 6);
  }
}

const COMMON_WORDS = new Set([
  'about',
  'after',
  'also',
  'been',
  'being',
  'build',
  'from',
  'have',
  'into',
  'just',
  'like',
  'more',
  'some',
  'that',
  'their',
  'this',
  'with',
  'what',
  'when',
  'will',
  'your',
]);
