import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import { createHash } from "node:crypto";
import prisma from "@/data/prisma";
import { getMongoDb } from "@/data/mongo";
import type { AuthOptions } from "next-auth";

export type SafeUser = {
  id: string; name: string; username: string; admin: boolean;
  score: number; percent: number; topicGroupId: string; group: string; isArchive: boolean;
};
declare module "next-auth" {
  interface User extends SafeUser { authVersion?: string }
  interface Session { user?: SafeUser }
}
export const credentialVersion = (hash: string) => createHash("sha256").update(hash).digest("hex");
export const publicUserSelect = {
  id: true, name: true, username: true, admin: true, score: true, percent: true,
  topicGroupId: true, group: true, isArchive: true,
} as const;
const dummyHash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxUd6jcllYpHFG/rx.z9nWjz1i2";
const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [CredentialsProvider({
    credentials: { username: { type: "text" }, password: { type: "password" } },
    async authorize(credentials) {
      const username = credentials?.username?.trim();
      const password = credentials?.password;
      if (!username || username.length > 128 || !password || Buffer.byteLength(password, "utf8") > 72) return null;
      const db = await getMongoDb();
      const key = createHash("sha256").update(username).digest("hex");
      const now = new Date();
      const throttle = db.collection<{ _id: string; failures: number; expiresAt: Date }>("LoginThrottle");
      const previous = await throttle.findOne({ _id: key });
      if (previous && previous.expiresAt > now && previous.failures >= 10) return null;
      const users = await prisma.user.findMany({ where: { username }, take: 2, select: { ...publicUserSelect, password: true } });
      const user = users.length === 1 ? users[0] : undefined;
      const supported = !!user?.password && /^\$2[aby]\$\d{2}\$/.test(user.password);
      const valid = await compare(password, supported ? user!.password! : dummyHash);
      if (!user || user.isArchive || !supported || !valid) {
        await throttle.updateOne({ _id: key }, [{ $set: {
          failures: { $cond: [{ $gt: ["$expiresAt", now] }, { $add: [{ $ifNull: ["$failures", 0] }, 1] }, 1] },
          expiresAt: { $cond: [{ $gt: ["$expiresAt", now] }, "$expiresAt", new Date(now.valueOf() + 15 * 60_000)] },
        } }], { upsert: true });
        return null;
      }
      await throttle.deleteOne({ _id: key });
      const { password: hash, ...safe } = user;
      return { ...safe, authVersion: credentialVersion(hash!) };
    },
  })],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.sub = user.id; token.authVersion = user.authVersion; }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.sub !== "string" || !/^[a-f\d]{24}$/i.test(token.sub) || typeof token.authVersion !== "string") return { ...session, user: undefined };
      const user = await prisma.user.findUnique({ where: { id: token.sub }, select: { ...publicUserSelect, password: true } });
      if (!user?.password || user.isArchive || credentialVersion(user.password) !== token.authVersion) return { ...session, user: undefined };
      const { password: _password, ...safe } = user;
      return { ...session, user: safe };
    },
  },
};
export default authOptions;
