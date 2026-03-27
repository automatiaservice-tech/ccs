import { getClients } from '@/lib/actions/clients'
import { ClientsTable } from './clients-table'

export default async function ClientsPage() {
  const clients = await getClients()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Clientes</h1>
          <p className="text-slate-400 text-sm mt-1">{clients.length} clientes registrados</p>
        </div>
      </div>

      <ClientsTable initialClients={clients} />
    </div>
  )
}
