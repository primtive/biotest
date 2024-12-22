import CredentialsProvider from "next-auth/providers/credentials";
// import { compare } from 'bcrypt';
import prisma from "@/data/prisma";
import { AuthOptions } from "next-auth";

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
        password: {},
      },
      async authorize(credentials, req) {
        if (!credentials) throw new Error("no credentials")
        const user = await prisma.user.findFirst({
          where: {
            username: credentials!.username,
          }
        });
        if (user) {
          const passwordCorrect = credentials!.password == user.password;
          if (passwordCorrect) {
            return {
              id: user.id,
              name: user.name,
              username: user.username,
            };
          } else {
            throw new Error("Неверный пароль")
          }
        } else {
          throw new Error("Пользователь не найден");
        }
      }
    })
  ],
  callbacks: {
    async session({ session, token, user }) {
      // console.log(session);
      return session
    },
    async jwt({ token, user, account, profile, isNewUser }) {
      // console.log("jwt: ", {token, user});
      token.id = user?.id
      return token
    }
  }
};

export default authOptions;