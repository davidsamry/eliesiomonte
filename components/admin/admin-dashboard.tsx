'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BarChart3, Users, Calendar, DollarSign, TrendingUp, CheckCircle, XCircle, Settings, Clock, User, Scissors, MessageCircle, Save, Trash2 } from 'lucide-react'
import { ServicesManagement } from './services-management'
import { BarbersManagement } from './barbers-management'
import { AppointmentsManagement } from './appointments-management'
import { BarberAvailabilityManagement } from './barber-availability-management'
import { BlockedDatesManagement } from './blocked-dates-management'
import { NotificationTemplatesManagement } from './notification-templates-management'

interface KPI {
  date: string
  totalRevenue: number
  totalAppointments: number
  completedAppointments: number
  cancelledAppointments: number
  occupancyRate: number
  uniqueCustomers: number
}

interface Appointment {
  id: string
  scheduled_datetime: string
  status: string
  notes?: string
  amount?: number
  customer?: { id: string; full_name: string; phone: string }
  customers?: { id: string; full_name: string; phone: string }
  barber?: { id: string; full_name: string }
  barbers?: { id: string; full_name: string }
  service?: { id: string; name: string; price: number }
  services?: { id: string; name: string; price: number }
}

interface Notification {
  id: string
  type: 'confirmation' | 'reminder' | 'cancellation'
  phone_number: string
  message: string
  status: string
  sent_at: string
}

interface AdminDashboardProps {
  adminName: string
  onLogout: () => void
}

