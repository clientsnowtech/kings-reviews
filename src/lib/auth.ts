import NextAuth from 'next-auth'
import type { Role } from '@prisma/client'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { db } from './db'
import { loginSchema } from './validations'
import { verifyCode, parseBackupCodes, spendBackupCode } from './totp'
import { callerIp, loginAttempt } from './rate-limit'

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, code: {} },
      async authorize(creds, request) {
        const parsed = loginSchema.safeParse(creds)
        if (!parsed.success) return null

        // This endpoint is reachable without the login form, so the precheck's
        // limiter is not enough on its own — an attacker would simply POST here
        // and guess forever. Same buckets as loginPrecheck(), so the two paths
        // share one allowance instead of handing an attacker both.
        if (!loginAttempt(parsed.data.email, await callerIp(request.headers))) return null

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        })
        if (!user?.password) return null
        const ok = await bcrypt.compare(parsed.data.password, user.password)
        if (!ok) return null

        // Second factor, when the account has one. The login form asks for the
        // code in a second step (see loginPrecheck) and sends it back here, so
        // the password alone never mints a session.
        if (user.twoFactorEnabled) {
          const code = typeof creds?.code === 'string' ? creds.code : ''
          if (!code) return null

          const byApp = user.twoFactorSecret ? verifyCode(user.twoFactorSecret, code) : false
          if (!byApp) {
            const left = spendBackupCode(parseBackupCodes(user.twoFactorCodes), code)
            if (!left) return null
            // a backup code is spent the moment it works
            await db.user.update({
              where: { id: user.id },
              data: { twoFactorCodes: JSON.stringify(left) },
            })
          }
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        }
      },
    }),
    // Enabled only when Google OAuth credentials are configured in the env.
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [Google({ allowDangerousEmailAccountLinking: true })]
      : []),
  ],
  callbacks: {
    // Ensure OAuth (Google) sign-ins have a matching row in our users table.
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        if (!user.email) return false
        await db.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name ?? undefined,
            image: user.image ?? undefined,
            emailVerified: new Date(),
          },
          create: {
            email: user.email,
            name: user.name ?? null,
            image: user.image ?? null,
            emailVerified: new Date(),
            role: 'USER',
          },
        })
      }
      return true
    },
    async jwt({ token, user }) {
      // On sign-in the freshly authorized user is present. Normalise to our DB
      // user by email so OAuth logins carry our id + role, not the provider's.
      if (user) {
        const email = user.email ?? (token.email as string | undefined)
        const dbUser = email
          ? await db.user.findUnique({ where: { email }, select: { id: true, role: true } })
          : null
        token.id = dbUser?.id ?? (user.id as string)
        token.role = (dbUser?.role ?? (user as { role?: Role }).role ?? 'USER') as Role
        return token
      }
      // On later requests keep role in sync with the DB so in-session
      // changes (e.g. USER promoted to BUSINESS after listing, or an
      // admin editing a role) take effect without a re-login.
      if (token.id) {
        const fresh = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        })
        // User deleted → invalidate the token.
        if (!fresh) return null
        token.role = fresh.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
      }
      return session
    },
  },
})
