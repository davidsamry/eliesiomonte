'use client'

import { useState, useEffect } from 'react'
import { LoginForm } from '@/components/auth/login-form'
import { BookingForm } from '@/components/booking/booking-form'
import { AppointmentsList } from '@/components/dashboard/appointments-list'
import { Scissors, Calendar, Plus } from 'lucide-react'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [bookingConfirmed, setBookingConfirmed] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)

  useEffect(() => {
    // Verifica autenticação localStorage
    const storedCustomerId = localStorage.getItem('customerId')
    const storedPhone = localStorage.getItem('phoneNumber')
    const storedName = localStorage.getItem('customerName')
    if (storedCustomerId && storedPhone && storedName) {
      setCustomerId(storedCustomerId)
      setPhoneNumber(storedPhone)
      setCustomerName(storedName)
      setIsAuthenticated(true)
    }
  }, [])

  const handleLoginSuccess = (id: string, phone: string, name: string) => {
    setCustomerId(id)
    setPhoneNumber(phone)
    setCustomerName(name)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('customerId')
    localStorage.removeItem('phoneNumber')
    localStorage.removeItem('customerName')
    setIsAuthenticated(false)
    setCustomerId('')
    setPhoneNumber('')
    setCustomerName('')
    setBookingConfirmed(false)
  }

  const handleBookingSuccess = () => {
    setBookingConfirmed(true)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Scissors className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-primary">ELIESIO MONTE</h1>
          </div>
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="text-sm text-primary hover:underline font-medium"
            >
              Sair
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {!isAuthenticated ? (
          // Login Section
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-xl sm:text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                <Calendar className="w-6 sm:w-8 h-6 sm:h-8 text-primary" />
                Realizar agendamento
              </h2>
              <p className="text-sm sm:text-lg text-muted-foreground">
                {phoneNumber}
              </p>
            </div>

            <div className="bg-card rounded-xl p-8 border border-border shadow-lg">
              <LoginForm onSuccess={handleLoginSuccess} />
            </div>

            <div className="mt-8 text-center text-sm text-muted-foreground">
              <p>✂️ Atendimento de segunda a sábado , 08:00 às 20:00</p>
              <p>📍 Sobral - CE</p>
            </div>
          </div>
        ) : showDashboard ? (
          // Dashboard Section
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
              <div>
                <h2 className="text-xl sm:text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                  <Calendar className="w-6 sm:w-8 h-6 sm:h-8 text-primary" />
                  Meus Agendamentos
                </h2>
                <p className="text-xs sm:text-lg text-muted-foreground">
                  Telefone: {phoneNumber}
                </p>
              </div>
              <button
                onClick={() => setShowDashboard(false)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 sm:py-4 px-3 sm:px-4 text-sm sm:text-base rounded-lg flex items-center gap-2 transition min-h-12 justify-center sm:justify-start"
              >
                <Plus className="w-5 h-5" />
                Novo Agendamento
              </button>
            </div>

            <div className="bg-card rounded-xl p-8 border border-border shadow-lg">
              <AppointmentsList customerId={customerId} />
            </div>
          </div>
        ) : bookingConfirmed ? (
          // Success Screen
          <div className="max-w-md mx-auto text-center">
            <div className="bg-card rounded-xl p-8 sm:p-12 border border-border shadow-lg">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <h2 className="text-lg sm:text-2xl font-bold text-foreground mb-2 sm:mb-3">
                Agendamento Confirmado!
              </h2>

              <p className="text-xs sm:text-base text-muted-foreground mb-4 sm:mb-6">
                Você receberá um lembrete no WhatsApp 24 horas antes do seu agendamento.
              </p>

              <button
                onClick={() => {
                  setBookingConfirmed(false)
                  setShowDashboard(false)
                }}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 sm:py-4 text-sm sm:text-base rounded-lg transition min-h-12"
              >
                Fazer Novo Agendamento
              </button>

              <button
                onClick={() => setShowDashboard(true)}
                className="w-full mt-3 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold py-3 sm:py-4 text-sm sm:text-base rounded-lg transition min-h-12"
              >
                Ver Meus Agendamentos
              </button>

              <button
                onClick={handleLogout}
                className="w-full mt-3 text-primary hover:underline font-medium py-3 text-sm sm:text-base"
              >
                Sair
              </button>
            </div>
          </div>
        ) : (
          // Booking Section
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
              <div className="text-left">
                <h2 className="text-xl sm:text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                  <Scissors className="w-6 sm:w-8 h-6 sm:h-8 text-primary" />
                  Escolha seu Agendamento
                </h2>
                <p className="text-xs sm:text-lg text-muted-foreground">
                  Telefone: {phoneNumber}
                </p>
              </div>
              <button
                onClick={() => setShowDashboard(true)}
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold py-2 px-3 sm:px-4 rounded-lg flex items-center gap-2 transition text-sm sm:text-base min-h-12 sm:min-h-auto"
              >
                <Calendar className="w-5 h-5" />
                Ver Agendamentos
              </button>
            </div>

            <div className="bg-card rounded-xl p-8 border border-border shadow-lg">
              <BookingForm
                customerId={customerId}
                phoneNumber={phoneNumber}
                onSuccess={handleBookingSuccess}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-20 border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 ELIESIO MONTE Barbearia. Todos os direitos reservados.</p>
        </div>
      </footer>
    </main>
  )
}
