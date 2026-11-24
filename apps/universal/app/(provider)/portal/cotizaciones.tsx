import { loadProviderScreens } from '../../../src/provider/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';

const QuotesScreen = lazyScreen(loadProviderScreens, (zone) => zone.QuotesScreen);

export default function Route() { return <QuotesScreen />; }
