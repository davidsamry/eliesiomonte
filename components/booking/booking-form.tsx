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
    if (selectedBarber && selectedDate) {
      loadTimeSlots()
    }
  }, [selectedBarber, selectedDate, blockedDates, appointments, barberAvailability])

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
    if (!selectedDate || !selectedBarber) return

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

    // Verifica se o barbeiro trabalha neste dia da semana
    const selectedDateObj = new Date(selectedDate)
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
    
    // Parse dos horários
    const [startHour, startMin] = dayAvailability.start_time.split(':').map(Number)
    const [endHour, endMin] = dayAvailability.end_time.split(':').map(Number)
    const breakStart = dayAvailability.break_start ? dayAvailability.break_start.split(':').map(Number) : null
    const breakEnd = dayAvailability.break_end ? dayAvailability.break_end.split(':').map(Number) : null

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute of [0, 30]) {
        // Pula minutos se for depois do horário final
        if (hour === endHour && minute >= endMin) continue

        // Pula se for pausa de almoço
        if (breakStart && breakEnd) {
          const currentTimeInMinutes = hour * 60 + minute
          const breakStartMinutes = breakStart[0] * 60 + breakStart[1]
          const breakEndMinutes = breakEnd[0] * 60 + breakEnd[1]
          
          if (currentTimeInMinutes >= breakStartMinutes && currentTimeInMinutes < breakEndMinutes) {
            continue
          }
        }

        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        
        // Verifica se o horário específico está agendado (confirmado ou pendente)
        const isBooked = (appointments || []).some(
          (apt) =>
            apt.barber_id === selectedBarber &&
            apt.scheduled_datetime?.startsWith(selectedDate) &&
            apt.scheduled_datetime?.includes(timeStr) &&
            (apt.status === 'confirmed' || apt.status === 'pending')
        )

        // Só adiciona ao array se o horário não está agendado
        if (!isBooked) {
          slots.push({
            time: timeStr,
            available: true,
          })
        }
      }
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

      {/* Step 3: Horário (ATIVADO APÓS DATA) */}
      <div>
        <label className="block text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-foreground flex items-center gap-2">
          <Clock className="w-4 sm:w-5 h-4 sm:h-5 text-accent" />
          3. Horário Disponível
        </label>
        <select
          value={selectedTime}
          onChange={(e) => setSelectedTime(e.target.value)}
          className="w-full px-3 sm:px-4 py-3 text-sm sm:text-base border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-card h-12"
          disabled={loading || !selectedDate}
        >
          <option value="">Escolha um horário</option>
          {availableTimeSlots.map((slot) => (
            <option key={slot.time} value={slot.time}>
              {slot.time}
            </option>
          ))}
        </select>
        {selectedDate && availableTimeSlots.length === 0 && (
          <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-700 font-semibold">
              {(() => {
                const isDateBlocked = (blockedDates || []).some(
                  (blocked) =>
                    blocked.barber_id === selectedBarber &&
                    selectedDate >= blocked.start_date &&
                    selectedDate <= blocked.end_date
                )

                const selectedDateObj = new Date(selectedDate)
                const dayOfWeek = selectedDateObj.getDay()
                const barberWorkingDays = (barberAvailability || []).filter(
                  (avail) => avail.barber_id === selectedBarber
                )
                const isWorkingDay = barberWorkingDays.some(
                  (avail) => avail.day_of_week === dayOfWeek
                )

                if (isDateBlocked) {
                  return 'Indisponível - Este dia está bloqueado'
                } else if (!isWorkingDay) {
                  return 'Indisponível - Barbeiro não trabalha neste dia'
                } else {
                  return 'Indisponível - Todos os horários estão ocupados'
                }
              })()}
            </p>
          </div>
        )}
      </div>

      {/* Step 4: Serviço */}
      <div>
        <label className="block text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-foreground flex items-center gap-2">
          <Scissors className="w-4 sm:w-5 h-4 sm:h-5 text-primary" />
          4. Serviço
        </label>
        <select
          value={selectedService}
          onChange={(e) => setSelectedService(e.target.value)}
          className="w-full px-3 sm:px-4 py-3 text-sm sm:text-base border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card h-12"
          disabled={loading}
        >
          <option value="">Selecione um serviço</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} - R$ {service.price.toFixed(2)} ({service.duration}min)
            </option>
          ))}
        </select>
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
