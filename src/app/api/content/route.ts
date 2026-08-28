import type { NextRequest } from "next/server";
import { handleError, ok, requireUser, requireWriteAccess } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { contentSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const sp = request.nextUrl.searchParams;
    const status = sp.get("status");
    const platform = sp.get("platform");

    const posts = await prisma.contentPost.findMany({
      where: {
        ...(status && status !== "ALL" ? { status: status as never } : {}),
        ...(platform && platform !== "ALL" ? { platform: platform as never } : {}),
      },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
    });
    return ok({ posts });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request) {
  try {
    requireWriteAccess(await requireUser());
    const input = contentSchema.parse(await request.json());
    const post = await prisma.contentPost.create({ data: input });
    return ok(post, 201);
  } catch (err) {
    return handleError(err);
  }
}
