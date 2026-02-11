// lib/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID || "common"}/v2.0`,
    }),
  ],

  callbacks: {
    async session({ session, user }) {
      // Attach user ID, role, and tenant to session
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { tenant: { select: { id: true, name: true, slug: true } } },
      });

      if (dbUser) {
        session.user.id = dbUser.id;
        session.user.role = dbUser.role;
        session.user.tenantId = dbUser.tenantId;
        session.user.tenant = dbUser.tenant;
      }

      return session;
    },

    async signIn({ user, account }) {
      // Auto-assign new users: check if email domain matches a tenant
      // For now, new users get no tenant (you assign them in admin)
      return true;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "database",
  },
});

// Type augmentation for session
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      role: "OWNER" | "ADMIN" | "ANALYST" | "VIEWER";
      tenantId: string | null;
      tenant: { id: string; name: string; slug: string } | null;
    };
  }
}
