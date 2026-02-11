// lib/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
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
    // DEV ONLY: Credentials provider for testing
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

        // DEV ONLY: Accept password "dev123"
        if (credentials.password !== "dev123") {
          return null;
        }

        // Find or create user
        let user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) {
          // Auto-create user for dev
          user = await prisma.user.create({
            data: {
              email: credentials.email as string,
              name: (credentials.email as string).split("@")[0],
              role: "ANALYST", // Default role for dev users
              tenantId: null, // Will be assigned by admin
            },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      console.log('🔑 JWT callback triggered:', { trigger, hasUser: !!user, tokenId: token.id });

      // When user signs in, add their data to the token
      if (user) {
        token.id = user.id;
        console.log('📝 User signed in, token.id set to:', user.id);
      }

      // Always fetch fresh user data to get role, tenant, etc.
      if (token.id) {
        console.log('🔍 Fetching user from DB with id:', token.id);
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          include: { tenant: { select: { id: true, name: true, slug: true } } },
        });

        console.log('👤 DB User found:', dbUser ? {
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role,
          tenantId: dbUser.tenantId,
          hasTenant: !!dbUser.tenant
        } : 'NULL');

        if (dbUser) {
          token.role = dbUser.role;
          token.tenantId = dbUser.tenantId;
          token.tenant = dbUser.tenant;
          token.name = dbUser.name;
          token.email = dbUser.email;
          console.log('✅ Token updated:', { role: token.role, tenantId: token.tenantId });
        }
      }

      return token;
    },

    async session({ session, token }) {
      console.log('📦 Session callback - Token data:', {
        id: token.id,
        role: token.role,
        tenantId: token.tenantId,
        hasTenant: !!token.tenant
      });

      // Transfer token data to session
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.tenantId = token.tenantId as string | null;
        session.user.tenant = token.tenant as any;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
      }

      console.log('✨ Session created:', {
        userId: session.user.id,
        role: session.user.role,
        tenantId: session.user.tenantId
      });

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
    strategy: "jwt", // Changed to JWT to support Credentials provider
  },
});

// Type augmentation for session and JWT
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

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "OWNER" | "ADMIN" | "ANALYST" | "VIEWER";
    tenantId?: string | null;
    tenant?: { id: string; name: string; slug: string } | null;
  }
}
