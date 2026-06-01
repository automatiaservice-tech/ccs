import { notFound } from 'next/navigation'
import { getInvoiceById } from '@/lib/actions/billing'
import { InvoiceDetail } from './invoice-detail'

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string>>
}) {
  const { id } = await params
  const sp = await searchParams
  const qs = new URLSearchParams(sp).toString()
  const backUrl = qs ? `/billing?${qs}` : '/billing'

  try {
    const invoice = await getInvoiceById(id)
    return <InvoiceDetail invoice={invoice} backUrl={backUrl} />
  } catch {
    notFound()
  }
}
