'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, Loader2, TrendingUp, TrendingDown,
  DollarSign, Paperclip, X, FileText,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatCurrency, getMonthName, formatDate } from '@/lib/utils'
import {
  createExpense, updateExpense, deleteExpense,
  uploadExpenseDocument, getDocumentSignedUrl, removeDocumentFromStorage,
} from '@/lib/actions/accounting'
import { DonutChart } from './donut-chart'
import type { Expense, ExpenseCategory } from '@/lib/supabase/database.types'

// ── Constants ──────────────────────────────────────────────────────────────────

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: getMonthName(i + 1) }))
const YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - i
  return { value: String(y), label: String(y) }
})
const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'alquiler', label: 'Alquiler' },
  { value: 'suministros', label: 'Suministros' },
  { value: 'material', label: 'Material' },
  { value: 'otros', label: 'Otros' },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function getDocFilename(path: string): string {
  const name = path.split('/').pop() ?? path
  // Strip UUID prefix (36 chars) + dash separator
  return name.length > 37 ? name.substring(37) : name
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  initialExpenses: Expense[]
  summary: { totalIncome: number; totalExpenses: number; netProfit: number; incomeByType: any[] }
  month: number
  year: number
  bucketExists: boolean
}

// ── Component ──────────────────────────────────────────────────────────────────

