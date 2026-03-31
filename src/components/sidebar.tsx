'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardCheck,
  Receipt,
  BarChart3,
  MessageCircle,
  LogOut,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useSidebar } from './sidebar-context'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clientes', icon: Users },
  { href: '/schedule', label: 'Horario', icon: Calendar },
  { href: '/schedule/checkin', label: 'Pasar Lista', icon: ClipboardCheck },
  { href: '/billing', label: 'Facturación', icon: Receipt },
  { href: '/accounting', label: 'Contabilidad', icon: BarChart3 },
  { href: '/whatsapp', label: 'WhatsApp', icon: MessageCircle },
]

function useIsActive(href: string) {
  const pathname = usePathname()
  if (href === '/dashboard') return pathname === '/dashboard'
  if (href === '/schedule') return pathname === '/schedule'
  return pathname.startsWith(href)
}

// ── Logo component ─────────────────────────────────────────────────────────
function BrandLogo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="relative h-9 w-9 shrink-0">
        <Image
          src="/logo.svg"
          alt="CCS Center"
          fill
          className="object-contain"
          priority
        />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#0F172A] truncate">CCS Center</p>
          <p className="text-xs text-[#64748B]">Gestión</p>
        </div>
      )}
    </div>
  )
}

// ── Full nav link (mobile + desktop) ────────────────────────────────────────
function NavLink({ item, onClick }: { item: (typeof navItems)[0]; onClick?: () => void }) {
  const isActive = useIsActive(item.href)
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
        isActive
          ? 'bg-[#EFF6FF] text-[#2563EB]'
          : 'text-[#64748B] hover:bg-slate-50 hover:text-[#0F172A]'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  )
}

// ── Tablet nav link (icons + label hidden until hover) ──────────────────────
function TabletNavLink({ item }: { item: (typeof navItems)[0] }) {
  const isActive = useIsActive(item.href)
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      title={item.label}
      className={cn(
        'flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap overflow-hidden',
        isActive
          ? 'bg-[#EFF6FF] text-[#2563EB]'
          : 'text-[#64748B] hover:bg-slate-50 hover:text-[#0F172A]'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        {item.label}
      </span>
    </Link>
  )
}

export function Sidebar() {
  const router = useRouter()
  const { mobileOpen, setMobileOpen } = useSidebar()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* ── Mobile backdrop ──────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile slide-in sidebar (<768px) ─────────────────────────────── */}
      <aside
        className={cn(
          'fixed left-0 top-14 bottom-0 w-72 bg-white border-r border-[#E2E8F0] flex flex-col z-50',
          'transition-transform duration-300 ease-in-out md:hidden',
          mobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
          <BrandLogo />
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} onClick={() => setMobileOpen(false)} />
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-[#E2E8F0]">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#64748B] hover:bg-slate-50 hover:text-[#0F172A] transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Tablet collapsed sidebar (768px–1024px) ──────────────────────── */}
      <aside className="hidden md:flex lg:hidden fixed left-0 top-14 bottom-0 flex-col bg-white border-r border-[#E2E8F0] z-40 group w-16 hover:w-60 transition-all duration-200 overflow-hidden">
        <div className="flex items-center gap-3 px-3 py-5 border-b border-[#E2E8F0] min-w-[240px]">
          <div className="relative h-9 w-9 shrink-0">
            <Image src="/logo.svg" alt="CCS Center" fill className="object-contain" />
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            <p className="text-sm font-bold text-[#0F172A]">CCS Center</p>
            <p className="text-xs text-[#64748B]">Gestión</p>
          </div>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => (
            <TabletNavLink key={item.href} item={item} />
          ))}
        </nav>

        <div className="px-2 py-4 border-t border-[#E2E8F0]">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium text-[#64748B] hover:bg-slate-50 hover:text-[#0F172A] transition-colors whitespace-nowrap overflow-hidden"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Cerrar sesión
            </span>
          </button>
        </div>
      </aside>

      {/* ── Desktop full sidebar (1024px+) ───────────────────────────────── */}
      <aside className="hidden lg:flex fixed left-0 top-14 bottom-0 w-60 bg-white border-r border-[#E2E8F0] flex-col z-40">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-[#E2E8F0]">
          <BrandLogo />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-[#E2E8F0]">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#64748B] hover:bg-slate-50 hover:text-[#0F172A] transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
