import "server-only";
import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { z, ZodError } from "zod";
import authOptions, { type SafeUser } from "@/auth";
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const idSchema = z.string().regex(/^[a-f\d]{24}$/i, "Некорректный идентификатор").transform(value => value.toLowerCase());
export const parseId = (value: unknown) => idSchema.parse(value);
export const passwordSchema = z.string().min(8, "Пароль должен содержать минимум 8 символов").refine(value => Buffer.byteLength(value, "utf8") <= 72, "Пароль должен занимать не более 72 байт UTF-8");
export const getCurrentUser = cache(async (): Promise<SafeUser | null> => (await getServerSession(authOptions))?.user ?? null);
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (!user.admin) redirect("/");
  return user;
}
export function checkOrigin(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  const configured = new URL(process.env.NEXTAUTH_URL || request.url).origin;
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== configured)) throw new HttpError(403, "Запрос с другого сайта запрещён");
}
export async function getApiUser(request: Request, adminOnly = false) {
  checkOrigin(request);
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Войдите в аккаунт");
  if (adminOnly && !user.admin) throw new HttpError(403, "Недостаточно прав");
  return user;
}
export async function readJson(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 1_000_000) throw new HttpError(413, "Слишком большой запрос");
  const body = await request.text();
  if (Buffer.byteLength(body) > 1_000_000) throw new HttpError(413, "Слишком большой запрос");
  try { return JSON.parse(body); } catch { throw new HttpError(400, "Некорректный JSON"); }
}
export function apiError(error: unknown) {
  if (error instanceof HttpError) return Response.json({ message: error.message }, { status: error.status });
  if (error instanceof ZodError) return Response.json({ message: error.issues.map(item => item.message).join("; ") }, { status: 400 });
  if (error instanceof RangeError) return Response.json({ message: error.message }, { status: 400 });
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (code === "P2025") return Response.json({ message: "Запись не найдена" }, { status: 404 });
  if (["P2002", "11000"].includes(code)) return Response.json({ message: "Такая запись уже существует" }, { status: 409 });
  if (code === "P2023") return Response.json({ message: "Некорректный идентификатор" }, { status: 400 });
  console.error("API request failed", { type: error instanceof Error ? error.name : typeof error, code });
  return Response.json({ message: "Не удалось выполнить запрос" }, { status: 500 });
}
export const secretUserIds = ["678017cadefdce0d7375bf07", "6784f9d99bbfbb23d367b5e0"];
