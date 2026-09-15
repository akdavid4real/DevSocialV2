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
    const usage = await this.consumeUsage(userId, 'summaries');
    const summary = this.buildSummary(content);
    await this.logAssist(userId, 'post_summarize', content, summary, start);

    return {
      summary,
      remainingUsage: usage.remaining,
      monthlyLimit: usage.limit,
    };
  }

  async explainPost(userId: string, content: string) {
    const start = Date.now();
    const usage = await this.consumeUsage(userId, 'explanations');
    const explanation = this.buildExplanation(content);
    await this.logAssist(userId, 'post_explain', content, explanation, start);

    return {
      explanation,
      remainingUsage: usage.remaining,
      monthlyLimit: usage.limit,
    };
  }

  async enhanceText(userId: string, content: string, action: EnhancementAction) {
    const start = Date.now();
    const usage = await this.consumeUsage(userId, 'enhancements');
    const enhanced = this.buildEnhancement(content, action);
    await this.logAssist(userId, `text_enhance_${action}`, content, enhanced, start);

    return {
      enhanced,
      remainingUsage: usage.remaining,
      monthlyLimit: usage.limit,
    };
  }

  private async consumeUsage(userId: string, key: UsageKey) {
    const lockKey = `ai-usage:${userId}:${key}`;

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          aiUsage: true,
          isPremium: true,
        },
      });

      if (!user) throw new BadRequestException('User not found');

      const aiUsage = this.normalizeUsage(user.aiUsage);
      const limit = this.getLimit(key, user.isPremium);
      const bucket = this.getCurrentBucket(aiUsage, key, limit);
      if (bucket.used >= limit) {
        throw new HttpException(
          `Monthly limit of ${limit} AI ${key} reached`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      const nextUsed = bucket.used + 1;
      const nextUsage = {
        ...aiUsage,
        resetsOn: this.getNextResetDate(),
        [key]: {
          ...bucket,
          used: nextUsed,
          limit,
          period: this.getCurrentPeriod(),
        },
      };

      await tx.user.update({
        where: { id: userId },
        data: { aiUsage: nextUsage as Prisma.InputJsonValue },
      });

      return {
        limit,
        remaining: Math.max(limit - nextUsed, 0),
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
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
