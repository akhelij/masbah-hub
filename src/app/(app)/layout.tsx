import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AppShell
      user={{
        name: session.user.name ?? "Utilisateur",
        email: session.user.email ?? "",
        role: session.user.role ?? "OPERATOR",
      }}
    >
      {children}
    </AppShell>
  );
}
