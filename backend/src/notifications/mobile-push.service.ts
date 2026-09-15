import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../common/prisma/prisma.service';

type PushStore = {
  web?: Record<string, any> | null;
  expoTokens: string[];
};

@Injectable()
export class MobilePushService {
  private readonly logger = new Logger(MobilePushService.name);

  constructor(private readonly prisma: PrismaService) {}

  async register(userId: string, token: string) {
    if (!this.isExpoToken(token)) throw new Error('Invalid Expo push token');
    const store = await this.getStore(userId);
    store.expoTokens = [token, ...store.expoTokens.filter((item) => item !== token)].slice(0, 5);
    await this.saveStore(userId, store);
    return { registered: true };
  }

  async remove(userId: string, token: string) {
    const store = await this.getStore(userId);
    store.expoTokens = store.expoTokens.filter((item) => item !== token);
    await this.saveStore(userId, store);
    return { registered: false };
  }

  async setWeb(userId: string, web: Record<string, any>) {
    const store = await this.getStore(userId);
    store.web = web;
    await this.saveStore(userId, store);
    return store;
  }

  async removeWeb(userId: string) {
    const store = await this.getStore(userId);
    store.web = null;
    await this.saveStore(userId, store);
    return store;
  }

  normalize(raw: unknown): PushStore {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { web: null, expoTokens: [] };
    }

    const value = raw as Record<string, any>;
    if (typeof value.endpoint === 'string') {
      return { web: value, expoTokens: [] };
    }

    return {
      web: value.web && typeof value.web === 'object' && !Array.isArray(value.web) ? value.web : null,
      expoTokens: Array.isArray(value.expoTokens)
        ? value.expoTokens.filter((token): token is string => typeof token === 'string' && this.isExpoToken(token)).slice(0, 5)
        : [],
    };
  }

  async sendExpo(
    userId: string,
    rawStore: unknown,
    payload: { title: string; body: string; url: string },
  ) {
    const store = this.normalize(rawStore);
    if (store.expoTokens.length === 0) return;

    const messages = store.expoTokens.map((token) => ({
      to: token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: { url: payload.url },
      channelId: 'default',
    }));

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(process.env.EXPO_PUSH_ACCESS_TOKEN
            ? { Authorization: `Bearer ${process.env.EXPO_PUSH_ACCESS_TOKEN}` }
            : {}),
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        this.logger.warn(`Expo push request failed for user ${userId}: HTTP ${response.status}`);
        return;
      }

      const result: any = await response.json().catch(() => null);
      const tickets = Array.isArray(result?.data) ? result.data : result?.data ? [result.data] : [];
      const invalidTokens = new Set<string>();
      tickets.forEach((ticket: any, index: number) => {
        if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
          const token = store.expoTokens[index];
          if (token) invalidTokens.add(token);
        }
      });

      if (invalidTokens.size > 0) {
        store.expoTokens = store.expoTokens.filter((token) => !invalidTokens.has(token));
        await this.saveStore(userId, store);
      }
    } catch (error: any) {
      this.logger.warn(`Expo push delivery failed for user ${userId}: ${error?.message || 'unknown error'}`);
    }
  }

  private async getStore(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pushSubscription: true },
    });
    return this.normalize(user?.pushSubscription);
  }

  private async saveStore(userId: string, store: PushStore) {
    const empty = !store.web && store.expoTokens.length === 0;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        pushSubscription: empty
          ? Prisma.JsonNull
          : ({ web: store.web || null, expoTokens: store.expoTokens } as Prisma.InputJsonValue),
      },
    });
  }

  private isExpoToken(token: string) {
    return /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(token);
  }
}
