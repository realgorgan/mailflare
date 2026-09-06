import { getEmailAddress } from "./address";
import type { AttachmentContent } from "./attachment-types";

export class EmailSenderError extends Error {
	constructor(message: string, readonly retryable = false) { super(message); this.name = "EmailSenderError"; }
}

export type SendWithProviderInput = { from: string; to: string; subject: string; html?: string; text?: string; headers?: Record<string, string>; attachments: AttachmentContent[] };
export interface EmailSender { send(input: SendWithProviderInput): Promise<{ messageId: string }>; }

function encodeBase64(content: ArrayBuffer): string {
	const bytes = new Uint8Array(content);
	let binary = "";
	for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
	return btoa(binary);
}

type Smtp2GoResponse = {
	data?: {
		failed?: number;
		email_id?: string;
		error?: string;
		failures?: Array<{ error?: string }>;
	};
};

export class Smtp2GoSender implements EmailSender {
	constructor(private readonly apiKey: string) {}
	async send(input: SendWithProviderInput): Promise<{ messageId: string }> {
		if (!this.apiKey) throw new EmailSenderError("Email sending is not configured. Add SMTP2GO_API_KEY to this Worker.");
		const attachments = input.attachments.filter((attachment) => attachment.disposition !== "inline");
		const inlines = input.attachments.filter((attachment) => attachment.disposition === "inline");
		const response = await fetch("https://api.smtp2go.com/v3/email/send", {
			method: "POST",
			headers: { "X-Smtp2go-Api-Key": this.apiKey, "content-type": "application/json", accept: "application/json" },
			body: JSON.stringify({
				sender: input.from,
				to: [getEmailAddress(input.to)],
				subject: input.subject,
				...(input.html ? { html_body: input.html } : {}),
				...(input.text ? { text_body: input.text } : {}),
				...(input.headers ? { custom_headers: Object.entries(input.headers).map(([header, value]) => ({ header, value })) } : {}),
				...(attachments.length ? { attachments: attachments.map((attachment) => ({ filename: attachment.filename, mimetype: attachment.type, fileblob: encodeBase64(attachment.content) })) } : {}),
				...(inlines.length ? { inlines: inlines.map((attachment) => ({ filename: attachment.contentId ?? attachment.filename, mimetype: attachment.type, fileblob: encodeBase64(attachment.content) })) } : {}),
			}),
		});
		const payload = await response.json().catch(() => null) as Smtp2GoResponse | null;
		const failure = payload?.data?.error ?? payload?.data?.failures?.find((item) => item.error)?.error;
		if (!response.ok || (payload?.data?.failed ?? 0) > 0) {
			const quota = response.status === 402 || response.status === 429;
			throw new EmailSenderError(quota ? "SMTP2GO's sending limit has been reached. Try again after its quota resets." : failure ?? "SMTP2GO rejected this email.", response.status >= 500 || response.status === 429);
		}
		if (!payload?.data?.email_id) throw new EmailSenderError("SMTP2GO did not return an email ID.", true);
		return { messageId: payload.data.email_id };
	}
}

export function getEmailSender(env: CloudflareEnv): EmailSender { return new Smtp2GoSender(env.SMTP2GO_API_KEY ?? ""); }
