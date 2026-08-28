import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { LeadDetail } from "@/components/leads/lead-detail";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({ where: { id }, select: { name: true } });
  return { title: lead?.name ?? "Prospect" };
}

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const role = session?.user?.role ?? "OPERATOR";

  const [lead, templates, users, businessSetting] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: "desc" } },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 60,
          include: { user: { select: { name: true } } },
        },
      },
    }),
    prisma.template.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: { id: true, name: true, body: true, language: true, channel: true, category: true },
    }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.setting.findUnique({ where: { key: "business" } }),
  ]);

  if (!lead) notFound();

  const senderName =
    (businessSetting?.value as { senderName?: string } | null)?.senderName ?? "Youssef";

  return (
    <LeadDetail
      lead={lead}
      templates={templates}
      users={users}
      canEdit={role !== "VIEWER"}
      isAdmin={role === "ADMIN"}
      senderName={senderName}
    />
  );
}
