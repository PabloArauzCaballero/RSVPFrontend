import { loadProviderScreens } from '../../../../src/provider/load';
import { lazyScreen } from '../../../../src/platform/lazy-screen';

const ProductEditorScreen = lazyScreen(loadProviderScreens, (zone) => zone.ProductEditorScreen);

export default function Route() { return <ProductEditorScreen />; }
