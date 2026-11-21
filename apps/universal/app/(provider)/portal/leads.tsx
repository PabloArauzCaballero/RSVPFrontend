import { loadProviderScreens } from '../../../src/provider/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';

const LeadsScreen = lazyScreen(loadProviderScreens, (zone) => zone.LeadsScreen);

export default function Route() { return <LeadsScreen />; }
