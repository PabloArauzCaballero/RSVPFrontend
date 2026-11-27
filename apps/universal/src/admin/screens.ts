/**
 * Every screen of the administration, behind one `import()` (M13): `load.ts` is the only door, so web downloads this zone in
 * one chunk the first time one of its routes opens. Route files take their screen with `lazyScreen(load…, (zone) => zone.X)`.
 */
export { CategoriesScreen, GeographyScreen } from "./catalog";
export { DashboardScreen, OperationsScreen } from "./other-screens";
export { MetricsScreen, OrganizationsScreen, UsersScreen } from "./insight";
export { ModerationScreen, VerificationScreen } from "./queues";
export { TemplatesAdminScreen } from "./templates";
export { EventTypesScreen } from "./event-types";
export { ProductsScreen } from "./products/products-screen";
export { PartnersScreen } from "./partners/partners-screen";
