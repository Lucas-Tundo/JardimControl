import { requireUser } from "@/lib/auth";
import { RoleShell } from "@/components/role-shell";

export default async function SharedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <RoleShell user={user}>{children}</RoleShell>;
}
