/** The administration as a separate web chunk (M13). Nothing outside `src/admin` may import `./screens` statically. */
export const loadAdminScreens = () => import("./screens");
