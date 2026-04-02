import { Sidebar } from '@/components/sidebar'
import { TopNavbar } from '@/components/top-navbar'
import { BottomNav } from '@/components/bottom-nav'
import { SidebarProvider } from '@/components/sidebar-context'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      {/* Fixed top navbar — shown on all screen sizes */}
      <TopNavbar />

      <div className="flex h-full min-h-screen">
        <Sidebar />

        <main
          className={[
            'flex-1 min-h-screen bg-white',
            // Mobile: top padding for navbar + bottom padding for nav
            'pt-14 pb-20 px-4',
            // Tablet: offset for collapsed sidebar (w-16) + top for navbar
            'md:ml-16 md:pt-14 md:pb-0 md:px-0',
            // Desktop: offset for full sidebar
            'lg:ml-60',
          ].join(' ')}
        >
          <div className="p-4 md:p-6 lg:p-8 page-enter">{children}</div>
        </main>

        {/* Mobile bottom navigation */}
        <BottomNav />
      </div>
    </SidebarProvider>
  )
}
