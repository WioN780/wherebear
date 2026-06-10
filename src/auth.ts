import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/shared/lib/db";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { encode } from "next-auth/jwt";

import { config } from "@/shared/lib/config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(
    prisma as unknown as Parameters<typeof PrismaAdapter>[0],
  ),
  providers: [
    Google({
      clientId: config.auth.google.clientId,
      clientSecret: config.auth.google.clientSecret,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user || !user.password) {
            return null;
          }

          const isValid = await bcrypt.compare(password, user.password);

          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          };
        } catch (err) {
          console.error("Auth authorize error, falling back:", err);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  jwt: {
    async encode(params) {
      const token = await encode(params);
      if (params.token && params.token.id) {
        const userId = params.token.id as string;
        const expires = new Date(
          Date.now() + (params.maxAge ?? 30 * 24 * 60 * 60) * 1000,
        );
        try {
          await prisma.session.upsert({
            where: { sessionToken: token },
            update: { expires },
            create: {
              sessionToken: token,
              userId,
              expires,
            },
          });
        } catch (err) {
          console.error("Failed to save session to database:", err);
        }
      }
      return token;
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: config.auth.secret,
  pages: {
    signIn: "/login",
  },
});
export default NextAuth;
