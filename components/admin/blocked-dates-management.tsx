'use client'

import { useState, useEffect } from 'react'
import { Calendar, Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface BlockedDate {
  id: string
  barber_id: string | null
  start_date: string
  end_date: string
  reason: string
}

interface BlockedDatesManagementProps {
  barbers: Array<{ id: string; full_name: string }>
}

export function BlockedDatesManagement({ barbers }: BlockedDatesManagementProps) {
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    barber_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  })

  useEffect(() => {
    loadBlockedDates()
  }, [])

  const loadBlockedDates = async () => {
    try {
      const response = await fetch('/api/blocked-dates')
      if (response.ok) {
        const data = await response.json()
        setBlockedDates(data)
      }
    } catch (err) {
      console.error('[v0] Error loading blocked dates:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/blocked-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barber_id: formData.barber_id || null,
          start_date: formData.start_date,
          end_date: formData.end_date,
          reason: formData.reason,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao bloquear data')
      }

      await loadBlockedDates()
      setFormData({
        barber_id: '',
        start_date: '',
        end_date: '',
        reason: '',
      })
      setShowForm(false)
    } catch (err) {
      console.error('[v0] Error creating blocked date:', err)
      alert(err instanceof Error ? err.message : 'Erro ao bloquear data')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este bloqueio?')) return

    try {
      const response = await fetch(`/api/blocked-dates?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadBlockedDates()
      }
    } catch (err) {
      console.error('[v0] Error deleting blocked date:', err)
    }
  }

  const getBarberName = (barberId: string | null) => {
    if (!barberId) return 'Todos os barbeiros'
    return barbers.find(b => b.id === barberId)?.full_name || 'Desconhecido'
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Datas e Horários Bloqueados
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition min-h-10 font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Bloqueio
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-border rounded-lg p-4 sm:p-6 mb-6 space-y-4">
          <div>
            <label className="text-xs sm:text-sm font-semibold text-foreground block mb-2">
              Barbeiro (opcional - deixe vazio para bloquear todos)
            </label>
            <select
              value={formData.barber_id}
              onChange={(e) => setFormData({ ...formData, barber_id: e.target.value })}
              className="w-full px-3 sm:px-4 py-3 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos os barbeiros</option>
              {barbers.map(barber => (
                <option key={barber.id} value={barber.id}>
                  {barber.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="text-xs sm:text-sm font-semibold text-foreground block mb-2">
                Data Início
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-3 text-sm border border-border rounded-lg bg-card h-12 appearance-none"
              />
            </div>
            <div>
              <label className="text-xs sm:text-sm font-semibold text-foreground block mb-2">
                Data Fim
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-3 text-sm border border-border rounded-lg bg-card h-12 appearance-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs sm:text-sm font-semibold text-foreground block mb-2">
              Motivo (ex: Manutenção, Feriado, Férias)
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Motivo do bloqueio"
              className="w-full px-3 sm:px-4 py-3 text-sm border border-border rounded-lg bg-card"
            />
          </div>

          <div className="flex gap-3 sm:gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-3 sm:px-4 py-3 text-xs sm:text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition min-h-12 font-semibold"
            >
              Bloquear
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 px-3 sm:px-4 py-3 text-xs sm:text-sm bg-muted hover:bg-muted/80 text-foreground rounded-lg transition min-h-12 font-semibold"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2 sm:space-y-3">
        {blockedDates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma data bloqueada
          </p>
        ) : (
          blockedDates.map(blocked => (
            <div
              key={blocked.id}
              className="border border-border rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm text-foreground">
                    {format(new Date(blocked.start_date), 'dd MMM', { locale: ptBR })}
                    {' - '}
                    {format(new Date(blocked.end_date), 'dd MMM yyyy', { locale: ptBR })}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {getBarberName(blocked.barber_id)}
                  {blocked.reason && ` • ${blocked.reason}`}
                </p>
              </div>
              <button
                onClick={() => handleDelete(blocked.id)}
                className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition min-h-10 font-semibold flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Remover
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
