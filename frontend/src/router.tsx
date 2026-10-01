import { Suspense, lazy } from "react";
import { Outlet, createBrowserRouter, useParams } from "react-router-dom";

import Providers from "@/providers";
import AuthenticatedLayout from "@/app/(authenticated)/layout";
import SettingsLayout from "@/app/(authenticated)/settings/layout";
import AdminLayout from "@/app/admin/layout";
import UnavailableFeature from "@/components/UnavailableFeature";

/* Auth ------------------------------------------------------------------- */
const LoginPage = lazy(() => import("@/app/auth/login/page"));
const SignupPage = lazy(() => import("@/app/auth/signup/page"));
const VerifyPage = lazy(() => import("@/app/auth/verify/page"));
const ForgotPasswordPage = lazy(() => import("@/app/auth/forgot-password/page"));
const ResetPasswordPage = lazy(() => import("@/app/auth/reset-password/page"));

/* Public ----------------------------------------------------------------- */
const PublicOnboardingPage = lazy(() => import("@/app/onboarding/page"));
const ApiDocsPage = lazy(() => import("@/app/api-docs/page"));
const TermsPage = lazy(() => import("@/app/terms/page"));
const PrivacyPage = lazy(() => import("@/app/privacy/page"));
const OfflinePage = lazy(() => import("@/app/offline/page"));
const TestPushPage = lazy(() => import("@/app/test-push/page"));

/* Feed and social -------------------------------------------------------- */
const HomePage = lazy(() => import("@/app/(authenticated)/page"));
const MePage = lazy(() => import("@/app/(authenticated)/me/page"));
const PublicProfilePage = lazy(() => import("@/app/(authenticated)/[username]/page"));
const PostDetailPage = lazy(() => import("@/app/(authenticated)/posts/[id]/page"));
const TagPage = lazy(() => import("@/app/(authenticated)/tag/[tagName]/page"));
const SearchPage = lazy(() => import("@/app/(authenticated)/search/page"));
const TrendingPage = lazy(() => import("@/app/(authenticated)/trending/page"));
const MessagesPage = lazy(() => import("@/app/(authenticated)/messages/page"));
const NotificationsPage = lazy(() => import("@/app/(authenticated)/notifications/page"));
const ConfessPage = lazy(() => import("@/app/(authenticated)/confess/page"));

/* Communities ------------------------------------------------------------ */
const CommunitiesPage = lazy(() => import("@/app/(authenticated)/communities/page"));
const CreateCommunityPage = lazy(() => import("@/app/(authenticated)/communities/create/page"));
const CommunityDetailPage = lazy(() => import("@/app/(authenticated)/communities/[idOrSlug]/page"));

/* Projects --------------------------------------------------------------- */
const ProjectsPage = lazy(() => import("@/app/(authenticated)/projects/page"));
const CreateProjectPage = lazy(() => import("@/app/(authenticated)/projects/create/page"));
const MyProjectsPage = lazy(() => import("@/app/(authenticated)/projects/my/page"));
const ProjectDetailPage = lazy(() => import("@/app/(authenticated)/projects/[id]/page"));

/* Knowledge bank --------------------------------------------------------- */
const KnowledgeBankPage = lazy(() => import("@/app/(authenticated)/knowledge-bank/page"));
const CreateKnowledgeEntryPage = lazy(() => import("@/app/(authenticated)/knowledge-bank/create/page"));
const KnowledgeEntryDetailPage = lazy(() => import("@/app/(authenticated)/knowledge-bank/[id]/page"));

/* Feedback --------------------------------------------------------------- */
const FeedbackPage = lazy(() => import("@/app/(authenticated)/feedback/page"));
const CreateFeedbackPage = lazy(() => import("@/app/(authenticated)/feedback/create/page"));
const FeedbackDetailPage = lazy(() => import("@/app/(authenticated)/feedback/[id]/page"));

/* Career paths ----------------------------------------------------------- */
const CareerPathsPage = lazy(() => import("@/app/(authenticated)/career-paths/page"));
const CareerPathDetailPage = lazy(() => import("@/app/(authenticated)/career-paths/[pathId]/page"));
const CareerModulePage = lazy(() => import("@/app/(authenticated)/career-paths/[pathId]/[moduleId]/page"));

/* Gamification ----------------------------------------------------------- */
const ChallengesPage = lazy(() => import("@/app/(authenticated)/challenges/page"));
const LeaderboardPage = lazy(() => import("@/app/(authenticated)/leaderboard/page"));
const ReferralsPage = lazy(() => import("@/app/(authenticated)/referrals/page"));
const ModerationPage = lazy(() => import("@/app/(authenticated)/moderation/page"));