export function AccountingClient({ initialExpenses, summary, month, year, bucketExists }: Props) {
  const router = useRouter()

  // ── List state ────────────────────────────────────────────────────────────
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null)

  // ── Form modal state ──────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false)
  const [editExpense, setEditExpense] = useState<Expense | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'otros' as ExpenseCategory,
    date: new Date().toISOString().split('T')[0],
  })

  // ── Document state ────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [removeDoc, setRemoveDoc] = useState(false)

  // ── Doc state helpers ─────────────────────────────────────────────────────

  const clearDocState = () => {
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setRemoveDoc(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────

  const navigatePeriod = (m: number, y: number) => {
    router.push(`/accounting?month=${m}&year=${y}`)
  }

  const openCreate = () => {
    setEditExpense(null)
    setForm({
      description: '',
      amount: '',
      category: 'otros',
      date: `${year}-${String(month).padStart(2, '0')}-01`,
    })
    clearDocState()
    setShowModal(true)
  }

  const openEdit = (expense: Expense) => {
    setEditExpense(expense)
    setForm({
      description: expense.description,
      amount: String(expense.amount),
      category: expense.category,
      date: expense.date,
    })
    clearDocState()
    setShowModal(true)
  }

  const closeModal = () => {
    if (saving) return
    clearDocState()
    setShowModal(false)
  }

  // ── File handling ─────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede superar 10 MB')
      e.target.value = ''
      return
    }
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!allowed.includes(file.type)) {
      toast.error('Formato no permitido. Usa JPG, PNG o PDF.')
      e.target.value = ''
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(file)
    setRemoveDoc(false)
    setPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
    e.target.value = ''
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const baseData = {
        description: form.description,
        amount: parseFloat(form.amount),
        category: form.category,
        date: form.date,
      }

      // Resolve document URL: undefined = no change, null = remove, string = new path
      let resolvedDocUrl: string | null | undefined = undefined

      if (bucketExists && selectedFile) {
        const fd = new FormData()
        fd.append('file', selectedFile)
        fd.append('month', String(month))
        fd.append('year', String(year))
        try {
          resolvedDocUrl = await uploadExpenseDocument(fd)
        } catch (uploadErr: any) {
          toast.error(`Error al subir documento: ${uploadErr.message}`)
          setSaving(false)
          return
        }
        // Delete old document if replacing
        if (editExpense?.document_url) {
          removeDocumentFromStorage(editExpense.document_url).catch(() => null)
        }
      } else if (bucketExists && removeDoc && editExpense?.document_url) {
        removeDocumentFromStorage(editExpense.document_url).catch(() => null)
        resolvedDocUrl = null
      }

      if (editExpense) {
        const updates: any = { ...baseData }
        if (resolvedDocUrl !== undefined) updates.document_url = resolvedDocUrl
        const updated = await updateExpense(editExpense.id, updates)
        setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
        toast.success('Gasto actualizado')
      } else {
        const createData: any = { ...baseData }
        if (resolvedDocUrl !== undefined) createData.document_url = resolvedDocUrl
        const created = await createExpense(createData)
        setExpenses((prev) => [created, ...prev])
        toast.success('Gasto añadido')
      }

      closeModal()
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (expense: Expense) => {
    if (!confirm('¿Eliminar este gasto?')) return
    setDeletingId(expense.id)
    try {
      if (expense.document_url) {
        removeDocumentFromStorage(expense.document_url).catch(() => null)
      }
      await deleteExpense(expense.id)
      setExpenses((prev) => prev.filter((e) => e.id !== expense.id))
      toast.success('Gasto eliminado')
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message || 'Error al eliminar')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Document viewer ───────────────────────────────────────────────────────

  const handleViewDocument = async (expense: Expense) => {
    if (!expense.document_url) return
    setLoadingDocId(expense.id)
    try {
      const url = await getDocumentSignedUrl(expense.document_url)
      window.open(url, '_blank')
    } catch {
      toast.error('Error al cargar el documento')
    } finally {
      setLoadingDocId(null)
    }
  }

  // ── Render vars ───────────────────────────────────────────────────────────

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const existingDocUrl = editExpense?.document_url ?? null
  // Show existing doc info when: in edit mode, has doc, not marked for removal, no new file picked
  const showExistingDoc = bucketExists && !!existingDocUrl && !removeDoc && !selectedFile
  // Show file picker when: no existing doc shown
  const showFilePicker = bucketExists && !showExistingDoc && !selectedFile

  return (
    <>
      {/* Period Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={String(month)} onValueChange={(v) => navigatePeriod(parseInt(v), year)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => navigatePeriod(month, parseInt(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-[#64748B] text-sm">{getMonthName(month)} {year}</span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">Ingresos</p>
                <p className="text-2xl font-bold text-[#0F172A] mt-1">{formatCurrency(summary.totalIncome)}</p>
                <p className="text-xs text-[#64748B] mt-1">Facturas pagadas</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">Gastos</p>
                <p className="text-2xl font-bold text-[#0F172A] mt-1">{formatCurrency(summary.totalExpenses)}</p>
                <p className="text-xs text-[#64748B] mt-1">Total registrado</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">Beneficio neto</p>
                <p className={`text-2xl font-bold mt-1 ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {formatCurrency(summary.netProfit)}
                </p>
                <p className="text-xs text-[#64748B] mt-1">Ingresos − Gastos</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${summary.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <TrendingUp className={`h-5 w-5 ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income breakdown + Expenses */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Income by type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingresos por tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.totalIncome === 0 ? (
              <p className="text-center text-[#64748B] py-8 text-sm">Sin ingresos este mes</p>
            ) : (
              <DonutChart data={summary.incomeByType} />
            )}
            <div className="mt-4 space-y-2">
              {summary.incomeByType.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-700">{item.name}</span>
                  </div>
                  <span className="text-[#0F172A] font-medium">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Expenses list */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Gastos</CardTitle>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" />
                Añadir
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {expenses.length === 0 ? (
              <p className="text-center text-[#64748B] py-8 text-sm px-6">
                Sin gastos registrados este mes
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                      <th className="text-left px-4 py-2 text-xs font-medium text-[#64748B]">Descripción</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-[#64748B] hidden sm:table-cell">Categoría</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-[#64748B]">Importe</th>
                      <th className="px-4 py-2 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="border-b border-[#F1F5F9]">
                        <td className="px-4 py-3">
                          <p className="text-sm text-[#0F172A]">{exp.description}</p>
                          <p className="text-xs text-[#64748B]">{formatDate(exp.date)}</p>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-xs text-[#64748B] capitalize">{exp.category}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-[#0F172A]">
                          {formatCurrency(exp.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            {exp.document_url && bucketExists && (
                              <button
                                onClick={() => handleViewDocument(exp)}
                                disabled={loadingDocId === exp.id}
                                className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-50"
                                title="Ver documento adjunto"
                              >
                                {loadingDocId === exp.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Paperclip className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => openEdit(exp)}
                              className="p-1 text-slate-400 hover:text-blue-600"
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(exp)}
                              disabled={deletingId === exp.id}
                              className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-50"
                              title="Eliminar"
                            >
                              {deletingId === exp.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-[#E2E8F0] bg-[#F8FAFC]">
                      <td colSpan={2} className="px-4 py-3 text-sm font-medium text-slate-700">Total gastos</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-[#0F172A]">
                        {formatCurrency(totalExpenses)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editExpense ? 'Editar gasto' : 'Nuevo gasto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Ej: Alquiler local"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Importe (€)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((p) => ({ ...p, category: v as ExpenseCategory }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                required
              />
            </div>

            {/* Document attachment */}
            <div className="space-y-2">
              <Label>Documento adjunto</Label>

              {!bucketExists ? (
                <p className="text-xs text-[#64748B] rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
                  Para adjuntar documentos, crea el bucket{' '}
                  <code className="font-mono bg-white border border-[#E2E8F0] rounded px-1 text-[#0F172A]">
                    expense-documents
                  </code>{' '}
                  en Supabase Storage.
                </p>
              ) : (
                <>
                  {/* New file selected */}
                  {selectedFile && (
                    <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2">
                      {previewUrl ? (
                        <img src={previewUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                      ) : (
                        <FileText className="h-8 w-8 shrink-0 text-blue-500" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-blue-700">{selectedFile.name}</p>
                        <p className="text-xs text-blue-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (previewUrl) URL.revokeObjectURL(previewUrl)
                          setSelectedFile(null)
                          setPreviewUrl(null)
                        }}
                        className="shrink-0 text-blue-400 hover:text-blue-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Existing document (edit mode, not replaced, not removed) */}
                  {showExistingDoc && (
                    <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2">
                      <Paperclip className="h-4 w-4 shrink-0 text-[#64748B]" />
                      <span className="min-w-0 flex-1 truncate text-xs text-[#64748B]">
                        {getDocFilename(existingDocUrl!)}
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-[#64748B] hover:text-[#0F172A]"
                      >
                        Cambiar
                      </button>
                      <button
                        type="button"
                        onClick={() => setRemoveDoc(true)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}

                  {/* Note when removing existing doc */}
                  {removeDoc && !selectedFile && (
                    <p className="text-xs text-amber-600 rounded border border-amber-200 bg-amber-50 px-2 py-1.5">
                      El documento actual se eliminará al guardar.{' '}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => setRemoveDoc(false)}
                      >
                        Deshacer
                      </button>
                    </p>
                  )}

                  {/* File picker — shown when no file selected and no existing doc (or removed) */}
                  {showFilePicker && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full items-center gap-2 rounded-lg border-2 border-dashed border-[#E2E8F0] px-4 py-3 text-sm text-[#64748B] transition-colors hover:border-blue-300 hover:text-blue-600"
                    >
                      <Paperclip className="h-4 w-4 shrink-0" />
                      <span>Adjuntar JPG, PNG o PDF (máx. 10 MB)</span>
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={closeModal} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editExpense ? 'Guardar cambios' : 'Añadir gasto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
