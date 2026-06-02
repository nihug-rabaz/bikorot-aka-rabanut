import { PrismaAdapter } from "@auth/prisma-adapter"
import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import { LOG_EVENTS } from "@/lib/logging/events"
import { writeAppLog } from "@/lib/logging/logger"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],
  // חשוב: כשמשתמשים ב-Adapter ורוצים להשתמש ב-role בתוך ה-JWT
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/auth/signin', // מפנה לדף המעוצב שלך
    error: '/auth/signin',  // מציג שגיאות בתוך הדף המעוצב
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        await writeAppLog({
          level: "WARN",
          eventType: LOG_EVENTS.authLoginFailure,
          status: "FAIL",
          source: "auth.signIn",
          action: "Google sign in blocked",
          message: "Login failed because provider did not return user email.",
          actor: {
            email: user.email ?? undefined,
            name: user.name ?? undefined,
          },
        })
        return false;
      }

      try {
        const normalizedEmail = user.email.toLowerCase()
        const authorizedInspector = await prisma.inspector.findFirst({
          where: { email: normalizedEmail },
        });

        if (!authorizedInspector) {
          await writeAppLog({
            level: "WARN",
            eventType: LOG_EVENTS.authLoginFailure,
            status: "FAIL",
            source: "auth.signIn",
            action: "Google sign in denied",
            message: "Login denied because inspector account was not found.",
            actor: {
              email: normalizedEmail,
              name: user.name ?? undefined,
            },
          })
          return false
        }

        return true
      } catch (error) {
        await writeAppLog({
          level: "ERROR",
          eventType: LOG_EVENTS.serverException,
          status: "FAIL",
          source: "auth.signIn",
          action: "Sign in callback exception",
          message: error instanceof Error ? error.message : "Unknown sign in error",
          actor: {
            email: user.email ?? undefined,
            name: user.name ?? undefined,
          },
        })
        return false
      }
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const inspector = await prisma.inspector.findFirst({
          where: { email: user.email },
        });
        token.role = inspector?.role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}