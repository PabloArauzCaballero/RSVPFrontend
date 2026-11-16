import type { ExpoConfig, ConfigContext } from "expo/config";

const linkDomain = process.env.EXPO_PUBLIC_LINK_DOMAIN;
/** Identidad del proyecto en EAS (@pablo28809/rsvp). No es secreta ni depende del entorno; todos los comandos
 * de EAS (build, submit, update) la leen de aquí. La variable solo existe para apuntar a otro proyecto. */
const EAS_PROJECT_ID = "addd43ee-7779-4dfa-bf74-b7bd0f1ca1f7";
const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? EAS_PROJECT_ID;
/** Bundle id registrado en Apple para DOne; no se puede cambiar después del primer build subido. */
const IOS_BUNDLE_ID = "com.pablo28809.done";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "DOne",
  owner: "pablo28809",
  slug: "rsvp",
  scheme: "rsvp",
  icon: "./assets/icon.png",
  splash: { image: "./assets/splash-icon.png", resizeMode: "contain", backgroundColor: "#F7F6F3", dark: { image: "./assets/splash-icon-dark.png", backgroundColor: "#151514" } },
  web: { bundler: "metro", output: "single", favicon: "./assets/favicon.png" },
  plugins: ["expo-router", ["expo-image-picker", { photosPermission: "DOne usa tus fotos solo para la galería de tu invitación y el catálogo de regalos." }], ["expo-notifications", { icon: "./assets/notification-icon.png", color: "#111111" }]],
  runtimeVersion: { policy: "appVersion" },
  updates: { url: `https://u.expo.dev/${projectId}` },
  extra: { eas: { projectId } },
  ios: { bundleIdentifier: process.env.EXPO_IOS_BUNDLE_IDENTIFIER ?? IOS_BUNDLE_ID, supportsTablet: true, infoPlist: { ITSAppUsesNonExemptEncryption: false }, ...(linkDomain ? { associatedDomains: [`applinks:${linkDomain}`] } : {}) },
  android: { adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#111111" }, ...(linkDomain ? { package: process.env.EXPO_ANDROID_PACKAGE, intentFilters: [{ action: "VIEW", autoVerify: true, data: [{ scheme: "https", host: linkDomain, pathPrefix: "/rsvp" }, { scheme: "https", host: linkDomain, pathPattern: "/c/.*/rsvp/.*" }], category: ["BROWSABLE", "DEFAULT"] }] } : {}) },
});
