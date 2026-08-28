import type { NextRequest } from "next/server";
import { handleError, ok, requireUser } from "@/lib/api";
import { getAnalyticsData, getDashboardData } from "@/lib/analytics";

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const scope = request.nextUrl.searchParams.get("scope") ?? "all";

    if (scope === "dashboard") return ok(await getDashboardData());
    if (scope === "performance") return ok(await getAnalyticsData());

    const [dashboard, performance] = await Promise.all([getDashboardData(), getAnalyticsData()]);
    return ok({ dashboard, performance });
  } catch (err) {
    return handleError(err);
  }
}
