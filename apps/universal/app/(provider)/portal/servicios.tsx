import { loadProviderScreens } from '../../../src/provider/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';

const ServicesScreen = lazyScreen(loadProviderScreens, (zone) => zone.ServicesScreen);

export default function Route() { return <ServicesScreen />; }
