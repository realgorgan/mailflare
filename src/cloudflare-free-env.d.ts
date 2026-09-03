interface CloudflareEnv {
	BREVO_API_KEY?: string;
	// Legacy update routes are not exposed in the free deployment profile.
	GITHUB_UPDATE_TOKEN?: string;
	GITHUB_UPDATE_REPO?: string;
	GITHUB_UPDATE_REF?: string;
}
