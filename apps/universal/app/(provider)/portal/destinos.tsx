import { loadProviderScreens } from '../../../src/provider/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';

const DestinationsScreen = lazyScreen(loadProviderScreens, (zone) => zone.DestinationsScreen);

export default function Route() { return <DestinationsScreen />; }
