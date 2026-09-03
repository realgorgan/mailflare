"use client";

import { archivedFolderConfig } from "@/components/messages/message-folder-configs";
import { MessageFolderPage } from "@/components/messages/message-folder-page";
import { RetentionNotice } from "@/components/retention-notice";

export default function ArchivedPage() {
	return <><RetentionNotice /><MessageFolderPage config={archivedFolderConfig} /></>;
}
