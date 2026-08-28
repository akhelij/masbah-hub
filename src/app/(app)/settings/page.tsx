import type { Metadata } from "next";
import { auth } from "@/auth";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";
import { isAIConfigured } from "@/lib/ai";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Réglages" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();

  const [businessSetting, users] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "business" } }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Réglages"
        description="Marque, équipe et état des intégrations."
      />
      <SettingsWorkspace
        business={(businessSetting?.value as Record<string, never>) ?? {}}
        integrations={{
          anthropic: isAIConfigured(),
          googleMaps: Boolean(process.env.GOOGLE_MAPS_API_KEY),
          whatsapp: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
          smtp: Boolean(process.env.SMTP_HOST),
          googleOAuth: Boolean(process.env.GOOGLE_CLIENT_ID),
          webhookKey: Boolean(process.env.WEBHOOK_API_KEY),
        }}
        users={users}
        currentUser={{
          id: session?.user?.id ?? "",
          name: session?.user?.name ?? "",
          email: session?.user?.email ?? "",
          role: session?.user?.role ?? "OPERATOR",
        }}
      />
    </>
  );
}
