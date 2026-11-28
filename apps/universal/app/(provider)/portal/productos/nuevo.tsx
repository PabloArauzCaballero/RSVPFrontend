import { loadProviderScreens } from '../../../../src/provider/load';
import { lazyScreen } from '../../../../src/platform/lazy-screen';

const NewProductScreen = lazyScreen(loadProviderScreens, (zone) => zone.NewProductScreen);

export default function Route() { return <NewProductScreen />; }
