import { requireLeader } from "@/lib/auth";
import { RoleShell } from "@/components/role-shell";

export default async function LeaderLayout({ children }: { children: React.ReactNode }) {
  const user = await requireLeader();
  return <RoleShell user={user}>{children}</RoleShell>;
}
