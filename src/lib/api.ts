import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { prisma } from "./prisma";

export type SessionUser = { id: string; name: string; email: string; role: string };

export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: (session.user as { role?: string }).role ?? "OPERATOR",
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Non authentifié");
  return user;
}

export function requireWriteAccess(user: SessionUser) {
  if (user.role === "VIEWER") throw new HttpError(403, "Accès en lecture seule");
  return user;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** Webhook auth: `x-api-key` matching WEBHOOK_API_KEY or a stored ApiKey row. */
export async function requireApiKey(request: Request) {
  const provided = request.headers.get("x-api-key") ?? "";
  if (!provided) throw new HttpError(401, "Missing x-api-key header");

  const envKey = process.env.WEBHOOK_API_KEY;
  if (envKey && provided === envKey) return;

  const record = await prisma.apiKey.findUnique({ where: { key: provided } });
  if (!record || record.revokedAt) throw new HttpError(401, "Invalid API key");
  await prisma.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });
}

export function handleError(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation échouée", details: err.flatten().fieldErrors },
      { status: 422 },
    );
  }
  if (err instanceof Error && err.name === "AINotConfiguredError") {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }
  console.error("[api] unhandled:", err);
  const message = err instanceof Error ? err.message : "Erreur serveur";
  return NextResponse.json({ error: message }, { status: 500 });
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
