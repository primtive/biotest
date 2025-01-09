import CredentialsProvider from "next-auth/providers/credentials";
// import { compare } from 'bcrypt';
import prisma from "@/data/prisma";
import { AuthOptions, Session } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string
    name: string,
    username: string,
    admin: boolean,
    score: number,
    streak: number,
    percent: number
  }

  interface Session {
    user?: User;
  }
}

const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET as string,
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/login'
  },
  providers: [
    CredentialsProvider({
      credentials: {
        username: {},
      },
      async authorize(credentials, req) {
        if (!credentials) throw new Error("no credentials")
        const user = await prisma.user.findFirst({
          where: {
            username: credentials!.username,
          }
        });
        if (user) {
          return user
        } else {
          throw new Error("Пользователь не найден");
        }
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      const user = await prisma.user.findFirst({
        where: {
          id: token.sub
        }
      })

      const _session = user ? {
        ...session, user
      } : undefined;
      return _session as Session;
    },
    async jwt({ token, user }) {
      // console.log("jwt: ", {token, user});
      token.id = user?.id
      return token
    }
  }
};

export default authOptions;