"use client";

import { useEffect, useState } from "react";

export function RetentionNotice() {
	const [notice, setNotice] = useState<{ count: number; expiresAt: string | null } | null>(null);
	useEffect(() => { void fetch("/api/retention").then((response) => response.ok ? response.json() as Promise<{ count: number; expiresAt: string | null }> : null).then((value) => setNotice(value)).catch(() => setNotice(null)); }, []);
	if (!notice?.count || !notice.expiresAt) return null;
	return <p className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{notice.count} archived {notice.count === 1 ? "message is" : "messages are"} scheduled for permanent deletion from {new Date(notice.expiresAt).toLocaleDateString()}. Restore or export anything you need.</p>;
}
