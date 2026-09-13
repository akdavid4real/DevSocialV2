import { Module, NestModule, MiddlewareConsumer, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { SupabaseModule } from './common/supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AffiliationsModule } from './affiliations/affiliations.module';
import { PostsModule } from './posts/posts.module';
import { OnboardingModule } from './users/onboarding/onboarding.module';
import { StorageModule } from './common/storage/storage.module';
import { CommonModule } from './common/common.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MessagesModule } from './messages/messages.module';
import { FollowModule } from './follow/follow.module';
import { TrendingModule } from './trending/trending.module';
import { AdminModule } from './admin/admin.module';
import { CommunitiesModule } from './communities/communities.module';
import { ProjectsModule } from './projects/projects.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { FeedbackModule } from './feedback/feedback.module';
import { ReportsModule } from './reports/reports.module';
import { ChallengesModule } from './challenges/challenges.module';
import { ReferralsModule } from './referrals/referrals.module';
import { MissionsModule } from './missions/missions.module';
import { SearchModule } from './search/search.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    SupabaseModule,
    AuthModule,
    OnboardingModule,
    UsersModule,
    AffiliationsModule,
    PostsModule,
    StorageModule,
    CommonModule,
    NotificationsModule,
    MessagesModule,
    FollowModule,
    TrendingModule,
    AdminModule,
    CommunitiesModule,
    ProjectsModule,
    KnowledgeModule,
    FeedbackModule,
    ReportsModule,
    ChallengesModule,
    ReferralsModule,
    MissionsModule,
    SearchModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: any, res: any, next: () => void) => {
        const logger = new Logger('HTTP');
        const { method, originalUrl } = req;
        res.on('finish', () => {
          const { statusCode } = res;
          logger.log(`${method} ${originalUrl} ${statusCode}`);
        });
        next();
      })
      .forRoutes('*');
  }
}
