/**
 * Next.js-compatible navigation hooks, backed by React Router.
 *
 * Pages across the app import `usePathname` / `useParams` / `useRouter` /
 * `useSearchParams` from here. Keeping that surface stable means the router
 * swap stays contained to this file, `router.tsx` and `components/ui/link`.
 */
import {
  useLocation,
  useNavigate,
  useParams as useRouteParams,
  useSearchParams as useRouteSearchParams,
} from "react-router-dom";

export function usePathname() {
  return useLocation().pathname;
}

/**
 * Next's `useSearchParams` returns the params directly; React Router returns a
 * `[params, setParams]` tuple. Callers here only ever read.
 */
export function useSearchParams() {
  return useRouteSearchParams()[0];
}

/**
 * Route params come from the route table already decoded.
 *
 * The one normalisation left is the legacy `/profile/:username` alias: pages
 * expect `username` to carry the leading `@` that the canonical `/@:username`
 * form provides.
 */
export function useParams(): Record<string, string | undefined> {
  const params = useRouteParams();
  const { pathname } = useLocation();

  if (pathname.startsWith("/profile/") && params.username) {
    return { ...params, username: `@${params.username}` };
  }

  return params;
}

export function useRouter() {
  const navigate = useNavigate();

  return {
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, { replace: true }),
    back: () => navigate(-1),
    /**
     * No-op. Next used this to refetch server components; this app has no
     * router loaders, so data refreshes go through TanStack Query instead.
     */
    refresh: () => {},
  };
}
