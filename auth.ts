import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from '@/data/prisma';
import type { AuthOptions } from 'next-auth';

export type SafeUser = {
  id: string; name: string; username: string; admin: boolean;
  score: number; percent: number; topicGroupId: string; group: string; isArchive: boolean;
};
declare module 'next-auth' {
  interface User extends SafeUser { loginMode?: string }
  interface Session { user?: SafeUser }
}
export const publicUserSelect = {
  id: true, name: true, username: true, admin: true, score: true, percent: true,
  topicGroupId: true, group: true, isArchive: true,
} as const;
const loginMode = 'username-v1';
const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  pages: { signIn: '/login' },
  providers: [CredentialsProvider({
    credentials: { username: { type: 'text' } },
    async authorize(credentials) {
      const username = credentials?.username?.trim();
      if (!username || username.length > 128) return null;
      const users = await prisma.user.findMany({ where: { username }, take: 2, select: publicUserSelect });
      if (users.length !== 1 || users[0].isArchive) return null;
      return { ...users[0], loginMode };
    },
  })],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.sub = user.id; token.loginMode = loginMode; }
      return token;
    },
    async session({ session, token }) {
      if (token.loginMode !== loginMode || typeof token.sub !== 'string' || !/^[a-f\d]{24}$/i.test(token.sub)) return { ...session, user: undefined };
      const user = await prisma.user.findUnique({ where: { id: token.sub }, select: publicUserSelect });
      return { ...session, user: user && !user.isArchive ? user : undefined };
    },
  },
};
export default authOptions;
