'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mail, Lock } from 'lucide-react'

interface AdminLoginProps {
  onSuccess: (adminId: string, email: string, fullName: string) => void
}

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        throw new Error('Credenciais inválidas')
      }

      const data = await response.json()
      localStorage.setItem('adminId', data.adminId)
      localStorage.setItem('adminEmail', data.email)
      localStorage.setItem('adminName', data.fullName)

      onSuccess(data.adminId, data.email, data.fullName)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-foreground">
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-3.5 sm:top-4 w-5 h-5 text-primary" />
          <input
            id="email"
            type="email"
            placeholder="admin@eliesio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-3 sm:pr-4 py-3 sm:py-4 text-sm sm:text-base border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card min-h-12"
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-foreground">
          Senha
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-3.5 sm:top-4 w-5 h-5 text-primary" />
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 pr-3 sm:pr-4 py-3 sm:py-4 text-sm sm:text-base border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card min-h-12"
            disabled={loading}
          />
        </div>
      </div>

      {error && (
        <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs sm:text-sm text-red-700">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={!email || !password || loading}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 sm:py-4 text-sm sm:text-base font-semibold min-h-12"
      >
        {loading ? 'Entrando...' : 'Entrar como Admin'}
      </Button>
    </form>
  )
}
