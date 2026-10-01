import { redirect } from "next/navigation";
import { isLeader, requireUser } from "@/lib/auth";
import { RoleShell } from "@/components/role-shell";

export default async function GardenerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (isLeader(user)) redirect("/painel");
  return <RoleShell user={user}>{children}</RoleShell>;
}
