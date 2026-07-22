'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Edit2, Check, X } from 'lucide-react'

interface AppointmentEditorProps {
  appointmentId: string
  currentStatus: string
  currentAmount?: number
  onStatusChange?: () => void
}

export function AppointmentEditor({ appointmentId, currentStatus, currentAmount = 0, onStatusChange }: AppointmentEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [newStatus, setNewStatus] = useState(currentStatus)
  const [newAmount, setNewAmount] = useState(currentAmount.toString())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          amount: newAmount ? parseFloat(newAmount) : 0,
        }),
      })

      if (!response.ok) throw new Error('Falha ao atualizar agendamento')

      setIsEditing(false)
      onStatusChange?.()
    } catch (err) {
      setError('Erro ao atualizar agendamento')
      console.error('[v0] Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span
          className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
            currentStatus === 'completed'
              ? 'bg-green-100 text-green-700'
              : currentStatus === 'cancelled'
                ? 'bg-red-100 text-red-700'
                : currentStatus === 'confirmed'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {currentStatus === 'completed'
            ? 'Realizado'
            : currentStatus === 'cancelled'
              ? 'Cancelado'
              : currentStatus === 'confirmed'
                ? 'Confirmado'
                : 'Pendente'}
        </span>
        <button
          onClick={() => setIsEditing(true)}
          className="p-1 hover:bg-primary/10 rounded transition"
        >
          <Edit2 className="w-4 h-4 text-primary" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-red-600">{error}</p>}
      
      <div>
        <label className="text-xs font-semibold text-foreground block mb-1">Status</label>
        <select
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
          className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-border rounded-lg bg-card h-10"
        >
          <option value="pending">Pendente</option>
          <option value="confirmed">Confirmado</option>
          <option value="completed">Realizado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground block mb-1">Valor (R$)</label>
        <input
          type="number"
          value={newAmount}
          onChange={(e) => setNewAmount(e.target.value)}
          placeholder="0.00"
          step="0.01"
          min="0"
          className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-border rounded-lg bg-card h-10"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex-1 p-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs rounded transition flex items-center justify-center gap-1"
        >
          <Check className="w-3 h-3" />
          Salvar
        </button>
        <button
          onClick={() => {
            setIsEditing(false)
            setNewAmount(currentAmount.toString())
          }}
          className="flex-1 p-2 bg-gray-300 hover:bg-gray-400 text-gray-800 text-xs rounded transition flex items-center justify-center gap-1"
        >
          <X className="w-3 h-3" />
          Cancelar
        </button>
      </div>
    </div>
  )
}
