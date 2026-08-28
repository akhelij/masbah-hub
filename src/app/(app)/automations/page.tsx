import type { Metadata } from "next";
import { auth } from "@/auth";
import { AutomationsWorkspace } from "@/components/automations/automations-workspace";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Automatisations" };
export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const session = await auth();
  const canEdit = (session?.user?.role ?? "OPERATOR") !== "VIEWER";

  const [automations, logs] = await Promise.all([
    prisma.automation.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.webhookLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return (
    <>
      <PageHeader
        title="Automatisations"
        description="Règles internes et webhooks compatibles n8n."
      />
      <AutomationsWorkspace
        automations={automations}
        logs={logs}
        appUrl={process.env.APP_URL ?? "http://localhost:3100"}
        canEdit={canEdit}
      />
    </>
  );
}
