import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe half of the Auth.js config: no Prisma, no bcrypt.
 * `middleware.ts` uses this alone; `auth.ts` extends it with providers.
 */
export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const { pathname } = nextUrl;
      // API routes authenticate themselves and answer with JSON 401s —
      // redirecting them to /login would break every fetch() caller.
      const isPublic = pathname.startsWith("/login") || pathname.startsWith("/api");
      if (isPublic) return true;
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: string }).role ?? "OPERATOR";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "OPERATOR";
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
