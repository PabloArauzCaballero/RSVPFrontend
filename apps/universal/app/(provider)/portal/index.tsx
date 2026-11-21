import { loadProviderScreens } from '../../../src/provider/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';

const OverviewScreen = lazyScreen(loadProviderScreens, (zone) => zone.OverviewScreen);

export default function Route() { return <OverviewScreen />; }
