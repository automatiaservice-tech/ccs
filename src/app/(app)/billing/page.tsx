import { getInvoices } from '@/lib/actions/billing'
import { BillingClient } from './billing-client'

export default async function BillingPage() {
  const invoices = await getInvoices()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Facturación</h1>
        <p className="text-slate-400 text-sm mt-1">{invoices.length} facturas en total</p>
      </div>

      <BillingClient initialInvoices={invoices} />
    </div>
  )
}
