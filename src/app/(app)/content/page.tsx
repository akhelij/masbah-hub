import type { Metadata } from "next";
import { auth } from "@/auth";
import { ContentWorkspace } from "@/components/content/content-workspace";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Contenu" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ContentPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const session = await auth();
  const canEdit = (session?.user?.role ?? "OPERATOR") !== "VIEWER";

  const posts = await prisma.contentPost.findMany({
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
    take: 120,
  });

  return (
    <>
      <PageHeader
        title="Générateur de contenu"
        description="Posts français + darija, hashtags et prompts visuels, prêts à publier."
      />
      <ContentWorkspace posts={posts} canEdit={canEdit} openNew={sp.new === "1" && canEdit} />
    </>
  );
}
