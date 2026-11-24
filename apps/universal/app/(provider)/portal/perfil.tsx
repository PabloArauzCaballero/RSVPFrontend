import { loadProviderScreens } from '../../../src/provider/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';

const MicrositeScreen = lazyScreen(loadProviderScreens, (zone) => zone.MicrositeScreen);

export default function Route() { return <MicrositeScreen />; }