/* Settings --------------------------------------------------------------- */
const AccountSettingsPage = lazy(() => import("@/app/(authenticated)/settings/account/page"));
const AiUsageSettingsPage = lazy(() => import("@/app/(authenticated)/settings/ai-usage/page"));
const AppearanceSettingsPage = lazy(() => import("@/app/(authenticated)/settings/appearance/page"));
const BlockedUsersSettingsPage = lazy(() => import("@/app/(authenticated)/settings/blocked-users/page"));
const NotificationsSettingsPage = lazy(() => import("@/app/(authenticated)/settings/notifications/page"));
const PrivacySettingsPage = lazy(() => import("@/app/(authenticated)/settings/privacy/page"));
const ProfileSettingsPage = lazy(() => import("@/app/(authenticated)/settings/profile/page"));
const SecuritySettingsPage = lazy(() => import("@/app/(authenticated)/settings/security/page"));

/* Analytics -------------------------------------------------------------- */
const AnalyticsDashboardPage = lazy(() => import("@/app/analytics/page"));
const AnalyticsContentPage = lazy(() => import("@/app/analytics/content/page"));
const AnalyticsGrowthPage = lazy(() => import("@/app/analytics/growth/page"));
const AnalyticsRealtimePage = lazy(() => import("@/app/analytics/realtime/page"));
const AnalyticsUsersPage = lazy(() => import("@/app/analytics/users/page"));

/* Admin ------------------------------------------------------------------ */
const AdminDashboardPage = lazy(() => import("@/app/admin/page"));
const AdminAiLogsPage = lazy(() => import("@/app/admin/ai-logs/page"));
const AdminAuditPage = lazy(() => import("@/app/admin/audit/page"));
const AdminPostsPage = lazy(() => import("@/app/admin/posts/page"));
const AdminReportsPage = lazy(() => import("@/app/admin/reports/page"));
const AdminUsersPage = lazy(() => import("@/app/admin/users/page"));
const AdminRolesPage = lazy(() => import("@/app/admin/roles/page"));

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="animate-pulse text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/60">
        Loading...
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This DevSocial route has not been migrated yet.
        </p>
      </div>
    </div>
  );
}

/**
 * Providers live inside the router so that context consumers (auth-context in
 * particular) can use navigation hooks.
 */
function RootShell() {
  return (
    <Providers>
      <Outlet />
    </Providers>
  );
}

function PublicShell() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Outlet />
    </Suspense>
  );
}

function AuthenticatedShell() {
  return (
    <AuthenticatedLayout>
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </AuthenticatedLayout>
  );
}

function SettingsShell() {
  return (
    <SettingsLayout>
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </SettingsLayout>
  );
}

function AdminShell() {
  return (
    <AdminLayout>
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </AdminLayout>
  );
}

/**
 * `/@someone` is a profile. Matching bare `:username` would otherwise swallow
 * every unknown top-level path, so anything without the `@` is a 404.
 */
function UsernameRoute() {
  const { username } = useParams();
  return username?.startsWith("@") ? <PublicProfilePage /> : <NotFoundPage />;
}

