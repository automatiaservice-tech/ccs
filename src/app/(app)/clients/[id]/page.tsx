import { notFound } from 'next/navigation'
import { getClientById, getClientAttendance, getClientInvoices } from '@/lib/actions/clients'
import { ClientDetail } from './client-detail'

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let client, attendance, invoices

  try {
    client = await getClientById(id)
  } catch (err: any) {
    // Show the real Supabase error instead of generic 404
    // so we can diagnose column/permission issues
    return (
      <div className="p-6 rounded-lg border border-red-200 bg-red-50 max-w-2xl">
        <h2 className="text-red-700 font-semibold mb-2">Error al cargar el cliente</h2>
        <pre className="text-xs text-red-600 whitespace-pre-wrap break-all">
          {err?.message ?? String(err)}
        </pre>
        <p className="text-xs text-red-500 mt-3">
          Código: {err?.code} · Hint: {err?.hint}
        </p>
      </div>
    )
  }

  if (!client) return notFound()

  try {
    ;[attendance, invoices] = await Promise.all([
      getClientAttendance(id),
      getClientInvoices(id),
    ])
  } catch (err: any) {
    return (
      <div className="p-6 rounded-lg border border-red-200 bg-red-50 max-w-2xl">
        <h2 className="text-red-700 font-semibold mb-2">Error al cargar datos del cliente</h2>
        <pre className="text-xs text-red-600 whitespace-pre-wrap break-all">
          {err?.message ?? String(err)}
        </pre>
        <p className="text-xs text-red-500 mt-3">
          Código: {err?.code} · Hint: {err?.hint}
        </p>
      </div>
    )
  }

  return (
    <ClientDetail
      client={client}
      attendance={attendance ?? []}
      invoices={invoices ?? []}
    />
  )
}
