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

  try {
    const [client, attendance, invoices] = await Promise.all([
      getClientById(id),
      getClientAttendance(id),
      getClientInvoices(id),
    ])

    return (
      <ClientDetail
        client={client}
        attendance={attendance ?? []}
        invoices={invoices ?? []}
        backUrl={back ? `/clients${decodeURIComponent(back)}` : '/clients'}
      />
    )
  } catch {
    notFound()
  }
}
