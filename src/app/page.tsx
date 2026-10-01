import { redirect } from "next/navigation";
import { getCurrentUser, isLeader } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(isLeader(user) ? "/painel" : "/minhas-tarefas");
}
