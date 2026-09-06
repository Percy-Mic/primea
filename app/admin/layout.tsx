'use client'

import { usePathname } from 'next/navigation'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="admin-root-container">
      <style>{`
        .admin-root-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background-color: #faf9f6;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .admin-main-content {
          flex: 1;
          width: 100%;
          box-sizing: border-box;
        }
      `}</style>

      {/* Full-width Page Content without Sidebar */}
      <main className="admin-main-content">{children}</main>
    </div>
  )
}
