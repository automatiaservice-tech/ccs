import { getClients } from '@/lib/actions/clients'
import { ClientsTable } from './clients-table'

export default async function ClientsPage() {
  const clients = await getClients()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Clientes</h1>
          <p className="text-[#64748B] text-sm mt-1">{clients.length} clientes registrados</p>
        </div>
      </div>

      <ClientsTable initialClients={clients} />
    </div>
  )
}
