import { MessageCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function WhatsAppPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">WhatsApp</h1>
        <p className="text-[#64748B] text-sm mt-1">Comunicación con clientes</p>
      </div>

      <Card>
        <CardContent className="py-16 text-center">
          <div className="flex justify-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
              <MessageCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-[#0F172A] mb-2">Próximamente</h2>
          <p className="text-[#64748B] max-w-sm mx-auto text-sm leading-relaxed">
            La integración con WhatsApp vía Twilio estará disponible en una próxima versión.
            Podrás enviar recordatorios de sesiones y facturas directamente a tus clientes.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
