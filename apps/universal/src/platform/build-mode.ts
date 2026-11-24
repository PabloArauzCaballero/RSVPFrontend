/** True in development builds (`expo start`), false in every exported or store build. A function so tests can stub it. */
export function isDevBuild(): boolean {
  return typeof __DEV__ === "undefined" ? process.env.NODE_ENV !== "production" : __DEV__;
}
