import { Sidebar } from '@/components/sidebar'
import { MobileHeader } from '@/components/mobile-header'
import { BottomNav } from '@/components/bottom-nav'
import { SidebarProvider } from '@/components/sidebar-context'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-full min-h-screen">
        <Sidebar />

        {/* Mobile top bar */}
        <MobileHeader />

        <main
          className={[
            'flex-1 min-h-screen',
            // Mobile: no offset, add top padding for header + bottom padding for nav
            'pt-14 pb-20 px-4',
            // Tablet: offset for collapsed sidebar (w-16)
            'md:ml-16 md:pt-0 md:pb-0 md:px-0',
            // Desktop: offset for full sidebar
            'lg:ml-60',
          ].join(' ')}
        >
          <div className="p-4 md:p-6 lg:p-8">{children}</div>
        </main>

        {/* Mobile bottom navigation */}
        <BottomNav />
      </div>
    </SidebarProvider>
  )
}
