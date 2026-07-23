'use client'

import { useState, useEffect } from 'react'
import { format, addDays } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, Scissors, User } from 'lucide-react'

interface BookingFormProps {
  customerId: string
  phoneNumber: string
  onSuccess: () => void
}

interface Service {
  id: string
  name: string
  duration: number
  price: number
}

interface Barber {
  id: string
  full_name: string
}

interface TimeSlot {
  time: string
  available: boolean
}

interface BlockedDate {
  id: string
  barber_id: string
  start_date: string
  end_date: string
  reason?: string
}

interface BarberAvailability {
  id: string
  barber_id: string
  day_of_week: number // 0 = domingo, 1 = segunda, ..., 6 = sábado
  start_time: string // "09:00"
  end_time: string // "18:00"
  break_start?: string // "12:00"
  break_end?: string // "13:00"
  is_available?: boolean
}

export function BookingForm({
  customerId,
  phoneNumber,
  onSuccess,
}: BookingFormProps) {
  const [services, setServices] = useState<Service[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [selectedBarber, setSelectedBarber] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedService, setSelectedService] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [dataLoading, setDataLoading] = useState(true)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [barberAvailability, setBarberAvailability] = useState<BarberAvailability[]>([])

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedBarber && selectedDate && selectedService) {
      loadTimeSlots()
    } else {
      setTimeSlots([])
    }
  }, [selectedBarber, selectedDate, selectedService, blockedDates, appointments, barberAvailability, services])

  const loadInitialData = async () => {
    try {
      const startDate = format(new Date(), 'yyyy-MM-dd')
      const endDate = format(addDays(new Date(), 30), 'yyyy-MM-dd')

      const response = await fetch(
        `/api/appointments/available?startDate=${startDate}&endDate=${endDate}`
      )

      if (!response.ok) throw new Error('Falha ao carregar dados')

      const data = await response.json()
      setServices(data.services || [])
      setBarbers(data.barbers || [])
      setAppointments(data.appointments || [])
      setBlockedDates(data.blockedDates || [])
      setBarberAvailability(data.barberAvailability || [])
    } catch (err) {
      setError('Falha ao carregar disponibilidades')
      console.error('[v0] Error loading data:', err)
    } finally {
      setDataLoading(false)
    }
  }

  const loadTimeSlots = () => {
    if (!selectedDate || !selectedBarber || !selectedService) {
      setTimeSlots([])
      return
    }

    // Duração do serviço escolhido (minutos)
    const serviceDuration =
      services.find((s) => s.id === selectedService)?.duration || 30

    // Mapa id do serviço -> duração, para calcular quanto cada agendamento ocupa
    const serviceDurations: Record<string, number> = {}
    for (const s of services) serviceDurations[s.id] = s.duration || 30

    // Intervalos ocupados (em minutos a partir da meia-noite) neste dia/barbeiro
    const busyIntervals: { start: number; end: number }[] = []
    for (const apt of appointments || []) {
      if (apt.barber_id !== selectedBarber) continue
      if (apt.status !== 'confirmed' && apt.status !== 'pending') continue
      const norm = String(apt.scheduled_datetime || '').split('+')[0].split('.')[0]
      if (!norm.startsWith(selectedDate)) continue
      const timePart = norm.split('T')[1] || '00:00:00'
      const [ah, am] = timePart.split(':').map(Number)
      const aptStart = ah * 60 + am
      const aptDur = serviceDurations[apt.service_id as string] || 30
      busyIntervals.push({ start: aptStart, end: aptStart + aptDur })
    }

    // Verifica se o dia está bloqueado para este barbeiro
    const isDateBlocked = (blockedDates || []).some(
      (blocked) =>
        blocked.barber_id === selectedBarber &&
        selectedDate >= blocked.start_date &&
        selectedDate <= blocked.end_date
    )

    if (isDateBlocked) {
      setTimeSlots([])
      return
    }

    // Verifica se o barbeiro trabalha neste dia da semana.
    // Parseia como data LOCAL (new Date("YYYY-MM-DD") seria UTC e, no fuso do
    // Brasil, cairia no dia anterior — mostrando o dia da semana errado).
    const [selY, selM, selD] = selectedDate.split('-').map(Number)
    const selectedDateObj = new Date(selY, selM - 1, selD)
    const dayOfWeek = selectedDateObj.getDay() // 0 = domingo, 1 = segunda, etc.

    const barberWorkingDays = (barberAvailability || []).filter(
      (avail) => avail.barber_id === selectedBarber
    )

    // Se não há configuração de disponibilidade, assume seg-sex 09-18h com pausa 12-13h
    const dayAvailability = barberWorkingDays.find(
      (avail) => avail.day_of_week === dayOfWeek && avail.is_available
    )

    if (!dayAvailability) {
      // Dia não configurado como dia de trabalho ou desativado
      setTimeSlots([])
      return
    }

    // Valida se os horários são válidos (não 00:00)
    if (dayAvailability.start_time === '00:00:00' || dayAvailability.end_time === '00:00:00') {
      setTimeSlots([])
      return
    }

    const slots: TimeSlot[] = []

    const [startHour, startMin] = dayAvailability.start_time.split(':').map(Number)
    const [endHour, endMin] = dayAvailability.end_time.split(':').map(Number)
    const workStart = startHour * 60 + startMin
    const workEnd = endHour * 60 + endMin
    const bStart = dayAvailability.break_start
      ? dayAvailability.break_start.split(':').map(Number)
      : null
    const bEnd = dayAvailability.break_end
      ? dayAvailability.break_end.split(':').map(Number)
      : null
    const breakStart = bStart ? bStart[0] * 60 + bStart[1] : null
    const breakEnd = bEnd ? bEnd[0] * 60 + bEnd[1] : null

    // Para o dia de hoje, não oferecer horários que já passaram
    const now = new Date()
    const isToday =
      now.getFullYear() === selY &&
      now.getMonth() === selM - 1 &&
      now.getDate() === selD
    const nowMinutes = now.getHours() * 60 + now.getMinutes()

    const STEP = 30 // início dos horários a cada 30 min
    // O serviço inteiro precisa caber antes do fim do expediente
    for (let start = workStart; start + serviceDuration <= workEnd; start += STEP) {
      const end = start + serviceDuration

      if (isToday && start <= nowMinutes) continue

      // Não pode cruzar a pausa (ex.: almoço)
      if (
        breakStart !== null &&
        breakEnd !== null &&
        start < breakEnd &&
        end > breakStart
      ) {
        continue
      }

      // Não pode sobrepor outro agendamento do barbeiro
      const overlaps = busyIntervals.some((iv) => start < iv.end && end > iv.start)
      if (overlaps) continue

      const hh = String(Math.floor(start / 60)).padStart(2, '0')
      const mm = String(start % 60).padStart(2, '0')
      slots.push({ time: `${hh}:${mm}`, available: true })
    }

    setTimeSlots(slots)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (!selectedDate || !selectedTime || !selectedService || !selectedBarber) {
        throw new Error('Por favor, preencha todos os campos')
      }

      const scheduledDateTime = `${selectedDate}T${selectedTime}:00`
      const selectedBarberData = barbers.find((b) => b.id === selectedBarber)

      const payload = {
        customerId,
        phoneNumber,
        barberName: selectedBarberData?.full_name,
        barberId: selectedBarber,
        serviceId: selectedService,
        scheduledDateTime,
        notes,
      }

      const response = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || 'Falha ao criar agendamento')
      }

      setMessage('Agendamento confirmado com sucesso!')
      setTimeout(() => onSuccess(), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao agendar')
    } finally {
      setLoading(false)
    }
  }

  if (dataLoading) {
    return <div className="text-center py-8">Carregando disponibilidades...</div>
  }

  const availableTimeSlots = timeSlots.filter((slot) => slot.available)

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      {/* Step 1: Barbeiro (SEMPRE VISÍVEL) */}
      <div>
        <label className="block text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          1. Selecione um Barbeiro
        </label>
        <select
          value={selectedBarber}
          onChange={(e) => {
            setSelectedBarber(e.target.value)
            setSelectedDate('')
            setSelectedTime('')
            setTimeSlots([])
          }}
          className="w-full px-3 sm:px-4 py-3 text-sm sm:text-base border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card h-12"
          disabled={loading}
        >
          <option value="">Escolha um barbeiro</option>
          {barbers.map((barber) => (
            <option key={barber.id} value={barber.id}>
              {barber.full_name}
            </option>
          ))}
        </select>
      </div>

      {/* Step 2: Data (ATIVADO APÓS BARBEIRO) */}
      <div>
        <label className="block text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-foreground flex items-center gap-2">
          <Calendar className="w-4 sm:w-5 h-4 sm:h-5 text-accent" />
          2. Data do Agendamento
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value)
            setSelectedTime('')
          }}
          className="w-full px-3 sm:px-4 py-3 text-sm sm:text-base border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary bg-card h-12 appearance-none"
          style={{ lineHeight: '1.5' }}
          disabled={loading || !selectedBarber}
        />
      </div>

      {/* Step 3: Serviço (define a duração para calcular os horários) */}
      <div>
        <label className="block text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-foreground flex items-center gap-2">
          <Scissors className="w-4 sm:w-5 h-4 sm:h-5 text-primary" />
          3. Serviço
        </label>
        <select
          value={selectedService}
          onChange={(e) => {
            setSelectedService(e.target.value)
            setSelectedTime('')
          }}
          className="w-full px-3 sm:px-4 py-3 text-sm sm:text-base border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card h-12"
          disabled={loading || !selectedDate}
        >
          <option value="">Selecione um serviço</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} - R$ {service.price.toFixed(2)} ({service.duration}min)
            </option>
          ))}
        </select>
      </div>

      {/* Step 4: Horário (calculado pela duração do serviço) */}
      <div>
        <label className="block text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-foreground flex items-center gap-2">
          <Clock className="w-4 sm:w-5 h-4 sm:h-5 text-accent" />
          4. Horário Disponível
        </label>
        <select
          value={selectedTime}
          onChange={(e) => setSelectedTime(e.target.value)}
          className="w-full px-3 sm:px-4 py-3 text-sm sm:text-base border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-card h-12"
          disabled={loading || !selectedDate || !selectedService}
        >
          <option value="">
            {selectedService ? 'Escolha um horário' : 'Escolha o serviço primeiro'}
          </option>
          {availableTimeSlots.map((slot) => (
            <option key={slot.time} value={slot.time}>
              {slot.time}
            </option>
          ))}
        </select>
        {selectedService && selectedDate && availableTimeSlots.length === 0 && (
          <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-700 font-semibold">
              {(() => {
                const isDateBlocked = (blockedDates || []).some(
                  (blocked) =>
                    blocked.barber_id === selectedBarber &&
                    selectedDate >= blocked.start_date &&
                    selectedDate <= blocked.end_date
                )

                const [my, mm, md] = selectedDate.split('-').map(Number)
                const selectedDateObj = new Date(my, mm - 1, md)
                const dayOfWeek = selectedDateObj.getDay()
                const barberWorkingDays = (barberAvailability || []).filter(
                  (avail) => avail.barber_id === selectedBarber
                )
                const isWorkingDay = barberWorkingDays.some(
                  (avail) => avail.day_of_week === dayOfWeek && avail.is_available
                )

                if (isDateBlocked) {
                  return 'Indisponível - Este dia está bloqueado'
                } else if (!isWorkingDay) {
                  return 'Indisponível - Barbeiro não trabalha neste dia'
                } else {
                  return 'Sem horários que comportem este serviço nesta data'
                }
              })()}
            </p>
          </div>
        )}
      </div>

      {/* Step 5: Notas */}
      <div>
        <label className="block text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-foreground">
          5. Notas Adicionais (opcional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observações sobre o serviço..."
          className="w-full px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-card resize-none"
          rows={4}
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {message && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">{message}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={loading || !selectedDate || !selectedTime || !selectedService || !selectedBarber}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 sm:py-4 font-semibold text-sm sm:text-base min-h-12"
      >
        {loading ? 'Agendando...' : 'Confirmar Agendamento'}
      </Button>
    </form>
  )
}
