import { useMemo } from 'react';
import { errorBoundaryFor } from '../../src/platform/error-boundary';
import { RouteGuard } from '../../src/auth/route-guard';
import { ShellStack } from '../../src/platform/navigation';
import { useT } from '../../src/platform/providers';
import { hostNav } from '../../src/host/routes';
import { loadHostScreens } from '../../src/host/load';

/** M11: an error inside (host) keeps the rest of the app alive and offers a retry of this area. */
export const ErrorBoundary = errorBoundaryFor('host');

/** F05-03: only roles allowed in the (host) group get past this point. */
export default function HostLayout() {
  const t = useT();
  const nav = useMemo(() => hostNav(t, undefined), [t]);
  return <RouteGuard group="host"><ShellStack nav={nav} load={loadHostScreens} /></RouteGuard>;
}
