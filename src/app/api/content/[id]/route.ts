import { handleError, ok, requireUser, requireWriteAccess } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { contentSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    requireWriteAccess(await requireUser());
    const { id } = await params;
    const input = contentSchema.partial().parse(await request.json());
    const data = { ...input };
    if (input.status === "PUBLISHED" && !input.publishedAt) data.publishedAt = new Date();
    const post = await prisma.contentPost.update({ where: { id }, data });
    return ok(post);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    requireWriteAccess(await requireUser());
    const { id } = await params;
    await prisma.contentPost.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
