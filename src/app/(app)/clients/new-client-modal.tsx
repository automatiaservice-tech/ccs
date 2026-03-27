'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClientAction } from '@/lib/actions/clients'
import { getSessions } from '@/lib/actions/sessions'
import { getDayName } from '@/lib/utils'

interface NewClientModalProps {
  open: boolean
  onClose: () => void
}

export function NewClientModal({ open, onClose }: NewClientModalProps) {
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    profile_type: '' as any,
    monthly_fee: '',
    notes: '',
    session_ids: [] as string[],
  })
  const router = useRouter()

  useEffect(() => {
    if (open) {
      getSessions().then(setSessions).catch(console.error)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.profile_type) {
      toast.error('El nombre y el tipo de perfil son obligatorios')
      return
    }
    setLoading(true)
    try {
      const client = await createClientAction({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        profile_type: formData.profile_type,
        monthly_fee: formData.monthly_fee ? parseFloat(formData.monthly_fee) : undefined,
        notes: formData.notes,
        session_ids: formData.session_ids,
      })
      toast.success(`Cliente "${client.name}" creado correctamente`)
      router.refresh()
      onClose()
      resetForm()
    } catch (err: any) {
      toast.error(err.message || 'Error al crear el cliente')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      profile_type: '' as any,
      monthly_fee: '',
      notes: '',
      session_ids: [],
    })
  }

  const toggleSession = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      session_ids: prev.session_ids.includes(id)
        ? prev.session_ids.filter((s) => s !== id)
        : [...prev.session_ids, id],
    }))
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Juan García"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                placeholder="600 123 456"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                placeholder="juan@email.com"
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Tipo de perfil *</Label>
              <Select
                value={formData.profile_type}
                onValueChange={(v) => setFormData((p) => ({ ...p, profile_type: v as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed_group">Grupo Fijo</SelectItem>
                  <SelectItem value="variable_group">Grupo Variable</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.profile_type === 'fixed_group' && (
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="monthly_fee">Tarifa mensual (€)</Label>
                <Input
                  id="monthly_fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthly_fee}
                  onChange={(e) => setFormData((p) => ({ ...p, monthly_fee: e.target.value }))}
                  placeholder="50.00"
                />
              </div>
            )}
          </div>

          {/* Sessions */}
          {sessions.length > 0 && (
            <div className="space-y-2">
              <Label>Asignar a sesiones</Label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto rounded-md border border-slate-600 p-2">
                {sessions.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2.5 cursor-pointer p-1.5 rounded hover:bg-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={formData.session_ids.includes(s.id)}
                      onChange={() => toggleSession(s.id)}
                      className="rounded border-slate-500 text-blue-600"
                    />
                    <span className="text-sm text-slate-200">
                      {s.name} — {getDayName(s.day_of_week)}{' '}
                      {s.time?.substring(0, 5)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Observaciones..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Crear cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
