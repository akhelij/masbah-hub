import { handleError, ok, requireUser, requireWriteAccess } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { automationSchema } from "@/lib/validators";

export async function GET() {
  try {
    await requireUser();
    const [automations, logs] = await Promise.all([
      prisma.automation.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.webhookLog.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
    ]);
    return ok({ automations, logs });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request) {
  try {
    requireWriteAccess(await requireUser());
    const input = automationSchema.parse(await request.json());
    const automation = await prisma.automation.create({
      data: {
        ...input,
        conditions: input.conditions ?? undefined,
        actionConfig: input.actionConfig ?? undefined,
      },
    });
    return ok(automation, 201);
  } catch (err) {
    return handleError(err);
  }
}
