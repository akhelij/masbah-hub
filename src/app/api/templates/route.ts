import { handleError, ok, requireUser, requireWriteAccess } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { templateSchema } from "@/lib/validators";

export async function GET() {
  try {
    await requireUser();
    const templates = await prisma.template.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
    return ok({ templates });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request) {
  try {
    requireWriteAccess(await requireUser());
    const input = templateSchema.parse(await request.json());
    const variables = [...new Set([...input.body.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]))];
    const template = await prisma.template.create({ data: { ...input, variables } });
    return ok(template, 201);
  } catch (err) {
    return handleError(err);
  }
}
