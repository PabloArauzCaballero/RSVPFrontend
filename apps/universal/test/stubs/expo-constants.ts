/** Test stub: the real module needs the Expo native runtime. Tests set `constants.projectId`. */
export const constants = { projectId: undefined as string | undefined };
const Constants = { get expoConfig() { return { extra: { eas: { projectId: constants.projectId } } }; } };
export default Constants;
