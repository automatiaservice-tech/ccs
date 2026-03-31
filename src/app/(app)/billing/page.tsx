import { getInvoices } from '@/lib/actions/billing'
import { BillingClient } from './billing-client'

export default async function BillingPage() {
  const invoices = await getInvoices()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Facturación</h1>
        <p className="text-[#64748B] text-sm mt-1">{invoices.length} facturas en total</p>
      </div>

      <BillingClient initialInvoices={invoices} />
    </div>
  )
}
