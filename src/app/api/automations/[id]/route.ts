import { handleError, ok, requireUser, requireWriteAccess } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { automationSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    requireWriteAccess(await requireUser());
    const { id } = await params;
    const input = automationSchema.partial().parse(await request.json());
    const automation = await prisma.automation.update({
      where: { id },
      data: {
        ...input,
        conditions: input.conditions ?? undefined,
        actionConfig: input.actionConfig ?? undefined,
      },
    });
    return ok(automation);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    requireWriteAccess(await requireUser());
    const { id } = await params;
    await prisma.automation.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
