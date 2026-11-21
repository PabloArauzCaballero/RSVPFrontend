import { loadProviderScreens } from '../../../src/provider/load';
import { lazyScreen } from '../../../src/platform/lazy-screen';

const DeliveryScreen = lazyScreen(loadProviderScreens, (zone) => zone.DeliveryScreen);

export default function Route() { return <DeliveryScreen />; }
