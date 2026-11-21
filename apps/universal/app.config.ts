import type { ExpoConfig, ConfigContext } from "expo/config";

const linkDomain = process.env.EXPO_PUBLIC_LINK_DOMAIN;
const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "DOne",
  slug: "rsvp",
  scheme: "rsvp",
  icon: "./assets/icon.png",
  splash: { image: "./assets/splash-icon.png", resizeMode: "contain", backgroundColor: "#F6F7FB" },
  web: { bundler: "metro", output: "single", favicon: "./assets/favicon.png" },
  // The app's languages, declared to the OS: iOS writes CFBundleLocalizations (without it the bundle runs in English and
  // Settings offers no per-app language) and Android its locales_config. Keep in step with `supportedLocales` of @rsvp/i18n.
  plugins: ["expo-router", ["expo-notifications", { icon: "./assets/notification-icon.png", color: "#1F3BFF" }], ["expo-localization", { supportedLocales: ["es", "en"] }]],
  runtimeVersion: { policy: "appVersion" },
  updates: projectId ? { url: `https://u.expo.dev/${projectId}` } : undefined,
  extra: { eas: projectId ? { projectId } : undefined },
  ios: linkDomain ? { associatedDomains: [`applinks:${linkDomain}`], bundleIdentifier: process.env.EXPO_IOS_BUNDLE_IDENTIFIER } : undefined,
  android: { adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#1F3BFF" }, ...(linkDomain ? { package: process.env.EXPO_ANDROID_PACKAGE, intentFilters: [{ action: "VIEW", autoVerify: true, data: [{ scheme: "https", host: linkDomain, pathPrefix: "/rsvp" }, { scheme: "https", host: linkDomain, pathPattern: "/c/.*/rsvp/.*" }], category: ["BROWSABLE", "DEFAULT"] }] } : {}) },
});
