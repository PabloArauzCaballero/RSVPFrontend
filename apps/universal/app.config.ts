import type { ExpoConfig, ConfigContext } from "expo/config";

const linkDomain = process.env.EXPO_PUBLIC_LINK_DOMAIN;
const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "DOne",
  slug: "rsvp",
  scheme: "rsvp",
  icon: "./assets/icon.png",
  splash: { image: "./assets/splash-icon.png", resizeMode: "contain", backgroundColor: "#F7F6F3", dark: { image: "./assets/splash-icon-dark.png", backgroundColor: "#151514" } },
  web: { bundler: "metro", output: "single", favicon: "./assets/favicon.png" },
  plugins: ["expo-router", ["expo-image-picker", { photosPermission: "DOne usa tus fotos solo para la galería de tu invitación y el catálogo de regalos." }], ["expo-notifications", { icon: "./assets/notification-icon.png", color: "#111111" }]],
  runtimeVersion: { policy: "appVersion" },
  updates: projectId ? { url: `https://u.expo.dev/${projectId}` } : undefined,
  extra: { eas: projectId ? { projectId } : undefined },
  ios: { bundleIdentifier: process.env.EXPO_IOS_BUNDLE_IDENTIFIER, supportsTablet: true, infoPlist: { ITSAppUsesNonExemptEncryption: false }, ...(linkDomain ? { associatedDomains: [`applinks:${linkDomain}`] } : {}) },
  android: { adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#111111" }, ...(linkDomain ? { package: process.env.EXPO_ANDROID_PACKAGE, intentFilters: [{ action: "VIEW", autoVerify: true, data: [{ scheme: "https", host: linkDomain, pathPrefix: "/rsvp" }, { scheme: "https", host: linkDomain, pathPattern: "/c/.*/rsvp/.*" }], category: ["BROWSABLE", "DEFAULT"] }] } : {}) },
});
