import { z } from "zod";
import { handleError, HttpError, ok, requireUser } from "@/lib/api";
import { isAIConfigured } from "@/lib/ai";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  key: z.string().min(1),
  value: z.record(z.any()),
});

export async function GET() {
  try {
    await requireUser();
    const [settings, users, apiKeys] = await Promise.all([
      prisma.setting.findMany(),
      prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.apiKey.findMany({
        select: { id: true, name: true, lastUsedAt: true, revokedAt: true, createdAt: true },
      }),
    ]);

    return ok({
      settings: Object.fromEntries(settings.map((s) => [s.key, s.value])),
      users,
      apiKeys,
      integrations: {
        anthropic: isAIConfigured(),
        googleMaps: Boolean(process.env.GOOGLE_MAPS_API_KEY),
        whatsapp: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
        smtp: Boolean(process.env.SMTP_HOST),
        googleOAuth: Boolean(process.env.GOOGLE_CLIENT_ID),
        webhookKey: Boolean(process.env.WEBHOOK_API_KEY),
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "ADMIN") throw new HttpError(403, "Réservé aux administrateurs");
    const { key, value } = patchSchema.parse(await request.json());
    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return ok(setting);
  } catch (err) {
    return handleError(err);
  }
}
