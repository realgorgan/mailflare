"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth/client";

type Usage = { attachmentBytes: number; retention: { count: number; expiresAt: string | null }; limits: { r2Bytes: number; d1Bytes: number; workerRequestsPerDay: number } };
const formatBytes = (value: number) => `${(value / 1024 / 1024).toFixed(1)} MB`;

export default function UsagePage() {
	const [usage, setUsage] = useState<Usage | null>(null);
	useEffect(() => { void authFetch("/api/usage").then((response) => response.ok ? response.json() as Promise<Usage> : null).then(setUsage).catch(() => setUsage(null)); }, []);
	return <div className="space-y-6"><div><h1 className="text-3xl font-medium text-neutral-900">Free-tier usage</h1><p className="mt-2 text-sm text-neutral-500">Mailflare automatically archives mail after 90 days and deletes inactive archived mail after 120 days.</p></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-3xl bg-white p-5"><p className="text-sm text-neutral-500">Stored attachments</p><p className="mt-2 text-2xl font-semibold">{usage ? formatBytes(usage.attachmentBytes) : "Loading…"}</p><p className="mt-1 text-xs text-neutral-500">of Cloudflare R2's 10 GB free allowance</p></div><div className="rounded-3xl bg-white p-5"><p className="text-sm text-neutral-500">Archive expiry</p><p className="mt-2 text-2xl font-semibold">{usage?.retention.count ?? 0} messages</p><p className="mt-1 text-xs text-neutral-500">{usage?.retention.expiresAt ? `Next deletion: ${new Date(usage.retention.expiresAt).toLocaleDateString()}` : "Nothing scheduled for deletion"}</p></div></div><p className="text-sm text-neutral-500">Cloudflare Free also allows 100,000 Worker requests/day and 5 GB of D1 storage. Brevo sending is subject to its separate quota.</p></div>;
}
