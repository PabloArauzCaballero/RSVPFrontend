/**
 * Values consumed by deployment automation to publish the verification files.
 * Bundle identifiers are environment-specific and must match the signed apps.
 */
export interface LinkVerificationConfig {
  appleAppId: string;
  androidPackageName: string;
  androidSha256CertFingerprints: readonly string[];
}

/** Avoid publishing a poisoned universal-link file with guessed production IDs. */
export function verificationConfigFromEnvironment(environment: Record<string, string | undefined>): LinkVerificationConfig | undefined {
  const appleAppId = environment.RSVP_APPLE_APP_ID;
  const androidPackageName = environment.RSVP_ANDROID_PACKAGE;
  const fingerprints = environment.RSVP_ANDROID_SHA256_FINGERPRINTS?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];
  if (!appleAppId || !androidPackageName || fingerprints.length === 0) return undefined;
  return { appleAppId, androidPackageName, androidSha256CertFingerprints: fingerprints };
}

export function appleAssociation(config: LinkVerificationConfig): string {
  return JSON.stringify({ applinks: { apps: [], details: [{ appID: config.appleAppId, paths: ["/rsvp/*"] }] } });
}

export function androidAssetLinks(config: LinkVerificationConfig): string {
  return JSON.stringify([{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: config.androidPackageName, sha256_cert_fingerprints: config.androidSha256CertFingerprints } }]);
}
