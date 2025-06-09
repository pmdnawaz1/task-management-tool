import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import { type JWT } from "next-auth/jwt";
import DiscordProvider from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { db } from "~/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: string;
      image?: string | null;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
export const authConfig = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log('🔐 Attempting authentication with credentials:', {
          email: credentials?.email,
          hasPassword: !!credentials?.password
        });

        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing email or password');
          return null;
        }

        console.log('🔍 Looking up user in database...');
        const user = await db.user.findUnique({
          where: {
            email: credentials.email
          }
        });

        console.log('👤 User found:', {
          found: !!user,
          hasPassword: !!user?.password,
          email: user?.email
        });

        if (!user || !user.password) {
          console.log('❌ User not found or no password');
          return null;
        }

        console.log('🔑 Comparing passwords...');
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        console.log('✅ Password validation result:', isPasswordValid);

        if (!isPasswordValid) {
          console.log('❌ Password invalid');
          return null;
        }

        console.log('🎉 Authentication successful for user:', user.email);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    }),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    DiscordProvider,
  ],
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(db) as any,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }: { session: DefaultSession; token: JWT }) {
      console.log('Session callback called for user:', token.id);
      if (token.id) {
        // Fetch fresh user data from database
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        });
        
        console.log('Fresh user data from DB:', { 
          found: !!dbUser,
          name: dbUser?.name, 
          image: dbUser?.image 
        });
        
        if (dbUser) {
          const updatedSession = {
            ...session,
            user: {
              ...session.user,
              id: dbUser.id,
              name: dbUser.name,
              email: dbUser.email,
              image: dbUser.image,
              role: dbUser.role,
            },
          };
          console.log('Returning updated session:', { 
            name: updatedSession.user.name, 
            image: updatedSession.user.image 
          });
          return updatedSession;
        }
      }
      
      console.log('Returning original session');
      return session;
    },
  },
} satisfies NextAuthConfig;
