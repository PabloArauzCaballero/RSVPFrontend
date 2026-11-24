import { loadProviderScreens } from '../../../src/provider/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';

const DocumentsScreen = lazyScreen(loadProviderScreens, (zone) => zone.DocumentsScreen);

export default function Route() { return <DocumentsScreen />; }
