import type { ExpoConfig, ConfigContext } from "expo/config";

const linkDomain = process.env.EXPO_PUBLIC_LINK_DOMAIN;
/**
 * Identity of the app in EAS (@pablo28809s-team/rsvp) and in Apple. Neither is secret nor depends on the environment: every
 * EAS command (build, submit, update) reads them from here. The variables exist only to point a fork at another project.
 * The bundle id cannot change once the first build is uploaded to App Store Connect.
 */
const EAS_OWNER = "pablo28809s-team";
const EAS_PROJECT_ID = "a7c4435b-6494-458c-b142-83b2b0705ef1";
const IOS_BUNDLE_ID = "com.arauzsoftware.done";
const ANDROID_PACKAGE = "com.arauzsoftware.done";
const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? EAS_PROJECT_ID;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "DOne",
  owner: EAS_OWNER,
  slug: "rsvp",
  scheme: "rsvp",
  icon: "./assets/icon.png",
  splash: { image: "./assets/splash-icon.png", resizeMode: "contain", backgroundColor: "#F7F6F3", dark: { image: "./assets/splash-icon-dark.png", backgroundColor: "#151514" } },
  web: { bundler: "metro", output: "single", favicon: "./assets/favicon.png" },
  plugins: [
    "expo-router",
    ["expo-image-picker", { photosPermission: "DOne usa tus fotos solo para la galería de tu invitación y el catálogo de regalos." }],
    ["expo-notifications", { icon: "./assets/notification-icon.png", color: "#111111" }],
    // The app's languages, declared to the OS: iOS writes CFBundleLocalizations (without it the bundle runs in English and
    // Settings offers no per-app language) and Android its locales_config. Keep in step with `supportedLocales` of @rsvp/i18n.
    ["expo-localization", { supportedLocales: ["es", "en"] }]
  ],
  runtimeVersion: { policy: "appVersion" },
  updates: { url: `https://u.expo.dev/${projectId}` },
  extra: { eas: { projectId } },
  ios: {
    bundleIdentifier: process.env.EXPO_IOS_BUNDLE_IDENTIFIER ?? IOS_BUNDLE_ID,
    supportsTablet: true,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
    ...(linkDomain ? { associatedDomains: [`applinks:${linkDomain}`] } : {})
  },
  android: {
    package: process.env.EXPO_ANDROID_PACKAGE ?? ANDROID_PACKAGE,
    adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#111111" },
    ...(linkDomain ? { intentFilters: [{ action: "VIEW", autoVerify: true, data: [{ scheme: "https", host: linkDomain, pathPrefix: "/rsvp" }, { scheme: "https", host: linkDomain, pathPattern: "/c/.*/rsvp/.*" }], category: ["BROWSABLE", "DEFAULT"] }] } : {})
  }
});
