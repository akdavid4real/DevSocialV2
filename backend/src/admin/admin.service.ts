import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SupabaseService } from '../common/supabase/supabase.service';
import {
  UpdateUserRoleDto,
  BanUserDto,
  ResolveReportDto,
  GetReportsQueryDto,
  UpdatePostStatusDto,
  GetPostsQueryDto,
  DateRangeDto,
  UpdateUserXpDto,
  XpAdjustmentAction,
  AdminResetPasswordDto,
  GetAiLogsQueryDto,
} from './dto/admin.dto';
import { UserRole, ReportStatus, PostStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  // ============= ANALYTICS =============
  async getDashboardStats(dateRange?: DateRangeDto) {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Use raw SQL to get ALL stats in ONE query - way more efficient!
    const stats = await this.prisma.$queryRaw<Array<{
      total_users: bigint;
      active_users: bigint;
      blocked_users: bigint;
      new_users_today: bigint;
      total_posts: bigint;
      posts_today: bigint;
      total_comments: bigint;
      pending_reports: bigint;
    }>>`
      SELECT
        (SELECT COUNT(*) FROM "User") as total_users,
        (SELECT COUNT(*) FROM "User" WHERE "lastActive" >= ${weekAgo}) as active_users,
        (SELECT COUNT(*) FROM "User" WHERE "isBlocked" = true) as blocked_users,
        (SELECT COUNT(*) FROM "User" WHERE "createdAt" >= ${todayStart}) as new_users_today,
        (SELECT COUNT(*) FROM "Post") as total_posts,
        (SELECT COUNT(*) FROM "Post" WHERE "createdAt" >= ${todayStart}) as posts_today,
        (SELECT COUNT(*) FROM "Comment") as total_comments,
        (SELECT COUNT(*) FROM "Report" WHERE status = 'PENDING') as pending_reports
    `;

    const result = stats[0];

    return {
      users: {
        total: Number(result.total_users),
        active: Number(result.active_users),
        blocked: Number(result.blocked_users),
        newToday: Number(result.new_users_today),
      },
      content: {
        totalPosts: Number(result.total_posts),
        totalComments: Number(result.total_comments),
        postsToday: Number(result.posts_today),
      },
      moderation: {
        pendingReports: Number(result.pending_reports),
      },
    };
  }

  async getUserGrowth(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const users = await this.prisma.user.groupBy({
      by: ['createdAt'],
      _count: true,
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    });

    return users;
  }

  async getAiLogs(query: GetAiLogsQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;
    const where = {
      ...(query.service ? { service: query.service } : {}),
      ...(query.taskType ? { taskType: query.taskType } : {}),
    };

    const [logs, total, groupedStats] = await Promise.all([
      this.prisma.aiLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiLog.count({ where }),
      this.prisma.aiLog.groupBy({
        by: ['service', 'taskType'],
        where,
        _count: { _all: true },
        _avg: { executionTime: true },
      }),
    ]);

    const userIds = [...new Set(logs.map((log) => log.userId).filter((id): id is string => Boolean(id)))];
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true, displayName: true, avatar: true },
        })
      : [];
    const usersById = new Map(users.map((user) => [user.id, user]));

    return {
      data: logs.map((log) => ({
        ...log,
        user: log.userId ? usersById.get(log.userId) || null : null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: groupedStats.map((stat) => ({
        service: stat.service,
        taskType: stat.taskType,
        count: stat._count._all,
        avgExecutionTime: Math.round(stat._avg.executionTime || 0),
      })),
    };
  }

  // ============= USER MANAGEMENT =============
  async getAllUsers(page: number = 1, limit: number = 20, search?: string) {
    const skip = (page - 1) * limit;

    const where = search ? {
      OR: [
        { username: { contains: search, mode: 'insensitive' as any } },
        { email: { contains: search, mode: 'insensitive' as any } },
        { displayName: { contains: search, mode: 'insensitive' as any } },
      ],
    } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          role: true,
          isBlocked: true,
          isVerified: true,
          createdAt: true,
          lastActive: true,
          points: true,
          level: true,
          followersCount: true,
          followingCount: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        posts: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            createdAt: true,
            likesCount: true,
            commentsCount: true,
            status: true,
          },
        },
        _count: {
          select: {
            posts: true,
            comments: true,
            likes: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUserRole(userId: string, dto: UpdateUserRoleDto, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role: dto.role },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        adminId,
        action: 'USER_ROLE_CHANGE',
        targetType: 'USER',
        targetId: userId,
        reason: `Role changed from ${user.role} to ${dto.role}`,
      },
    });

    return updatedUser;
  }

  async banUser(userId: string, dto: BanUserDto, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Cannot ban an admin user');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: true },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        adminId,
        action: 'USER_BAN',
        targetType: 'USER',
        targetId: userId,
        reason: dto.reason,
        metadata: { permanent: dto.permanent },
      },
    });

    return updatedUser;
  }

  async unbanUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: false },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        adminId,
        action: 'USER_UNBAN',
        targetType: 'USER',
        targetId: userId,
      },
    });

    return updatedUser;
  }

  async updateUserXp(userId: string, dto: UpdateUserXpDto, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        points: true,
        level: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const nextPoints = this.calculateAdjustedXp(user.points, dto.amount, dto.action);
    const nextLevel = Math.floor(nextPoints / 100) + 1;
    const xpDelta = nextPoints - user.points;

    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          points: nextPoints,
          level: nextLevel,
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          points: true,
          level: true,
        },
      }),
      this.prisma.xpLog.create({
        data: {
          userId,
          type: 'ADMIN_ADJUSTMENT',
          xpAmount: xpDelta,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          adminId,
          action: 'USER_XP_ADJUSTMENT',
          targetType: 'USER',
          targetId: userId,
          reason: dto.reason || `XP ${dto.action}: ${dto.amount}`,
          metadata: {
            previousPoints: user.points,
            nextPoints,
            previousLevel: user.level,
            nextLevel,
            amount: dto.amount,
            action: dto.action,
            xpDelta,
          },
        },
      }),
    ]);

    return {
      success: true,
      message: 'XP updated successfully',
      data: {
        points: updatedUser.points,
        level: updatedUser.level,
        xpDelta,
        user: updatedUser,
      },
    };
  }

  private calculateAdjustedXp(currentPoints: number, amount: number, action: XpAdjustmentAction) {
    if (action === XpAdjustmentAction.ADD) {
      return currentPoints + amount;
    }

    if (action === XpAdjustmentAction.REMOVE) {
      return Math.max(0, currentPoints - amount);
    }

    return amount;
  }

  async resetUserPassword(userId: string, dto: AdminResetPasswordDto, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        supabaseAuthId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { error } = await this.supabase.client.auth.admin.updateUserById(
      user.supabaseAuthId,
      { password: dto.newPassword },
    );

    if (error) {
      throw new InternalServerErrorException('Failed to reset user password');
    }

    await this.prisma.auditLog.create({
      data: {
        adminId,
        action: 'USER_PASSWORD_RESET',
        targetType: 'USER',
        targetId: userId,
        reason: `Password reset for @${user.username}`,
      },
    });

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }

  async deleteUser(userId: string, adminId: string) {
    if (userId === adminId) {
      throw new BadRequestException('Admins cannot delete their own account from user management');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        supabaseAuthId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Admin users cannot be deleted from user management');
    }

    await this.prisma.$transaction(async (tx) => {
      const [userPosts, userProjects, userBotAccounts] = await Promise.all([
        tx.post.findMany({ where: { authorId: userId }, select: { id: true } }),
        tx.project.findMany({ where: { authorId: userId }, select: { id: true } }),
        tx.botAccount.findMany({ where: { userId }, select: { id: true } }),
      ]);
      const postIds = userPosts.map((post) => post.id);
      const projectIds = userProjects.map((project) => project.id);
      const botAccountIds = userBotAccounts.map((account) => account.id);

      await tx.auditLog.create({
        data: {
          adminId,
          action: 'USER_DELETE',
          targetType: 'USER',
          targetId: userId,
          reason: `Deleted @${user.username}`,
        },
      });

      if (postIds.length > 0 || projectIds.length > 0) {
        await tx.auditLog.deleteMany({
          where: {
            OR: [
              ...(postIds.length > 0 ? [{ targetId: { in: postIds } }] : []),
              ...(projectIds.length > 0 ? [{ targetId: { in: projectIds } }] : []),
            ],
          },
        });
      }

      await tx.message.deleteMany({
        where: {
          OR: [
            { senderId: userId },
            { receiverId: userId },
          ],
        },
      });
      await tx.conversationParticipant.deleteMany({ where: { userId } });
      await tx.conversation.deleteMany({ where: { participants: { none: {} } } });

      await tx.notification.deleteMany({
        where: {
          OR: [
            { recipientId: userId },
            { senderId: userId },
          ],
        },
      });
      await tx.userMention.deleteMany({
        where: {
          OR: [
            { mentionerId: userId },
            { mentionedId: userId },
          ],
        },
      });
      await tx.follow.deleteMany({
        where: {
          OR: [
            { followerId: userId },
            { followingId: userId },
          ],
        },
      });
      await tx.block.deleteMany({
        where: {
          OR: [
            { blockerId: userId },
            { blockedId: userId },
          ],
        },
      });
      await tx.referral.deleteMany({
        where: {
          OR: [
            { referrerId: userId },
            { referredId: userId },
          ],
        },
      });
      await tx.report.deleteMany({
        where: {
          OR: [
            { reporterId: userId },
            { reportedUserId: userId },
            { reviewedById: userId },
          ],
        },
      });
      await tx.feedbackComment.deleteMany({ where: { userId } });
      await tx.feedback.deleteMany({ where: { userId } });
      await tx.activity.deleteMany({ where: { userId } });
      await tx.view.deleteMany({ where: { userId } });
      await tx.aiLog.updateMany({
        where: { userId },
        data: { userId: null },
      });
      await tx.challengeParticipation.deleteMany({ where: { userId } });
      await tx.missionProgress.deleteMany({ where: { userId } });
      await tx.leaderboardSnapshot.deleteMany({ where: { userId } });
      await tx.userStats.deleteMany({ where: { userId } });
      if (botAccountIds.length > 0) {
        await tx.botActivity.deleteMany({ where: { botAccountId: { in: botAccountIds } } });
      }
      await tx.botAccount.deleteMany({ where: { userId } });
      await tx.communityMember.deleteMany({ where: { userId } });
      await tx.knowledgeEntry.deleteMany({ where: { authorId: userId } });
      await tx.project.deleteMany({ where: { authorId: userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    const { error } = await this.supabase.client.auth.admin.deleteUser(user.supabaseAuthId);
    if (error) {
      throw new InternalServerErrorException('User deleted locally, but auth deletion failed');
    }

    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  // ============= REPORT MANAGEMENT =============
  async getReports(query: GetReportsQueryDto) {
    const { status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.report.count({ where }),
    ]);

    const reporterIds = [...new Set(reports.map((report) => report.reporterId))];
    const reportedUserIds = [...new Set(reports.map((report) => report.reportedUserId))];
    const reportedPostIds = [...new Set(reports.map((report) => report.reportedPostId))];

    const [reporters, reportedUsers, reportedPosts] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: reporterIds } },
        select: { id: true, username: true, displayName: true, avatar: true, level: true },
      }),
      this.prisma.user.findMany({
        where: { id: { in: reportedUserIds } },
        select: { id: true, username: true, displayName: true, avatar: true, level: true, isBlocked: true },
      }),
      this.prisma.post.findMany({
        where: { id: { in: reportedPostIds } },
        select: {
          id: true,
          content: true,
          status: true,
          createdAt: true,
          author: {
            select: { id: true, username: true, displayName: true, avatar: true },
          },
        },
      }),
    ]);

    const reportersById = new Map(reporters.map((user) => [user.id, user]));
    const reportedUsersById = new Map(reportedUsers.map((user) => [user.id, user]));
    const reportedPostsById = new Map(reportedPosts.map((post) => [post.id, post]));

    return {
      data: reports.map((report) => ({
        ...report,
        reporter: reportersById.get(report.reporterId) || null,
        reportedUser: reportedUsersById.get(report.reportedUserId) || null,
        reportedPost: reportedPostsById.get(report.reportedPostId) || null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getReportDetails(reportId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Fetch related data based on the report
    const [reportedUser, reportedPost, reporter] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: report.reportedUserId },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          isBlocked: true,
        },
      }),
      report.reportedPostId ? this.prisma.post.findUnique({
        where: { id: report.reportedPostId },
        select: {
          id: true,
          content: true,
          status: true,
          createdAt: true,
          author: {
            select: {
              username: true,
            },
          },
        },
      }) : null,
      this.prisma.user.findUnique({
        where: { id: report.reporterId },
        select: {
          id: true,
          username: true,
        },
      }),
    ]);

    return {
      ...report,
      reportedUser,
      reportedPost,
      reporter,
    };
  }

  async resolveReport(reportId: string, dto: ResolveReportDto, adminId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const updatedReport = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: dto.status,
        action: dto.action,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });

    if (dto.action === 'POST_REMOVED') {
      await this.prisma.post.update({
        where: { id: report.reportedPostId },
        data: { status: PostStatus.BLOCKED },
      }).catch(() => null);
    }

    if (dto.action === 'USER_BANNED' || dto.action === 'USER_SUSPENDED') {
      await this.prisma.user.update({
        where: { id: report.reportedUserId },
        data: { isBlocked: true },
      }).catch(() => null);
    }

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        adminId,
        action: 'REPORT_RESOLVED',
        targetType: 'REPORT',
        targetId: reportId,
        reason: dto.reviewNote,
        metadata: { action: dto.action, status: dto.status },
      },
    });

    return updatedReport;
  }

  // ============= CONTENT MODERATION =============
  async getPosts(query: GetPostsQueryDto) {
    const { status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      data: posts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updatePostStatus(postId: string, dto: UpdatePostStatusDto, adminId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: { status: dto.status },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        adminId,
        action: 'POST_STATUS_UPDATE',
        targetType: 'POST',
        targetId: postId,
        reason: dto.reason,
        metadata: { oldStatus: post.status, newStatus: dto.status },
      },
    });

    return updatedPost;
  }

  async deletePost(postId: string, reason: string, adminId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    await this.prisma.post.delete({
      where: { id: postId },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        adminId,
        action: 'POST_DELETE',
        targetType: 'POST',
        targetId: postId,
        reason,
      },
    });

    return { message: 'Post deleted successfully' };
  }

  // ============= AUDIT LOGS =============
  async getAuditLogs(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count(),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
