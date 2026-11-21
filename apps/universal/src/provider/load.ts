/** The provider portal as a separate web chunk (M13). Nothing outside `src/provider` may import `./screens` statically. */
export const loadProviderScreens = () => import("./screens");
