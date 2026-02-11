import { PrismaAdapter } from "@auth/prisma-adapter"
import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"

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
      if (!user.email) return false;

      // בדיקה אם המשתמש קיים בטבלת ה-Inspector (מורשה כניסה)
      const authorizedInspector = await prisma.inspector.findFirst({
        where: { email: user.email },
      });

      return !!authorizedInspector;
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