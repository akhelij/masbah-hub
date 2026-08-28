import { handleError, ok, requireUser, requireWriteAccess } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { templateSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    requireWriteAccess(await requireUser());
    const { id } = await params;
    const input = templateSchema.partial().parse(await request.json());
    const variables = input.body
      ? [...new Set([...input.body.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]))]
      : undefined;
    const template = await prisma.template.update({
      where: { id },
      data: { ...input, ...(variables ? { variables } : {}) },
    });
    return ok(template);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    requireWriteAccess(await requireUser());
    const { id } = await params;
    await prisma.template.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
