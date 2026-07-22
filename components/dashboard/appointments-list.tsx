'use client'

import { useState, useEffect } from 'react'
import { format, isPast, differenceInHours } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, User, Scissors, Clock, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Appointment {
  id: string
  scheduled_datetime: string
  status: string
  notes?: string
  cancellation_reason?: string
  cancellation_fee?: number
  barber: { id: string; full_name: string }
  service: { id: string; name: string; price: number; duration: number }
}

interface AppointmentsListProps {
  customerId: string
}

export function AppointmentsList({ customerId }: AppointmentsListProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancellingId, setCancellingId] = useState('')
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => {
    loadAppointments()
  }, [customerId])

  const loadAppointments = async () => {
    try {
      const response = await fetch(`/api/customer/appointments?customerId=${customerId}`)
      if (!response.ok) throw new Error('Falha ao carregar agendamentos')

      const data = await response.json()
      setAppointments(data.appointments || [])
    } catch (err) {
      setError('Falha ao carregar seus agendamentos')
      console.error('[v0] Error loading appointments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (appointmentId: string) => {
    try {
      const response = await fetch('/api/appointments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          reason: cancelReason || 'Cliente solicitou',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(
          data.error || 'Falha ao cancelar agendamento'
        )
      }

      // Recarrega os agendamentos
      await loadAppointments()
      setCancellingId('')
      setCancelReason('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar')
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando seus agendamentos...</div>
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Scissors className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Você ainda não tem agendamentos</p>
        <p className="text-sm mt-2">Faça seu primeiro agendamento agora!</p>
      </div>
    )
  }

  // Separa agendamentos próximos dos passados
  const now = new Date()
  const upcomingAppointments = appointments.filter(
    (a) => !isPast(new Date(a.scheduled_datetime)) && a.status !== 'cancelled'
  )
  const pastAppointments = appointments.filter(
    (a) => isPast(new Date(a.scheduled_datetime)) || a.status === 'cancelled'
  )

  const renderAppointmentCard = (appointment: Appointment, canCancel: boolean) => {
    const appointmentDate = new Date(appointment.scheduled_datetime.split('+')[0])
    const formattedDate = format(appointmentDate, "d 'de' MMMM 'às' HH:mm", {
      locale: ptBR,
    })
    const hoursUntil = differenceInHours(appointmentDate, now)

    return (
      <div
        key={appointment.id}
        className={`border rounded-lg p-4 sm:p-6 space-y-3 sm:space-y-4 ${
          appointment.status === 'cancelled'
            ? 'bg-gray-50 border-gray-200 opacity-75'
            : 'bg-card border-border'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm sm:text-base">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{formattedDate}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
              <div className="flex items-start gap-2 text-xs sm:text-sm">
                <Scissors className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                <span className="break-words">{appointment.service.name}</span>
              </div>

              <div className="flex items-start gap-2 text-xs sm:text-sm">
                <User className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                <span className="break-words">{appointment.barber.full_name}</span>
              </div>

              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                <span>{appointment.service.duration} min</span>
              </div>

              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-primary">
                R$ {appointment.service.price.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <span
              className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                appointment.status === 'completed'
                  ? 'bg-green-100 text-green-700'
                  : appointment.status === 'cancelled'
                    ? 'bg-red-100 text-red-700'
                    : appointment.status === 'confirmed'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {appointment.status === 'completed'
                ? 'Realizado'
                : appointment.status === 'cancelled'
                  ? 'Cancelado'
                  : appointment.status === 'confirmed'
                    ? 'Confirmado'
                    : 'Pendente'}
            </span>
          </div>
        </div>

        {appointment.notes && (
          <div className="text-xs sm:text-sm text-muted-foreground border-t pt-2 sm:pt-3">
            <p className="font-semibold mb-1">Observações:</p>
            <p>{appointment.notes}</p>
          </div>
        )}

        {appointment.status === 'cancelled' && (
          <div className="bg-red-50 border border-red-200 rounded p-3 sm:p-4 text-xs sm:text-sm">
            <p className="font-semibold text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Cancelado
            </p>
            {appointment.cancellation_reason && (
              <p className="text-red-600 mt-1">{appointment.cancellation_reason}</p>
            )}
            {appointment.cancellation_fee && (
              <p className="text-red-600 mt-1">
                Taxa: R$ {appointment.cancellation_fee.toFixed(2)}
              </p>
            )}
          </div>
        )}

        {canCancel && cancellingId !== appointment.id && (
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setCancellingId(appointment.id)}
              className="flex-1 text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 py-2 sm:py-3 rounded-lg font-medium transition min-h-10"
            >
              Cancelar Agendamento
            </button>
          </div>
        )}

        {canCancel && cancellingId === appointment.id && (
          <div className="space-y-3 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs sm:text-sm text-red-700 font-semibold">
              Motivo do cancelamento (opcional):
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Digite o motivo..."
              className="w-full px-3 py-2 sm:py-3 text-xs sm:text-sm border border-red-300 rounded min-h-10"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleCancel(appointment.id)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 sm:py-3 rounded-lg font-medium text-xs sm:text-sm transition min-h-10"
              >
                Confirmar Cancelamento
              </button>
              <button
                onClick={() => {
                  setCancellingId('')
                  setCancelReason('')
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 sm:py-3 rounded-lg font-medium text-xs sm:text-sm transition min-h-10"
              >
                Não Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {upcomingAppointments.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-foreground mb-4">
            Próximos Agendamentos
          </h3>
          <div className="space-y-4">
            {upcomingAppointments.map((appointment) => {
              const appointmentDate = new Date(appointment.scheduled_datetime.split('+')[0])
              const hoursUntil = differenceInHours(appointmentDate, now)
              const canCancel = hoursUntil >= 24

              return renderAppointmentCard(appointment, canCancel)
            })}
          </div>
        </div>
      )}

      {pastAppointments.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-foreground mb-4">
            Histórico de Agendamentos
          </h3>
          <div className="space-y-4">
            {pastAppointments.map((appointment) => renderAppointmentCard(appointment, false))}
          </div>
        </div>
      )}
    </div>
  )
}
