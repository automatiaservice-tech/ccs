import { notFound } from 'next/navigation'
import { getClientById, getClientAttendance, getClientInvoices } from '@/lib/actions/clients'
import { ClientDetail } from './client-detail'

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const [client, attendance, invoices] = await Promise.all([
      getClientById(id),
      getClientAttendance(id),
      getClientInvoices(id),
    ])

    return <ClientDetail client={client} attendance={attendance} invoices={invoices} />
  } catch {
    notFound()
  }
}
