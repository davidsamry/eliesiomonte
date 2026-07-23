'use client'

import { useState, useEffect } from 'react'
import { AdminLogin } from '@/components/admin/admin-login'
import { AdminDashboard } from '@/components/admin/admin-dashboard'
import { Scissors } from 'lucide-react'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [adminId, setAdminId] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminName, setAdminName] = useState('')

  useEffect(() => {
    // Verifica autenticação localStorage
    const storedAdminId = localStorage.getItem('adminId')
    const storedEmail = localStorage.getItem('adminEmail')
    const storedName = localStorage.getItem('adminName')
    
    if (storedAdminId && storedEmail && storedName) {
      setAdminId(storedAdminId)
      setAdminEmail(storedEmail)
      setAdminName(storedName)
      setIsAuthenticated(true)
    }
  }, [])

  const handleLoginSuccess = (id: string, email: string, fullName: string) => {
    setAdminId(id)
    setAdminEmail(email)
    setAdminName(fullName)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    // Encerra a sessão no servidor (limpa o cookie httpOnly)
    fetch('/api/admin/logout', { method: 'POST' }).catch(() => {})
    localStorage.removeItem('adminId')
    localStorage.removeItem('adminEmail')
    localStorage.removeItem('adminName')
    setIsAuthenticated(false)
    setAdminId('')
    setAdminEmail('')
    setAdminName('')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Scissors className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary">ELIESIO MONTE</h1>
              <p className="text-xs text-muted-foreground">Painel Administrativo</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
        {!isAuthenticated ? (
          <div className="max-w-md mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-3">
                Acesso Administrativo
              </h2>
              <p className="text-lg text-muted-foreground">
                Faça login para gerenciar a barbearia
              </p>
            </div>

            <div className="bg-card rounded-xl p-8 border border-border shadow-lg">
              <AdminLogin onSuccess={handleLoginSuccess} />
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl p-4 sm:p-8 border border-border shadow-lg">
            <AdminDashboard adminName={adminName} onLogout={handleLogout} />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-20 border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 ELIESIO MONTE Barbearia. Painel Administrativo.</p>
        </div>
      </footer>
    </main>
  )
}
