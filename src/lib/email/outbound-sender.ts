import { getEmailAddress, parseEmailAddressParts } from "./address";
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

export class BrevoSender implements EmailSender {
	constructor(private readonly apiKey: string) {}
	async send(input: SendWithProviderInput): Promise<{ messageId: string }> {
		if (!this.apiKey) throw new EmailSenderError("Email sending is not configured. Add BREVO_API_KEY to this Worker.");
		const from = parseEmailAddressParts(input.from);
		const to = parseEmailAddressParts(input.to);
		const response = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": this.apiKey, "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ sender: { email: getEmailAddress(input.from), ...(from.name ? { name: from.name } : {}) }, to: [{ email: getEmailAddress(input.to), ...(to.name ? { name: to.name } : {}) }], subject: input.subject, ...(input.html ? { htmlContent: input.html } : {}), ...(input.text ? { textContent: input.text } : {}), ...(input.headers ? { headers: input.headers } : {}), ...(input.attachments.length ? { attachment: input.attachments.map((attachment) => ({ name: attachment.filename, content: encodeBase64(attachment.content) })) } : {}) }) });
		const payload = await response.json().catch(() => null) as { messageId?: string; message?: string } | null;
		if (!response.ok) throw new EmailSenderError(response.status === 402 || response.status === 429 ? "Brevo's sending limit has been reached. Try again after its quota resets." : payload?.message ?? "Brevo rejected this email.", response.status >= 500 || response.status === 429);
		if (!payload?.messageId) throw new EmailSenderError("Brevo did not return a message ID.", true);
		return { messageId: payload.messageId };
	}
}

export function getEmailSender(env: CloudflareEnv): EmailSender { return new BrevoSender(env.BREVO_API_KEY ?? ""); }
