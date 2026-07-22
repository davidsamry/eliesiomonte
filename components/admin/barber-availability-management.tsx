'use client'

import { useState, useEffect } from 'react'
import { Clock, Check, X } from 'lucide-react'

interface AvailabilityRecord {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  break_start: string | null
  break_end: string | null
  is_available: boolean
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
]

interface BarberAvailabilityProps {
  barberId: string
  barberName: string
}

export function BarberAvailabilityManagement({ barberId, barberName }: BarberAvailabilityProps) {
  const [availability, setAvailability] = useState<AvailabilityRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [editingDay, setEditingDay] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    start_time: '09:00',
    end_time: '18:00',
    break_start: '12:00',
    break_end: '13:00',
    is_available: true,
  })

  useEffect(() => {
    loadAvailability()
  }, [barberId])

  const loadAvailability = async () => {
    try {
      const response = await fetch(`/api/barbers/${barberId}/availability`)
      if (response.ok) {
        const data = await response.json()
        setAvailability(data)
      }
    } catch (err) {
      console.error('[v0] Error loading availability:', err)
    }
  }

  const handleSaveDay = async (dayOfWeek: number) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/barbers/${barberId}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_of_week: dayOfWeek,
          ...formData,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao salvar')
      }

      await loadAvailability()
      setEditingDay(null)
    } catch (err) {
      console.error('[v0] Error saving availability:', err)
      alert(err instanceof Error ? err.message : 'Erro ao salvar disponibilidade')
    } finally {
      setLoading(false)
    }
  }

  const getDayAvailability = (dayOfWeek: number) => {
    return availability.find(a => a.day_of_week === dayOfWeek)
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary" />
        Disponibilidade - {barberName}
      </h3>

      <div className="space-y-3 sm:space-y-4">
        {DAYS_OF_WEEK.map((day) => {
          const dayAvail = getDayAvailability(day.value)
          const isEditing = editingDay === day.value

          return (
            <div
              key={day.value}
              className="border border-border rounded-lg p-3 sm:p-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base text-foreground">
                    {day.label}
                  </p>
                  {dayAvail && dayAvail.is_available && (
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {dayAvail.start_time} - {dayAvail.end_time}
                      {dayAvail.break_start && dayAvail.break_end && (
                        <> (Pausa: {dayAvail.break_start} - {dayAvail.break_end})</>
                      )}
                    </p>
                  )}
                  {dayAvail && !dayAvail.is_available && (
                    <p className="text-xs sm:text-sm text-destructive font-semibold">
                      Fechado neste dia
                    </p>
                  )}
                  {!dayAvail && (
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Sem horário configurado
                    </p>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (dayAvail) {
                      setFormData({
                        start_time: dayAvail.start_time,
                        end_time: dayAvail.end_time,
                        break_start: dayAvail.break_start || '12:00',
                        break_end: dayAvail.break_end || '13:00',
                        is_available: dayAvail.is_available,
                      })
                    }
                    setEditingDay(day.value)
                  }}
                  className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition min-h-10 font-semibold"
                >
                  {dayAvail ? 'Editar' : 'Configurar'}
                </button>
              </div>

              {isEditing && (
                <div className="mt-4 pt-4 border-t border-border space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      checked={formData.is_available}
                      onChange={(e) =>
                        setFormData({ ...formData, is_available: e.target.checked })
                      }
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label className="text-sm text-foreground cursor-pointer">
                      Disponível neste dia
                    </label>
                  </div>

                  {formData.is_available && (
                    <>
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="text-xs sm:text-sm font-semibold text-foreground block mb-2">
                            Horário Início
                          </label>
                          <input
                            type="time"
                            value={formData.start_time}
                            onChange={(e) =>
                              setFormData({ ...formData, start_time: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card"
                          />
                        </div>
                        <div>
                          <label className="text-xs sm:text-sm font-semibold text-foreground block mb-2">
                            Horário Fim
                          </label>
                          <input
                            type="time"
                            value={formData.end_time}
                            onChange={(e) =>
                              setFormData({ ...formData, end_time: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="text-xs sm:text-sm font-semibold text-foreground block mb-2">
                            Pausa Início
                          </label>
                          <input
                            type="time"
                            value={formData.break_start}
                            onChange={(e) =>
                              setFormData({ ...formData, break_start: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card"
                          />
                        </div>
                        <div>
                          <label className="text-xs sm:text-sm font-semibold text-foreground block mb-2">
                            Pausa Fim
                          </label>
                          <input
                            type="time"
                            value={formData.break_end}
                            onChange={(e) =>
                              setFormData({ ...formData, break_end: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex gap-3 sm:gap-4 pt-2">
                    <button
                      onClick={() => handleSaveDay(day.value)}
                      disabled={loading}
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition min-h-10 font-semibold flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Salvar
                    </button>
                    <button
                      onClick={() => setEditingDay(null)}
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm bg-muted hover:bg-muted/80 text-foreground rounded-lg transition min-h-10 font-semibold flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
