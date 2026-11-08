import * as React from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingState } from '@/components/common/states';
import { useAuthStore } from '@/stores/authStore';
import LoginPage from '@/features/auth/LoginPage';
import NotFoundPage from '@/features/auth/NotFoundPage';

const lazyPage = (load: () => Promise<{ default: React.ComponentType }>) => {
  const C = React.lazy(load);
  return (
    <React.Suspense fallback={<LoadingState />}>
      <C />
    </React.Suspense>
  );
};

function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const loc = useLocation();
  if (loading) return <LoadingState label="Memeriksa sesi…" className="min-h-screen" />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return <Outlet />;
}

export const router = createBrowserRouter(
  [
    { path: '/login', element: <LoginPage /> },
    {
      element: <ProtectedRoute />,
      children: [
        {
          element: <AppShell />,
          children: [
            { index: true, element: lazyPage(() => import('@/features/dashboard/DashboardPage')) },
            { path: 'projects', element: lazyPage(() => import('@/features/projects/ProjectsPage')) },
            { path: 'projects/new', element: lazyPage(() => import('@/features/projects/NewProjectPage')) },
            {
              path: 'projects/:id',
              element: lazyPage(() => import('@/features/projects/ProjectHub')),
              children: [
                { index: true, element: lazyPage(() => import('@/features/projects/ProjectOverview')) },
                { path: 'brief', element: lazyPage(() => import('@/features/brief/BriefWizard')) },
                { path: 'concepts', element: lazyPage(() => import('@/features/concept/ConceptPage')) },
                { path: 'script', element: lazyPage(() => import('@/features/script/ScriptPage')) },
                { path: 'storyboard', element: lazyPage(() => import('@/features/storyboard/StoryboardPage')) },
                { path: 'prompts', element: lazyPage(() => import('@/features/prompts/PromptsPage')) },
                { path: 'production', element: lazyPage(() => import('@/features/tracker/TrackerPage')) },
                { path: 'capcut', element: lazyPage(() => import('@/features/capcut/CapcutPage')) },
                { path: 'export', element: lazyPage(() => import('@/features/export/ExportPage')) },
              ],
            },
            { path: 'brands', element: lazyPage(() => import('@/features/brands/BrandsPage')) },
            { path: 'brands/:id', element: lazyPage(() => import('@/features/brands/BrandEditorPage')) },
            { path: 'provider', element: lazyPage(() => import('@/features/provider/ProviderPage')) },
            { path: 'settings', element: lazyPage(() => import('@/features/settings/SettingsPage')) },
            { path: 'library', element: lazyPage(() => import('@/features/library/LibraryPage')) },
            { path: '*', element: <NotFoundPage /> },
          ],
        },
      ],
    },
  ],
  { future: { v7_relativeSplatPath: true, v7_fetcherPersist: true, v7_normalizeFormMethod: true, v7_partialHydration: true, v7_skipActionErrorRevalidation: true } },
);
