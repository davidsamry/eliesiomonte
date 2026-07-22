'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar, Plus, Edit2 } from 'lucide-react'

interface Appointment {
  id: string
  customer_id: string
  barber_id: string
  service_id: string
  scheduled_datetime: string
  status: string
  notes: string
}

interface Customer {
  id: string
  full_name: string
  phone: string
}

interface Barber {
  id: string
  full_name: string
}

interface Service {
  id: string
  name: string
  duration: number
}

export function AppointmentsManagement() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    customer_id: '',
    barber_id: '',
    service_id: '',
    scheduled_datetime: '',
    notes: '',
    status: 'confirmed',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [customersRes, barbersRes, servicesRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/barbers'),
        fetch('/api/services'),
      ])

      if (customersRes.ok) setCustomers(await customersRes.json())
      if (barbersRes.ok) setBarbers(await barbersRes.json())
      if (servicesRes.ok) setServices(await servicesRes.json())
    } catch (err) {
      setError('Erro ao carregar dados')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const url = editingId 
        ? `/api/appointments/${editingId}` 
        : '/api/appointments/manual-create'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Falha ao salvar agendamento')

      setFormData({
        customer_id: '',
        barber_id: '',
        service_id: '',
        scheduled_datetime: '',
        notes: '',
        status: 'confirmed',
      })
      setEditingId(null)
      setShowForm(false)
    } catch (err) {
      setError('Erro ao salvar agendamento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Adicionar Agendamento
        </h3>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm h-12 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Agendamento
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs sm:text-sm text-red-700">{error}</p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 bg-card border border-border rounded-lg space-y-3">
          <div>
            <label className="block text-xs sm:text-sm font-semibold mb-2 text-foreground">
              Cliente
            </label>
            <select
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              className="w-full px-3 sm:px-4 py-3 text-xs sm:text-sm border border-border rounded-lg bg-card h-12"
              required
            >
              <option value="">Selecione um cliente</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold mb-2 text-foreground">
              Barbeiro
            </label>
            <select
              value={formData.barber_id}
              onChange={(e) => setFormData({ ...formData, barber_id: e.target.value })}
              className="w-full px-3 sm:px-4 py-3 text-xs sm:text-sm border border-border rounded-lg bg-card h-12"
              required
            >
              <option value="">Selecione um barbeiro</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold mb-2 text-foreground">
              Serviço
            </label>
            <select
              value={formData.service_id}
              onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
              className="w-full px-3 sm:px-4 py-3 text-xs sm:text-sm border border-border rounded-lg bg-card h-12"
              required
            >
              <option value="">Selecione um serviço</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold mb-2 text-foreground">
              Data e Hora
            </label>
            <input
              type="datetime-local"
              value={formData.scheduled_datetime}
              onChange={(e) => setFormData({ ...formData, scheduled_datetime: e.target.value })}
              className="w-full px-3 sm:px-4 py-3 text-xs sm:text-sm border border-border rounded-lg bg-card h-12 appearance-none"
              style={{ lineHeight: '1.5' }}
              required
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold mb-2 text-foreground">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 sm:px-4 py-3 text-xs sm:text-sm border border-border rounded-lg bg-card h-12"
            >
              <option value="confirmed">Confirmado</option>
              <option value="pending">Pendente</option>
              <option value="completed">Completo</option>
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold mb-2 text-foreground">
              Observações
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 sm:px-4 py-3 text-xs sm:text-sm border border-border rounded-lg bg-card min-h-20"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-3 sm:py-4 text-xs sm:text-sm h-12"
            >
              {loading ? 'Salvando...' : 'Salvar Agendamento'}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
                setFormData({
                  customer_id: '',
                  barber_id: '',
                  service_id: '',
                  scheduled_datetime: '',
                  notes: '',
                  status: 'confirmed',
                })
              }}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 sm:py-4 text-xs sm:text-sm h-12"
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
