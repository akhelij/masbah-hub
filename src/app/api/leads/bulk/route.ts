import { z } from "zod";
import { handleError, HttpError, ok, requireUser, requireWriteAccess } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import { leadStatusEnum } from "@/lib/validators";

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Aucun prospect sélectionné"),
  action: z.enum(["status", "assign", "tag", "delete", "followUp"]),
  status: leadStatusEnum.optional(),
  assignedToId: z.string().nullable().optional(),
  tag: z.string().optional(),
  days: z.number().int().min(0).max(365).optional(),
});

export async function POST(request: Request) {
  try {
    const user = requireWriteAccess(await requireUser());
    const { ids, action, status, assignedToId, tag, days } = bulkSchema.parse(await request.json());

    switch (action) {
      case "status": {
        if (!status) throw new HttpError(422, "Statut manquant");
        await prisma.lead.updateMany({ where: { id: { in: ids } }, data: { status } });
        await Promise.all(
          ids.map((leadId) =>
            logActivity({ leadId, userId: user.id, type: "STATUS_CHANGE", title: `Statut → ${status} (action groupée)` }),
          ),
        );
        break;
      }
      case "assign": {
        await prisma.lead.updateMany({ where: { id: { in: ids } }, data: { assignedToId: assignedToId ?? null } });
        break;
      }
      case "tag": {
        if (!tag) throw new HttpError(422, "Tag manquant");
        const leads = await prisma.lead.findMany({ where: { id: { in: ids } }, select: { id: true, tags: true } });
        await Promise.all(
          leads
            .filter((l) => !l.tags.includes(tag))
            .map((l) => prisma.lead.update({ where: { id: l.id }, data: { tags: { push: tag } } })),
        );
        break;
      }
      case "followUp": {
        const offset = (days ?? 3) * 86_400_000;
        await prisma.lead.updateMany({
          where: { id: { in: ids } },
          data: { nextFollowUpAt: new Date(Date.now() + offset) },
        });
        break;
      }
      case "delete": {
        if (user.role !== "ADMIN") throw new HttpError(403, "Seul un admin peut supprimer");
        await prisma.lead.deleteMany({ where: { id: { in: ids } } });
        break;
      }
    }

    return ok({ updated: ids.length });
  } catch (err) {
    return handleError(err);
  }
}
