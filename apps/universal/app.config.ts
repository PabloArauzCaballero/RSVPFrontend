import type { ExpoConfig, ConfigContext } from "expo/config";

const linkDomain = process.env.EXPO_PUBLIC_LINK_DOMAIN;
const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "RSVP",
  slug: "rsvp",
  scheme: "rsvp",
  plugins: ["expo-router", ["expo-notifications", { color: "#1F3BFF" }]],
  runtimeVersion: { policy: "appVersion" },
  updates: projectId ? { url: `https://u.expo.dev/${projectId}` } : undefined,
  extra: { eas: projectId ? { projectId } : undefined },
  ios: linkDomain ? { associatedDomains: [`applinks:${linkDomain}`], bundleIdentifier: process.env.EXPO_IOS_BUNDLE_IDENTIFIER } : undefined,
  android: linkDomain ? { package: process.env.EXPO_ANDROID_PACKAGE, intentFilters: [{ action: "VIEW", autoVerify: true, data: [{ scheme: "https", host: linkDomain, pathPrefix: "/rsvp" }, { scheme: "https", host: linkDomain, pathPattern: "/c/.*/rsvp/.*" }], category: ["BROWSABLE", "DEFAULT"] }] } : undefined
});