export const router = createBrowserRouter([
  {
    element: <RootShell />,
    children: [
      {
        element: <PublicShell />,
        children: [
          { path: "/auth/login", element: <LoginPage /> },
          { path: "/login", element: <LoginPage /> },
          { path: "/auth/signup", element: <SignupPage /> },
          { path: "/register", element: <SignupPage /> },
          { path: "/auth/verify", element: <VerifyPage /> },
          { path: "/auth/forgot-password", element: <ForgotPasswordPage /> },
          { path: "/auth/reset-password", element: <ResetPasswordPage /> },
          { path: "/onboarding", element: <PublicOnboardingPage /> },
          { path: "/api-docs", element: <ApiDocsPage /> },
          { path: "/terms", element: <TermsPage /> },
          { path: "/privacy", element: <PrivacyPage /> },
          { path: "/offline", element: <OfflinePage /> },
          { path: "/test-push", element: <TestPushPage /> },
        ],
      },
      {
        path: "/admin",
        element: <AdminShell />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: "ai-logs", element: <AdminAiLogsPage /> },
          { path: "audit", element: <AdminAuditPage /> },
          { path: "posts", element: <AdminPostsPage /> },
          { path: "reports", element: <AdminReportsPage /> },
          { path: "roles", element: <AdminRolesPage /> },
          { path: "bots", element: <UnavailableFeature title="Bot management is unavailable" description="Bot management is not available in this version of DevSocial." /> },
          { path: "users", element: <AdminUsersPage /> },
          // Detail view intentionally renders the users shell — no dedicated
          // page exists yet. See MIGRATION_PROGRESS.md.
          { path: "users/:userId", element: <AdminUsersPage /> },
        ],
      },
      {
        // Legacy alias, kept outside the /admin prefix.
        path: "/admin-roles",
        element: <AdminShell />,
        children: [{ index: true, element: <AdminRolesPage /> }],
      },
      {
        element: <AuthenticatedShell />,
        children: [
          { path: "/", element: <HomePage /> },
          { path: "/home", element: <HomePage /> },
          { path: "/dashboard", element: <HomePage /> },
          { path: "/me", element: <MePage /> },
          { path: "/profile", element: <MePage /> },

          { path: "/career-paths", element: <CareerPathsPage /> },
          { path: "/career-paths/:pathId", element: <CareerPathDetailPage /> },
          { path: "/career-paths/:pathId/:moduleId", element: <CareerModulePage /> },

          { path: "/challenges", element: <ChallengesPage /> },
          { path: "/confess", element: <ConfessPage /> },
          { path: "/leaderboard", element: <LeaderboardPage /> },
          { path: "/missions", element: <UnavailableFeature title="Missions have been retired" description="Explore challenges to keep learning and earn rewards." /> },
          { path: "/messages", element: <MessagesPage /> },
          { path: "/moderation", element: <ModerationPage /> },
          { path: "/notifications", element: <NotificationsPage /> },
          { path: "/referrals", element: <ReferralsPage /> },
          { path: "/search", element: <SearchPage /> },
          { path: "/trending", element: <TrendingPage /> },

          { path: "/communities", element: <CommunitiesPage /> },
          { path: "/communities/create", element: <CreateCommunityPage /> },
          { path: "/create-community", element: <CreateCommunityPage /> },
          { path: "/communities/:idOrSlug", element: <CommunityDetailPage /> },
          { path: "/community/:idOrSlug", element: <CommunityDetailPage /> },

          { path: "/projects", element: <ProjectsPage /> },
          { path: "/projects/create", element: <CreateProjectPage /> },
          { path: "/projects/my", element: <MyProjectsPage /> },
          { path: "/projects/:id", element: <ProjectDetailPage /> },

          { path: "/knowledge-bank", element: <KnowledgeBankPage /> },
          { path: "/knowledge-bank/create", element: <CreateKnowledgeEntryPage /> },
          { path: "/knowledge-bank/:id", element: <KnowledgeEntryDetailPage /> },

          { path: "/feedback", element: <FeedbackPage /> },
          { path: "/feedback/create", element: <CreateFeedbackPage /> },
          { path: "/feedback/:id", element: <FeedbackDetailPage /> },

          { path: "/posts/:id", element: <PostDetailPage /> },
          { path: "/post/:id", element: <PostDetailPage /> },
          { path: "/tag/:tagName", element: <TagPage /> },

          {
            path: "/analytics",
            children: [
              { index: true, element: <AnalyticsDashboardPage /> },
              { path: "content", element: <AnalyticsContentPage /> },
              { path: "growth", element: <AnalyticsGrowthPage /> },
              { path: "realtime", element: <AnalyticsRealtimePage /> },
              { path: "users", element: <AnalyticsUsersPage /> },
            ],
          },

          {
            path: "/settings",
            element: <SettingsShell />,
            children: [
              { index: true, element: <AppearanceSettingsPage /> },
              { path: "account", element: <AccountSettingsPage /> },
              { path: "ai-usage", element: <AiUsageSettingsPage /> },
              { path: "appearance", element: <AppearanceSettingsPage /> },
              { path: "blocked-users", element: <BlockedUsersSettingsPage /> },
              { path: "notifications", element: <NotificationsSettingsPage /> },
              { path: "privacy", element: <PrivacySettingsPage /> },
              { path: "profile", element: <ProfileSettingsPage /> },
              { path: "security", element: <SecuritySettingsPage /> },
            ],
          },

          // Legacy profile alias. `useParams` in lib/navigation re-adds the
          // leading `@` that the canonical `/@:username` form carries.
          { path: "/profile/:username", element: <PublicProfilePage /> },

          // Keep last: static routes out-rank this, so it only sees paths
          // nothing else claimed.
          { path: "/:username", element: <UsernameRoute /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
