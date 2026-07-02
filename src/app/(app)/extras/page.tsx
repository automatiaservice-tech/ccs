import { getExtraPayments } from '@/lib/actions/extras'
import { ExtrasClient } from './extras-client'

export default async function ExtrasPage() {
  const payments = await getExtraPayments().catch(() => [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Cobros extra</h1>
        <p className="text-[#64748B] text-sm mt-1">Gestiona cobros extraordinarios fuera de la facturación habitual</p>
      </div>
      <ExtrasClient initialPayments={payments} />
    </div>
  )
}
