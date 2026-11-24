/** The host's workspace as a separate web chunk (M13). Nothing outside `src/host` may import `./screens` statically. */
export const loadHostScreens = () => import("./screens");
