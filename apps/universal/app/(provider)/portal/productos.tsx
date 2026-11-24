import { loadProviderScreens } from '../../../src/provider/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';

const ProductsScreen = lazyScreen(loadProviderScreens, (zone) => zone.ProductsScreen);

export default function Route() { return <ProductsScreen />; }
