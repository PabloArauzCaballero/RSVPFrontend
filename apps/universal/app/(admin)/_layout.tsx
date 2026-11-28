import { useMemo } from 'react';
import { errorBoundaryFor } from '../../src/platform/error-boundary';
import { RouteGuard } from '../../src/auth/route-guard';
import { ShellStack } from '../../src/platform/navigation';
import { useT } from '../../src/platform/providers';
import { adminNav } from '../../src/admin/routes';
import { loadAdminScreens } from '../../src/admin/load';

/** M11: an error inside (admin) keeps the rest of the app alive and offers a retry of this area. */
export const ErrorBoundary = errorBoundaryFor('admin');

/** F05-03: only roles allowed in the (admin) group get past this point. */
export default function AdminLayout() {
  const t = useT();
  const nav = useMemo(() => adminNav(t), [t]);
  return <RouteGuard group="admin"><ShellStack nav={nav} load={loadAdminScreens} /></RouteGuard>;
}
