import type { LicenseEntitlements, LicensePlan, LicenseStatus } from "./types";

// This fork is intentionally feature-complete. Keep the small compatibility
// surface for older routes, but never contact Paymug or require a key.
const FREE_STATUS: LicenseStatus = {
	plan: "team",
	state: "active",
	features: [],
	instanceId: "mailflare-free",
	instanceUrl: null,
	active: true,
	activatedAt: null,
	validatedAt: null,
};

export async function getLicenseStatus(_env: CloudflareEnv): Promise<LicenseStatus> { return FREE_STATUS; }
export async function getLicenseEntitlements(_env: CloudflareEnv): Promise<LicenseEntitlements> {
	return { plan: "team", canCustomizeBranding: true, canManageAccounts: true, canForwardEmail: true };
}
export async function activateLicense(_env: CloudflareEnv, _key: string, _url: string, _plan: Exclude<LicensePlan, "community">) { return FREE_STATUS; }
export async function validateLicense(_env: CloudflareEnv, _key: string, _url: string) { return FREE_STATUS; }
export async function deactivateLicense(_env: CloudflareEnv) { return FREE_STATUS; }
