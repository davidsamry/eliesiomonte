'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Phone, User } from 'lucide-react'

interface LoginFormProps {
  onSuccess: (customerId: string, phoneNumber: string, name: string) => void
}

// Função para gerar UUID v4 válido
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [name, setName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validação básica
      if (!name.trim()) {
        throw new Error('Por favor, informe seu nome')
      }

      if (!phoneNumber.trim()) {
        throw new Error('Por favor, informe seu WhatsApp')
      }

      // Formata o número
      const formattedPhone = phoneNumber.replace(/\D/g, '')
      const phone = formattedPhone.startsWith('55')
        ? `+${formattedPhone}`
        : `+55${formattedPhone}`

      // Busca ou cria o cliente no banco de dados
      const getOrCreateResponse = await fetch('/api/customers/get-or-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phoneNumber: phone,
        }),
      })

      if (!getOrCreateResponse.ok) {
        const errorData = await getOrCreateResponse.json()
        throw new Error(errorData.error || 'Falha ao processar cliente')
      }

      const responseData = await getOrCreateResponse.json()
      const { customerId, isNew, existingName } = responseData

      // Se o cliente já existia, usa o nome dele (para não perder dados)
      const finalName = existingName || name

      // Salva no localStorage
      localStorage.setItem('customerId', customerId)
      localStorage.setItem('phoneNumber', phone)
      localStorage.setItem('customerName', finalName)

      const action = isNew ? 'criado' : 'recuperado'
      console.log(`[v0] Cliente ${action} com sucesso:`, customerId)

      // Chama o callback de sucesso
      onSuccess(customerId, phone, finalName)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao processar dados'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nome */}
        <div>
          <label htmlFor="name" className="block text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-foreground">
            Seu Nome
          </label>
          <div className="relative">
            <User className="absolute left-3 top-3.5 sm:top-4 w-5 h-5 text-primary" />
            <input
              id="name"
              type="text"
              placeholder="João Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 pr-3 sm:pr-4 py-3 sm:py-4 text-sm sm:text-base border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card min-h-12"
              disabled={loading}
            />
          </div>
        </div>

        {/* WhatsApp */}
        <div>
          <label htmlFor="phone" className="block text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-foreground">
            Seu WhatsApp
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-3.5 sm:top-4 w-5 h-5 text-primary" />
            <input
              id="phone"
              type="tel"
              placeholder="(XX) 9XXXX-XXXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full pl-10 pr-3 sm:pr-4 py-3 sm:py-4 text-sm sm:text-base border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card min-h-12"
              disabled={loading}
            />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2">
            Usaremos para confirmar seu agendamento
          </p>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs sm:text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Botão Enviar */}
        <Button
          type="submit"
          disabled={!name.trim() || !phoneNumber.trim() || loading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 sm:py-4 text-sm sm:text-base font-semibold min-h-12"
        >
          {loading ? 'Processando...' : 'Acessar Portal'}
        </Button>
      </form>
    </div>
  )
}
