import { handleError, HttpError, ok, requireUser, requireWriteAccess } from "@/lib/api";
import { updateLead } from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { updateLeadSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  try {
    await requireUser();
    const { id } = await params;
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: "desc" } },
        activities: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });
    if (!lead) throw new HttpError(404, "Prospect introuvable");
    return ok(lead);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const user = requireWriteAccess(await requireUser());
    const { id } = await params;
    const input = updateLeadSchema.parse(await request.json());
    const lead = await updateLead(id, input, user.id);
    if (!lead) throw new HttpError(404, "Prospect introuvable");
    return ok(lead);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const user = requireWriteAccess(await requireUser());
    if (user.role !== "ADMIN") throw new HttpError(403, "Seul un admin peut supprimer un prospect");
    const { id } = await params;
    await prisma.lead.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
