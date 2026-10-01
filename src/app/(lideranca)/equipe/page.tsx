import { TeamDialogButton, ToggleUserButton, UserDialogButton } from "@/components/team-forms";
import { PageHeader, Section, cn } from "@/components/ui";
import { isAdmin, requireLeader } from "@/lib/auth";
import { ROLES, type Role } from "@/lib/constants";
import { startOfMonth } from "@/lib/dates";
import { db } from "@/lib/db";
import { plural } from "@/lib/text";

export const metadata = { title: "Equipe e usuários" };

const ROLE_STYLE: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-800",
  LIDER: "bg-sky-100 text-sky-800",
  JARDINEIRO: "bg-brand-100 text-brand-800",
};

export default async function TeamPage() {
  const me = await requireLeader();
  const admin = isAdmin(me);
  const monthStart = startOfMonth(new Date());

  const [users, teams, doneByUser, openByUser] = await Promise.all([
    db.user.findMany({ include: { memberships: { include: { team: { select: { id: true, name: true, color: true } } } } }, orderBy: [{ active: "desc" }, { name: "asc" }] }),
    db.team.findMany({ include: { members: { include: { user: { select: { id: true, name: true, active: true } } } }, _count: { select: { tasks: true } } }, orderBy: { name: "asc" } }),
    db.task.groupBy({ by: ["assigneeUserId"], where: { deletedAt: null, status: "CONCLUIDA", approvedAt: { gte: monthStart } }, _count: true }),
    db.task.groupBy({ by: ["assigneeUserId"], where: { deletedAt: null, status: { in: ["PENDENTE", "EM_ANDAMENTO", "ATRASADA"] } }, _count: true }),
  ]);
  const done = new Map(doneByUser.map((d) => [d.assigneeUserId, d._count]));
  const open = new Map(openByUser.map((d) => [d.assigneeUserId, d._count]));
  const teamOptions = teams.map((t) => ({ id: t.id, name: t.name }));
  const gardenerOptions = users.filter((u) => u.active).map((u) => ({ id: u.id, name: `${u.name}${u.role !== "JARDINEIRO" ? ` (${ROLES[u.role as Role]})` : ""}` }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipe e usuários"
        subtitle="Perfis de acesso, jardineiros e equipes de trabalho"
        actions={
          <div className="flex gap-2.5">
            <TeamDialogButton label="Nova equipe" users={gardenerOptions} className="btn-secondary" />
            {admin && <UserDialogButton label="Novo usuário" teams={teamOptions} />}
          </div>
        }
      />

      {!admin && <p className="rounded-[10px] bg-sky-50 p-3 text-sm text-sky-900">Somente administradores podem cadastrar ou alterar usuários. Você pode gerenciar as equipes.</p>}

      <Section title={<>Usuários <span className="font-normal tabular-nums text-stone-500">{users.length}</span></>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                <th className="py-2 pr-3 font-medium">Nome</th>
                <th className="py-2 pr-3 font-medium">Login</th>
                <th className="py-2 pr-3 font-medium">Perfil</th>
                <th className="py-2 pr-3 font-medium">Equipes</th>
                <th className="py-2 pr-3 text-center font-medium">Abertas</th>
                <th className="py-2 pr-3 text-center font-medium">Concluídas no mês</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((u) => (
                <tr key={u.id} className={cn(!u.active && "opacity-50")}>
                  <td className="py-2.5 pr-3 font-medium text-stone-900">
                    {u.name}
                    {!u.active && <span className="ml-2 chip bg-stone-200 text-stone-600">Inativo</span>}
                    {u.phone && <span className="block text-xs font-normal text-stone-500">{u.phone}</span>}
                  </td>
                  <td className="py-2.5 pr-3 text-stone-600">{u.login}</td>
                  <td className="py-2.5 pr-3">
                    <span className={cn("chip", ROLE_STYLE[u.role])}>{ROLES[u.role as Role]}</span>
                  </td>
                  <td className="py-2.5 pr-3 text-stone-600">{u.memberships.map((m) => m.team.name).join(", ") || "-"}</td>
                  <td className="py-2.5 pr-3 text-center tabular-nums text-stone-900">{open.get(u.id) ?? 0}</td>
                  <td className="py-2.5 pr-3 text-center tabular-nums text-stone-900">{done.get(u.id) ?? 0}</td>
                  <td className="py-2.5 text-right">
                    {admin && (
                      <div className="flex justify-end gap-1">
                        <UserDialogButton
                          label="Editar"
                          className="btn-ghost min-h-9 px-3 text-sm"
                          teams={teamOptions}
                          initial={{ id: u.id, name: u.name, login: u.login, role: u.role, email: u.email, phone: u.phone, teamIds: u.memberships.map((m) => m.teamId) }}
                        />
                        {u.id !== me.id && <ToggleUserButton id={u.id} active={u.active} />}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <div>
        <h2 className="section-title mb-3">Equipes <span className="font-normal tabular-nums text-stone-500">{teams.length}</span></h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((t) => (
            <div key={t.id} className="card card-pad">
              <div className="flex items-start justify-between gap-2">
                <h3 className="flex items-center gap-2 font-semibold text-stone-900">
                  <span className="h-3 w-3 rounded-full" style={{ background: t.color }} />
                  {t.name}
                </h3>
                <TeamDialogButton
                  label="Editar"
                  className="btn-ghost min-h-9 px-3 text-sm"
                  users={gardenerOptions}
                  initial={{ id: t.id, name: t.name, description: t.description, color: t.color, memberIds: t.members.map((m) => m.userId) }}
                />
              </div>
              {t.description && <p className="text-sm text-stone-500">{t.description}</p>}
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {t.members.map((m) => (
                  <li key={m.id} className={cn("chip bg-stone-100 text-stone-700", !m.user.active && "line-through opacity-60")}>
                    {m.user.name}
                  </li>
                ))}
                {t.members.length === 0 && <li className="text-sm text-stone-400">Sem membros</li>}
              </ul>
              <p className="mt-3 text-xs text-stone-400">{plural(t._count.tasks, "tarefa atribuída", "tarefas atribuídas")} à equipe</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
