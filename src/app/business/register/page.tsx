import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { BusinessRegisterForm } from '@/components/business-register-form'

export const metadata: Metadata = { title: 'List your business' }

export default async function BusinessRegisterPage() {
  const session = await auth()
  if (!session?.user) redirect('/login?next=/business/register')

  const categories = await db.category.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <div className="mx-auto px-4 py-10" style={{ maxWidth: '768px' }}>
      <h1 className="text-3xl font-bold">List your business</h1>
      <p className="mt-2 text-muted">
        Add your business to TrustIndex so customers can find and review you. Our team checks every
        listing first — you get an email the moment yours is <strong>approved</strong>.
      </p>

      <div className="mt-8 rounded-2xl border bg-surface p-6 sm:p-8">
        <BusinessRegisterForm categories={categories} />
      </div>
    </div>
  )
}
