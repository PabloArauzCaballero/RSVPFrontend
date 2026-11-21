import { loadProviderScreens } from '../../../src/provider/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';

const MetricsScreen = lazyScreen(loadProviderScreens, (zone) => zone.MetricsScreen);

export default function Route() { return <MetricsScreen />; }
