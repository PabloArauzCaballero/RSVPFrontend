/**
 * Values consumed by deployment automation to publish the verification files.
 * Bundle identifiers are environment-specific and must match the signed apps.
 */
export interface LinkVerificationConfig {
  appleAppId: string;
  androidPackageName: string;
  androidSha256CertFingerprints: readonly string[];
}

export function appleAssociation(config: LinkVerificationConfig): string {
  return JSON.stringify({ applinks: { apps: [], details: [{ appID: config.appleAppId, paths: ["/rsvp/*"] }] } });
}

export function androidAssetLinks(config: LinkVerificationConfig): string {
  return JSON.stringify([{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: config.androidPackageName, sha256_cert_fingerprints: config.androidSha256CertFingerprints } }]);
}
