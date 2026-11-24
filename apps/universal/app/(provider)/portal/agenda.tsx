import { loadProviderScreens } from '../../../src/provider/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';

const AgendaScreen = lazyScreen(loadProviderScreens, (zone) => zone.AgendaScreen);

export default function Route() { return <AgendaScreen />; }
