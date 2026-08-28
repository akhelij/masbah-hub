import { handleError, ok, requireUser } from "@/lib/api";
import { generateContentIdeas } from "@/lib/ai";

export const maxDuration = 60;

export async function POST() {
  try {
    await requireUser();
    const ideas = await generateContentIdeas(7);
    return ok({ ideas });
  } catch (err) {
    return handleError(err);
  }
}
