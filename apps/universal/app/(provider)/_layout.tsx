import { useMemo } from 'react';
import { errorBoundaryFor } from '../../src/platform/error-boundary';
import { RouteGuard } from '../../src/auth/route-guard';
import { ShellStack } from '../../src/platform/navigation';
import { useT } from '../../src/platform/providers';
import { portalNav } from '../../src/provider/routes';
import { loadProviderScreens } from '../../src/provider/load';

/** M11: an error inside (provider) keeps the rest of the app alive and offers a retry of this area. */
export const ErrorBoundary = errorBoundaryFor('provider');

/** F05-03: only roles allowed in the (provider) group get past this point. */
export default function ProviderLayout() {
  const t = useT();
  const nav = useMemo(() => portalNav(t), [t]);
  return <RouteGuard group="provider"><ShellStack nav={nav} load={loadProviderScreens} /></RouteGuard>;
}
