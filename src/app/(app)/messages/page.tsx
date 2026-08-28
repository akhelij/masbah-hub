import type { Metadata } from "next";
import { auth } from "@/auth";
import { PageHeader } from "@/components/layout/page-header";
import { MessagesWorkspace } from "@/components/messages/messages-workspace";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const session = await auth();
  const canEdit = (session?.user?.role ?? "OPERATOR") !== "VIEWER";

  const [threads, templates, businessSetting] = await Promise.all([
    prisma.lead.findMany({
      where: { messages: { some: {} } },
      orderBy: { lastContactAt: "desc" },
      take: 60,
      select: {
        id: true, name: true, city: true, phone: true, whatsapp: true, email: true, status: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 40,
          select: {
            id: true, content: true, channel: true, direction: true,
            aiGenerated: true, createdAt: true,
          },
        },
      },
    }),
    prisma.template.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: {
        id: true, name: true, body: true, language: true, channel: true,
        category: true, usageCount: true, isActive: true, subject: true,
      },
    }),
    prisma.setting.findUnique({ where: { key: "business" } }),
  ]);

  const senderName =
    (businessSetting?.value as { senderName?: string } | null)?.senderName ?? "Youssef";

  return (
    <>
      <PageHeader
        title="Centre de messages"
        description="Conversations, modèles multilingues et génération IA."
      />
      <MessagesWorkspace
        threads={threads}
        templates={templates}
        senderName={senderName}
        canEdit={canEdit}
      />
    </>
  );
}
