import { and, eq, inArray, isNotNull, lt, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { messageAttachments, messages } from "@/db/schema";

export const ACTIVE_RETENTION_DAYS = 90;
export const ARCHIVE_RETENTION_DAYS = 120;
export const ARCHIVE_WARNING_DAYS = 14;
const DAY_MS = 86_400_000;
const BATCH_SIZE = 100;

export async function runMessageRetention(env: CloudflareEnv, now = new Date()) {
	const db = getDb(env);
	const archiveCutoff = new Date(now.getTime() - ACTIVE_RETENTION_DAYS * DAY_MS);
	const expireCutoff = new Date(now.getTime() - ARCHIVE_RETENTION_DAYS * DAY_MS);
	const archiveCandidates = await db.select({ id: messages.id }).from(messages)
		.where(and(ne(messages.status, "archived"), lt(messages.retentionActiveAt, archiveCutoff))).limit(BATCH_SIZE);
	if (archiveCandidates.length) await db.update(messages).set({ status: "archived", folderId: null, archiveAt: now }).where(inArray(messages.id, archiveCandidates.map(({ id }) => id)));

	const expired = await db.select({ id: messages.id, rawR2Key: messages.rawR2Key }).from(messages)
		.where(and(eq(messages.status, "archived"), isNotNull(messages.archiveAt), lt(messages.archiveAt, expireCutoff))).limit(BATCH_SIZE);
	for (const message of expired) {
		const attachments = await db.select({ r2Key: messageAttachments.r2Key }).from(messageAttachments).where(eq(messageAttachments.messageId, message.id));
		await Promise.all([...attachments.map(({ r2Key }) => env.BUCKET.delete(r2Key)), ...(message.rawR2Key ? [env.BUCKET.delete(message.rawR2Key)] : [])]);
		await db.delete(messages).where(eq(messages.id, message.id));
	}
	return { archived: archiveCandidates.length, deleted: expired.length };
}

export async function getRetentionNotice(env: CloudflareEnv, userId: string, now = new Date()) {
	const cutoff = new Date(now.getTime() - (ARCHIVE_RETENTION_DAYS - ARCHIVE_WARNING_DAYS) * DAY_MS);
	const rows = await getDb(env).select({ archiveAt: messages.archiveAt }).from(messages)
		.where(and(eq(messages.userId, userId), eq(messages.status, "archived"), isNotNull(messages.archiveAt), lt(messages.archiveAt, cutoff)));
	return { count: rows.length, expiresAt: rows.length ? new Date(Math.min(...rows.map((row) => row.archiveAt!.getTime() + ARCHIVE_RETENTION_DAYS * DAY_MS))).toISOString() : null };
}
