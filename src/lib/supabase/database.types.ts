export type ProfileType = 'fixed_group' | 'variable_group' | 'individual'
export type SessionType = 'fixed_group' | 'variable_group' | 'individual'
export type InvoiceStatus = 'draft' | 'sent' | 'paid'
export type ExpenseCategory = 'alquiler' | 'suministros' | 'material' | 'otros'

export type Gender = 'masculino' | 'femenino' | 'otro'

export interface Client {
  id: string
  name: string
  phone: string | null
  email: string | null
  profile_type: ProfileType
  monthly_fee: number | null
  notes: string | null
  active: boolean
  age: number | null
  gender: Gender | null
  enrollment_date: string | null
  birth_date: string | null
  whatsapp_enabled: boolean
  bank_account: string | null
  created_at: string
}

export interface WhatsAppLog {
  id: string
  client_id: string | null
  session_id: string | null
  phone: string | null
  status: 'sent' | 'failed'
  error_message: string | null
  sent_at: string
}

export interface WhatsAppConfig {
  id: number
  global_enabled: boolean
  send_hour_utc: number
}

export type TrainerAbsenceStatus = 'pendiente' | 'devuelta' | 'recuperada'

export interface TrainerAbsence {
  id: string
  session_id: string
  date: string
  notes: string | null
  status: TrainerAbsenceStatus
  resolution_date: string | null
  resolution_notes: string | null
  created_at: string
}

export interface Session {
  id: string
  name: string
  day_of_week: number
  time: string
  session_type: SessionType
  max_capacity: number | null
  session_price: number | null
  created_at: string
}

export interface SessionClient {
  session_id: string
  client_id: string
}

export interface AttendanceRecord {
  id: string
  session_id: string
  date: string
  client_id: string
  attended: boolean
  cost_per_person: number
  created_at: string
}

export interface Invoice {
  id: string
  client_id: string
  month: number
  year: number
  total_amount: number
  status: InvoiceStatus
  pdf_url: string | null
  payment_method: 'efectivo' | 'transferencia' | null
  payment_reference: string | null
  created_at: string
  invoice_number?: string
}

export interface InvoiceLine {
  id: string
  invoice_id: string
  date: string
  description: string
  attendees: number | null
  amount: number
}

export interface Expense {
  id: string
  description: string
  amount: number
  category: ExpenseCategory
  date: string
  document_url: string | null
  created_at: string
}

// Joined types
export interface AttendanceWithSession extends AttendanceRecord {
  sessions: {
    name: string
    session_type: SessionType
  }
}

export interface InvoiceWithClient extends Invoice {
  clients: {
    name: string
    email: string | null
  }
}

export interface SessionWithClients extends Session {
  session_clients: {
    clients: Client
  }[]
}
