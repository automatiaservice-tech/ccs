import { notFound } from 'next/navigation'
import { getClientById, getClientAttendance, getClientInvoices } from '@/lib/actions/clients'
import { ClientDetail } from './client-detail'

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ back?: string }>
}) {
  const { id } = await params
  const { back } = await searchParams

  const client = await getClientById(id).catch(() => null)
  if (!client) notFound()

  const [attendance, invoices] = await Promise.all([
    getClientAttendance(id).catch(() => []),
    getClientInvoices(id).catch(() => []),
  ])

  let backUrl = '/clients'
  if (back) {
    try {
      backUrl = `/clients${decodeURIComponent(back)}`
    } catch {
      // back param malformed — fall back to /clients
    }
  }

  return (
    <ClientDetail
      client={client}
      attendance={attendance ?? []}
      invoices={invoices ?? []}
      backUrl={backUrl}
    />
  )
}
