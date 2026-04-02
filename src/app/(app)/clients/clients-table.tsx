'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, ChevronRight, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn, getProfileTypeLabel } from '@/lib/utils'
import type { Client } from '@/lib/supabase/database.types'
import { NewClientModal } from './new-client-modal'

type SortOrder = 'alpha' | 'oldest' | 'newest'

interface ClientsTableProps {
  initialClients: Client[]
}

function sortClients(clients: Client[], order: SortOrder): Client[] {
  return [...clients].sort((a, b) => {
    if (order === 'alpha') return a.name.localeCompare(b.name, 'es')
    const dateA = new Date(a.enrollment_date ?? a.created_at).getTime()
    const dateB = new Date(b.enrollment_date ?? b.created_at).getTime()
    return order === 'oldest' ? dateA - dateB : dateB - dateA
  })
}

// ── Color coding by profile type ──────────────────────────────────────────
function getCardStyle(profile_type: string) {
  switch (profile_type) {
    case 'individual':
      return 'bg-orange-50 border-l-4 border-l-orange-400 border border-orange-200 hover:bg-orange-100'
    case 'variable_group':
      return 'bg-green-50 border-l-4 border-l-green-400 border border-green-200 hover:bg-green-100'
    case 'fixed_group':
      return 'bg-blue-50 border-l-4 border-l-blue-400 border border-blue-200 hover:bg-blue-100'
    default:
      return 'bg-white border border-gray-200 hover:bg-gray-50'
  }
}

function getAvatarStyle(profile_type: string) {
  switch (profile_type) {
    case 'individual':
      return 'bg-orange-100 text-orange-700'
    case 'variable_group':
      return 'bg-green-100 text-green-700'
    case 'fixed_group':
      return 'bg-blue-100 text-blue-700'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

function getTypeBadgeStyle(profile_type: string) {
  switch (profile_type) {
    case 'individual':
      return 'bg-orange-100 text-orange-700 border-orange-300'
    case 'variable_group':
      return 'bg-green-100 text-green-700 border-green-300'
    case 'fixed_group':
      return 'bg-blue-100 text-blue-700 border-blue-300'
    default:
      return 'bg-gray-100 text-gray-600 border-gray-300'
  }
}

function getTableRowStyle(profile_type: string) {
  switch (profile_type) {
    case 'individual':
      return 'border-l-4 border-l-orange-400 hover:bg-orange-50'
    case 'variable_group':
      return 'border-l-4 border-l-green-400 hover:bg-green-50'
    case 'fixed_group':
      return 'border-l-4 border-l-blue-400 hover:bg-blue-50'
    default:
      return 'border-l-4 border-l-gray-300 hover:bg-gray-50'
  }
}

export function ClientsTable({ initialClients }: ClientsTableProps) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('alpha')
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  const filtered = sortClients(
    initialClients.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone || '').includes(search) ||
        (c.email || '').toLowerCase().includes(search.toLowerCase())
      const matchType = typeFilter === 'all' || c.profile_type === typeFilter
      const matchStatus =
        statusFilter === 'all' || (statusFilter === 'active' ? c.active : !c.active)
      return matchSearch && matchType && matchStatus
    }),
    sortOrder
  )

  return (
    <>
      <div className="space-y-4">
        {/* ── Filters + button ── */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            <Button onClick={() => setShowModal(true)} className="h-10 shrink-0">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nuevo cliente</span>
            </Button>
          </div>

          {/* Filters row */}
          <div className="flex gap-2 flex-wrap">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44 h-9 text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="fixed_group">Grupo Fijo</SelectItem>
                <SelectItem value="variable_group">Grupo Personal Variable</SelectItem>
                <SelectItem value="individual">Personal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-9 text-xs">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
              <SelectTrigger className="w-52 h-9 text-xs">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1 shrink-0" />
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alpha">Alfabético (A-Z)</SelectItem>
                <SelectItem value="oldest">Antigüedad (más antiguos primero)</SelectItem>
                <SelectItem value="newest">Antigüedad (más recientes primero)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Color legend */}
          <div className="flex gap-4 text-xs flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-blue-500" />
              <span className="text-[#64748B]">Grupo Fijo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-green-500" />
              <span className="text-[#64748B]">Grupo Personal Variable</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-orange-500" />
              <span className="text-[#64748B]">Personal</span>
            </div>
          </div>
        </div>

        {/* ── Mobile: card list ── */}
        <div className="sm:hidden space-y-2">
          {filtered.length === 0 ? (
            <p className="text-center py-10 text-[#64748B] text-sm">No se encontraron clientes</p>
          ) : (
            filtered.map((client) => (
              <button
                key={client.id}
                onClick={() => router.push(`/clients/${client.id}`)}
                className={cn(
                  'w-full text-left rounded-xl p-4 flex items-center gap-3 transition-colors active:scale-99',
                  getCardStyle(client.profile_type)
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold text-sm',
                    getAvatarStyle(client.profile_type)
                  )}
                >
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 truncate">{client.name}</p>
                    <Badge
                      className={
                        client.active
                          ? 'bg-green-100 text-green-700 border-green-300 text-[10px]'
                          : 'bg-gray-100 text-gray-500 border-gray-300 text-[10px]'
                      }
                    >
                      {client.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className={cn('text-[10px]', getTypeBadgeStyle(client.profile_type))}>
                      {getProfileTypeLabel(client.profile_type)}
                    </Badge>
                    {client.phone && (
                      <span className="text-xs text-gray-500 truncate">{client.phone}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
              </button>
            ))
          )}
        </div>

        {/* ── Tablet/Desktop: table ── */}
        <div className="hidden sm:block rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Teléfono</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400">
                      No se encontraron clientes
                    </td>
                  </tr>
                ) : (
                  filtered.map((client) => (
                    <tr
                      key={client.id}
                      className={cn(
                        'border-b border-gray-100 cursor-pointer transition-colors',
                        getTableRowStyle(client.profile_type)
                      )}
                      onClick={() => router.push(`/clients/${client.id}`)}
                    >
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold text-gray-900">{client.name}</p>
                        {client.email && (
                          <p className="text-xs text-gray-500 mt-0.5">{client.email}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge className={getTypeBadgeStyle(client.profile_type)}>
                          {getProfileTypeLabel(client.profile_type)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="text-sm text-gray-600">{client.phone || '—'}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          className={
                            client.active
                              ? 'bg-green-100 text-green-700 border-green-300'
                              : 'bg-gray-100 text-gray-500 border-gray-300'
                          }
                        >
                          {client.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <ChevronRight className="h-4 w-4 text-gray-400 inline" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-[#64748B]">
          Mostrando {filtered.length} de {initialClients.length} clientes
        </p>
      </div>

      <NewClientModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  )
}