export function AdminDashboard({ adminName, onLogout }: AdminDashboardProps) {
  const router = useRouter()
  const [kpis, setKpis] = useState<KPI | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  // Usa format() do date-fns para garantir data local (não UTC)
  const todayLocal = format(new Date(), 'yyyy-MM-dd')
  const [selectedDate, setSelectedDate] = useState(todayLocal)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [updatingId, setUpdatingId] = useState('')
  const [activeTab, setActiveTab] = useState<'appointments' | 'notifications' | 'manual-booking' | 'settings' | 'availability' | 'notification-templates'>('appointments')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationCounts, setNotificationCounts] = useState({
    confirmation: 0,
    reminder: 0,
    cancellation: 0,
  })
  const [barbers, setBarbers] = useState<Array<{ id: string; full_name: string }>>([])
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null)
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [selectedDate, selectedBarber, selectedStatus])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      // Carrega KPIs
      const kpiResponse = await fetch(`/api/admin/kpis?date=${selectedDate}`)
      if (kpiResponse.ok) {
        const kpiData = await kpiResponse.json()
        setKpis(kpiData)
      }

      // Carrega agendamentos
      const appointmentsUrl = `/api/admin/appointments?date=${selectedDate}${
        selectedStatus ? `&status=${selectedStatus}` : ''
      }${selectedBarber ? `&barber_id=${selectedBarber}` : ''}`
      const appointmentsResponse = await fetch(appointmentsUrl)
      if (appointmentsResponse.ok) {
        const appointmentsData = await appointmentsResponse.json()
        setAppointments(appointmentsData.appointments || [])
      }

      // Carrega notificações
      const notificationsUrl = `/api/admin/notifications?date=${selectedDate}`
      const notificationsResponse = await fetch(notificationsUrl)
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json()
        setNotifications(notificationsData.notifications || [])
        setNotificationCounts(notificationsData.countByType)
      }

      // Carrega barbeiros
      const barbersResponse = await fetch('/api/barbers')
      if (barbersResponse.ok) {
        const barbersData = await barbersResponse.json()
        setBarbers(barbersData.filter((b: any) => b.is_active))
      }
    } catch (err) {
      setError('Falha ao carregar dados')
      console.error('[v0] Error loading admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (appointmentId: string, newStatus: string, amount?: number) => {
    try {
      setUpdatingId(appointmentId)
      setError('')
      setSuccess('')
      
      const appointment = appointments.find(a => a.id === appointmentId)
      
      const response = await fetch(`/api/admin/appointments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          appointmentId,
          status: newStatus,
          amount: amount !== undefined ? amount : (appointment?.amount || 0),
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Falha ao atualizar agendamento')
      }

      // Recarrega os dados
      await loadData()
      
      // Mostrar mensagem de sucesso
      setSuccess('Agendamento atualizado com sucesso!')
      setTimeout(() => setSuccess(''), 3000)
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Falha ao atualizar agendamento'
      setError(errorMsg)
      console.error('[v0] Error updating appointment:', err)
    } finally {
      setUpdatingId('')
    }
  }

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      setUpdatingId(appointmentId)
      setError('')
      setSuccess('')

      const response = await fetch(`/api/admin/appointments?id=${appointmentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Falha ao excluir agendamento')
      }

      // Recarrega os dados
      await loadData()

      // Mostrar mensagem de sucesso
      setSuccess('Agendamento excluído com sucesso!')
      setTimeout(() => setSuccess(''), 3000)

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Falha ao excluir agendamento'
      setError(errorMsg)
      console.error('[v0] Error deleting appointment:', err)
    } finally {
      setUpdatingId('')
    }
  }

  if (loading && !kpis) {
    return <div className="text-center py-8">Carregando dashboard...</div>
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Painel Admin</h2>
          <p className="text-muted-foreground">Bem-vindo, {adminName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/settings')}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs sm:text-sm font-medium transition"
            title="Configurar notificações WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
          <button
            onClick={onLogout}
            className="text-sm text-primary hover:underline font-medium"
          >
            Sair
          </button>
        </div>
      </div>

      {/* Date Selector with Presets */}
      {(() => {
        // Calcula datas no fuso local usando date-fns (nunca toISOString que usa UTC)
        const today = format(new Date(), 'yyyy-MM-dd')
        const addDays = (n: number) => {
          const d = new Date()
          d.setDate(d.getDate() + n)
          return format(d, 'yyyy-MM-dd')
        }
        const tomorrow = addDays(1)

        const btnClass = (active: boolean) =>
          `px-3 py-1 rounded-lg text-sm font-semibold transition h-9 ${
            active
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border hover:bg-accent'
          }`

        return (
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-semibold text-foreground">Data:</label>
            <div className="flex gap-2 items-center flex-wrap">
              <button onClick={() => setSelectedDate(today)} className={btnClass(selectedDate === today)}>
                Hoje
              </button>
              <button onClick={() => setSelectedDate(tomorrow)} className={btnClass(selectedDate === tomorrow)}>
                Amanhã
              </button>
              {[2, 3, 4, 5, 6].map((n) => {
                const d = addDays(n)
                const label = format(new Date(d + 'T12:00:00'), 'dd/MM', { locale: ptBR })
                return (
                  <button key={n} onClick={() => setSelectedDate(d)} className={btnClass(selectedDate === d)}>
                    {label}
                  </button>
                )
              })}
              <div className="flex items-center gap-1">
                <label htmlFor="date-picker" className="text-xs text-muted-foreground font-medium">Ou:</label>
                <input
                  id="date-picker"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2 py-1 text-sm border border-border rounded-lg bg-card hover:bg-accent transition cursor-pointer h-9"
                />
              </div>
            </div>
          </div>
        )
      })()}

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
          <div className="bg-card border border-border rounded-lg p-3 sm:p-4 space-y-1 sm:space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">Receita</p>
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-primary">R$ {kpis.totalRevenue.toFixed(2)}</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-3 sm:p-4 space-y-1 sm:space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">Agendamentos</p>
              <Calendar className="w-4 h-4 text-secondary" />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-secondary">{kpis.totalAppointments}</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-3 sm:p-4 space-y-1 sm:space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">Completos</p>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-green-600">{kpis.completedAppointments}</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-3 sm:p-4 space-y-1 sm:space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">Cancelados</p>
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-red-600">{kpis.cancelledAppointments}</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-3 sm:p-4 space-y-1 sm:space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">Ocupação</p>
              <BarChart3 className="w-4 h-4 text-accent" />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-accent">{kpis.occupancyRate}%</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-3 sm:p-4 space-y-1 sm:space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">Clientes</p>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-primary">{kpis.uniqueCustomers}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        <button
          onClick={() => setActiveTab('appointments')}
          className={`px-3 sm:px-4 py-2 sm:py-3 font-semibold text-xs sm:text-sm transition min-h-10 whitespace-nowrap ${
            activeTab === 'appointments'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Agendamentos
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-3 sm:px-4 py-2 sm:py-3 font-semibold text-xs sm:text-sm transition min-h-10 whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Notificações
        </button>
        <button
          onClick={() => setActiveTab('manual-booking')}
          className={`px-3 sm:px-4 py-2 sm:py-3 font-semibold text-xs sm:text-sm transition min-h-10 whitespace-nowrap ${
            activeTab === 'manual-booking'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Novo Agendamento
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3 sm:px-4 py-2 sm:py-3 font-semibold text-xs sm:text-sm transition min-h-10 whitespace-nowrap ${
            activeTab === 'settings'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Configurações
        </button>
        <button
          onClick={() => setActiveTab('availability')}
          className={`px-3 sm:px-4 py-2 sm:py-3 font-semibold text-xs sm:text-sm transition min-h-10 whitespace-nowrap ${
            activeTab === 'availability'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Disponibilidades
        </button>
        <button
          onClick={() => setActiveTab('notification-templates')}
          className={`px-3 sm:px-4 py-2 sm:py-3 font-semibold text-xs sm:text-sm transition min-h-10 whitespace-nowrap ${
            activeTab === 'notification-templates'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Templates de Notificações
        </button>
      </div>

      {/* Appointments Management */}
      {activeTab === 'appointments' && (
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 className="text-lg sm:text-xl font-bold text-foreground">Agendamentos</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedBarber || ''}
              onChange={(e) => setSelectedBarber(e.target.value || null)}
              className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm border border-border rounded-lg bg-card min-h-10"
            >
              <option value="">Todos os barbeiros</option>
              {barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.full_name}
                </option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm border border-border rounded-lg bg-card min-h-10"
            >
              <option value="">Todos os status</option>
              <option value="pending">Pendentes</option>
              <option value="confirmed">Confirmados</option>
              <option value="completed">Completos</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs sm:text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs sm:text-sm text-green-700">{success}</p>
          </div>
        )}

        {appointments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum agendamento nesta data</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {appointments.map((apt) => {
              const appointmentDate = new Date(apt.scheduled_datetime.split('+')[0])
              const formattedTime = format(appointmentDate, "HH:mm", { locale: ptBR })
              
              const statusConfig = {
                confirmed: { label: 'Confirmado', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
                pending: { label: 'Pendente', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
                completed: { label: 'Completo', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
                cancelled: { label: 'Cancelado', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
              }
              
              const currentStatus = statusConfig[apt.status as keyof typeof statusConfig] || statusConfig.pending
              const displayAmount = apt.amount || apt.services?.price || 0
              
              return (
                <div key={apt.id} className="bg-white border border-gray-200 rounded-lg p-2 shadow-sm hover:shadow-md transition-all">
                  {/* Section 1: Header */}
                  <div className="flex items-start justify-between gap-2 pb-2">
                    <div className="flex items-start gap-1.5 flex-1">
                      {/* Clock Icon and Time */}
                      <div className="flex flex-col items-center gap-0 flex-shrink-0">
                        <div className="bg-blue-100 rounded-full p-0.5">
                          <Clock className="w-3 h-3 text-blue-600" />
                        </div>
                        <p className="text-xs font-bold text-gray-900 leading-tight">{formattedTime}</p>
                      </div>
                      
                      {/* Service Info */}
                      <div className="flex-1 flex flex-col justify-start">
                        <h3 className="text-xs font-bold text-gray-900 leading-tight">{apt.services?.name || 'Serviço'}</h3>
                        <p className="text-xs text-gray-500 leading-tight">Corte de cabelo.</p>
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={() => setOpenStatusDropdown(openStatusDropdown === apt.id ? null : apt.id)}
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-semibold transition-all ${currentStatus.badge}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${currentStatus.dot}`}></span>
                        {currentStatus.label}
                      </button>
                      
                      {/* Dropdown */}
                      {openStatusDropdown === apt.id && (
                        <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                          {Object.entries(statusConfig).map(([key, config]) => (
                            <button
                              key={key}
                              onClick={() => {
                                handleStatusUpdate(apt.id, key, apt.amount)
                                setOpenStatusDropdown(null)
                              }}
                              disabled={updatingId === apt.id}
                              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors disabled:opacity-50 text-sm"
                            >
                              <span className={`inline-flex items-center gap-2 ${config.badge} font-medium`}>
                                <span className={`w-2 h-2 rounded-full ${config.dot}`}></span>
                                {config.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gray-200 my-1.5"></div>

                  {/* Section 2: Client & Barber */}
                  <div className="space-y-1.5 py-1.5">
                    {/* Cliente */}
                    <div className="flex items-center gap-1.5">
                      <div className="bg-blue-100 rounded p-0.5 flex-shrink-0">
                        <User className="w-3 h-3 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 font-medium leading-none">Cliente</p>
                        <p className="text-xs font-bold text-gray-900 truncate">{apt.customers?.full_name || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Barbeiro + WhatsApp */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <div className="bg-purple-100 rounded p-0.5 flex-shrink-0">
                          <Scissors className="w-3 h-3 text-purple-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500 font-medium leading-none">Barbeiro</p>
                          <p className="text-xs font-bold text-gray-900 truncate">{apt.barbers?.full_name || 'N/A'}</p>
                        </div>
                      </div>
                      
                      {/* WhatsApp Button */}
                      {apt.customers?.phone && (
                        <a
                          href={`https://wa.me/55${apt.customers.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded text-xs font-semibold transition-all flex-shrink-0"
                          title="Enviar mensagem via WhatsApp"
                        >
                          <MessageCircle className="w-3 h-3" />
                          Chat
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gray-200 my-1.5"></div>

                  {/* Section 3: Value Display and Input */}
                  <div className="space-y-1 py-1.5">
                    {/* Display Value */}
                    <div className="flex items-center gap-1.5">
                      <div className="bg-amber-100 rounded p-0.5 flex-shrink-0">
                        <DollarSign className="w-3 h-3 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 font-medium leading-none">Valor</p>
                        <p className="text-xs font-bold text-green-600 leading-tight">R$ {displayAmount.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Input Section */}
                    <div>
                      <input
                        type="number"
                        id={`amount-${apt.id}`}
                        defaultValue={apt.amount?.toFixed(2) || apt.services?.price?.toFixed(2) || '0.00'}
                        step="0.01"
                        min="0"
                        className="w-full px-2 py-1 text-xs font-semibold border border-gray-300 rounded focus:border-blue-500 focus:outline-none transition-colors bg-white"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Footer - Buttons */}
                  <div className="flex gap-1.5 pt-1">
                    <button
                      onClick={() => {
                        try {
                          const input = document.getElementById(`amount-${apt.id}`) as HTMLInputElement
                          const customAmount = parseFloat(input?.value || '0')
                          handleStatusUpdate(apt.id, apt.status, customAmount)
                        } catch (err) {
                          console.error('[v0] Error in save button:', err)
                          alert('Erro ao salvar valor')
                        }
                      }}
                      disabled={updatingId === apt.id}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold text-xs rounded transition-all"
                    >
                      <Save className="w-3 h-3" />
                      {updatingId === apt.id ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      onClick={() => handleDeleteAppointment(apt.id)}
                      disabled={updatingId === apt.id}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold text-xs rounded transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                      {updatingId === apt.id ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      )}

      {/* Notifications History */}
      {activeTab === 'notifications' && (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">Confirmações</p>
            <p className="text-2xl font-bold text-blue-700">{notificationCounts.confirmation}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-600 font-medium">Lembretes</p>
            <p className="text-2xl font-bold text-purple-700">{notificationCounts.reminder}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600 font-medium">Cancelamentos</p>
            <p className="text-2xl font-bold text-red-700">{notificationCounts.cancellation}</p>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Nenhuma notificação enviada nesta data</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 border rounded-lg ${
                  notif.type === 'confirmation'
                    ? 'bg-blue-50 border-blue-200'
                    : notif.type === 'reminder'
                      ? 'bg-purple-50 border-purple-200'
                      : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded ${
                      notif.type === 'confirmation'
                        ? 'bg-blue-200 text-blue-700'
                        : notif.type === 'reminder'
                          ? 'bg-purple-200 text-purple-700'
                          : 'bg-red-200 text-red-700'
                    }`}
                  >
                    {notif.type === 'confirmation'
                      ? 'Confirmação'
                      : notif.type === 'reminder'
                        ? 'Lembrete'
                        : 'Cancelamento'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(notif.sent_at), 'HH:mm', { locale: ptBR })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  <strong>Telefone:</strong> {notif.phone_number}
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{notif.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Manual Booking Tab */}
      {activeTab === 'manual-booking' && (
        <AppointmentsManagement />
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-8">
          <ServicesManagement />
          <div className="border-t border-border pt-8" />
          <BarbersManagement />
        </div>
      )}

      {/* Availability Tab */}
      {activeTab === 'availability' && (
        <div className="space-y-8">
          <BlockedDatesManagement barbers={barbers} />
          <div className="border-t border-border pt-8" />
          
          <div className="space-y-6">
            <h3 className="text-lg sm:text-xl font-bold text-foreground">
              Configurar Horários dos Barbeiros
            </h3>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-3">
                Selecione um barbeiro
              </label>
              <select
                value={selectedBarber || ''}
                onChange={(e) => setSelectedBarber(e.target.value || null)}
                className="w-full px-3 sm:px-4 py-3 text-sm border border-border rounded-lg bg-card h-12"
              >
                <option value="">Escolha um barbeiro...</option>
                {barbers.map(barber => (
                  <option key={barber.id} value={barber.id}>
                    {barber.full_name}
                  </option>
                ))}
              </select>
            </div>

            {selectedBarber && (
              <BarberAvailabilityManagement
                barberId={selectedBarber}
                barberName={barbers.find(b => b.id === selectedBarber)?.full_name || 'Barbeiro'}
              />
            )}
          </div>
        </div>
      )}

      {/* Notification Templates Tab */}
      {activeTab === 'notification-templates' && (
        <NotificationTemplatesManagement />
      )}
    </div>
  )
}
