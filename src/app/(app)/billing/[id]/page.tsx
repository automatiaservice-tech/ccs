import { notFound } from 'next/navigation'
import { getInvoiceById } from '@/lib/actions/billing'
import { InvoiceDetail } from './invoice-detail'

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const invoice = await getInvoiceById(id)
    return <InvoiceDetail invoice={invoice} />
  } catch {
    notFound()
  }
}
