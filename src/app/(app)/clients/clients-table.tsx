'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getProfileTypeLabel, getProfileTypeBadgeColor } from '@/lib/utils'
import type { Client } from '@/lib/supabase/database.types'
import { NewClientModal } from './new-client-modal'
import { getSessions } from '@/lib/actions/sessions'

interface ClientsTableProps {
  initialClients: Client[]
}

export function ClientsTable({ initialClients }: ClientsTableProps) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  const filtered = initialClients.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || '').includes(search) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase())

    const matchType = typeFilter === 'all' || c.profile_type === typeFilter
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' ? c.active : !c.active)

    return matchSearch && matchType && matchStatus
  })

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-3 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, teléfono o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="fixed_group">Grupo Fijo</SelectItem>
                <SelectItem value="variable_group">Grupo Variable</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" />
            Nuevo cliente
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide hidden sm:table-cell">Teléfono</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    No se encontraron clientes
                  </td>
                </tr>
              ) : (
                filtered.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-slate-700/50 hover:bg-slate-750 cursor-pointer transition-colors"
                    onClick={() => router.push(`/clients/${client.id}`)}
                  >
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-slate-100">{client.name}</p>
                        {client.email && (
                          <p className="text-xs text-slate-400 mt-0.5">{client.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge className={getProfileTypeBadgeColor(client.profile_type)}>
                        {getProfileTypeLabel(client.profile_type)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className="text-sm text-slate-300">{client.phone || '—'}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        className={
                          client.active
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                        }
                      >
                        {client.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <ChevronRight className="h-4 w-4 text-slate-500 inline" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-500">
          Mostrando {filtered.length} de {initialClients.length} clientes
        </p>
      </div>

      <NewClientModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  )
}
