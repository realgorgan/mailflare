import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/cookies";
import { getDb } from "@/db";
import { messageAttachments } from "@/db/schema";
import { getEnv } from "@/lib/cloudflare";
import { getRetentionNotice } from "@/lib/messages/retention";

export async function GET(request: Request) {
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const [storage] = await getDb(env).select({ bytes: sql<number>`coalesce(sum(${messageAttachments.size}), 0)` }).from(messageAttachments);
	return NextResponse.json({ attachmentBytes: storage?.bytes ?? 0, retention: await getRetentionNotice(env, user.id), limits: { r2Bytes: 10 * 1024 * 1024 * 1024, d1Bytes: 5 * 1024 * 1024 * 1024, workerRequestsPerDay: 100000 } });
}
