"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createToken, SESSION_COOKIE, SESSION_DAYS } from "@/lib/session";
import { fail, str, type ActionResult } from "@/lib/action-utils";

export async function login(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const loginName = str(form, "login").toLowerCase();
  const password = str(form, "password");
  const next = str(form, "next");
  if (!loginName || !password) return fail("Informe usuário e senha.");

  const user = await db.user.findUnique({ where: { login: loginName } });
  if (!user || !user.active || !bcrypt.compareSync(password, user.passwordHash)) {
    return fail("Usuário ou senha inválidos.");
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, createToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });

  const home = user.role === "JARDINEIRO" ? "/minhas-tarefas" : "/painel";
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : home);
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
