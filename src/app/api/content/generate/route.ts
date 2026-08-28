import { handleError, ok, requireUser, requireWriteAccess } from "@/lib/api";
import { generateContentPost } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { generateContentSchema } from "@/lib/validators";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    requireWriteAccess(await requireUser());
    const input = generateContentSchema.parse(await request.json());

    const generated = await generateContentPost({
      postType: input.postType,
      platform: input.platform,
      topic: input.topic,
      language: input.language,
      extraInstructions: input.extraInstructions ?? null,
    });

    if (!input.save) return ok({ generated });

    const post = await prisma.contentPost.create({
      data: {
        title: generated.title,
        content: generated.content,
        contentAr: generated.contentAr,
        hashtags: generated.hashtags,
        imagePrompt: generated.imagePrompt,
        platform: input.platform,
        postType: input.postType,
        status: "DRAFT",
        aiGenerated: true,
        aiPrompt: `${input.postType} · ${input.platform} · ${input.topic} · ${input.language}`,
      },
    });

    return ok({ generated, post }, 201);
  } catch (err) {
    return handleError(err);
  }
}
