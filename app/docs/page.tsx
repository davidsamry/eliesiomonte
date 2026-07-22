import { Scissors, BookOpen, Zap, BarChart3 } from 'lucide-react'

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Scissors className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-primary">ELIESIO MONTE</h1>
          </div>
          <p className="text-muted-foreground">Documentação do Sistema de Agendamentos</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        {/* Visão Geral */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Visão Geral
          </h2>
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <p className="text-foreground">
              O sistema ELIESIO MONTE é uma solução completa de agendamentos para barbearia, 
              desenvolvido com Next.js 16 e Supabase.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Portal de Agendamentos</h3>
                <p className="text-sm text-blue-700">Clientes agendavam serviços 24/7</p>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Dashboard Cliente</h3>
                <p className="text-sm text-green-700">Acompanhe seus agendamentos</p>
              </div>
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2">Painel Admin</h3>
                <p className="text-sm text-purple-700">Gerenciar barbearia completa</p>
              </div>
            </div>
          </div>
        </section>

        {/* Rotas Principais */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            Rotas Principais
          </h2>
          <div className="space-y-3">
            <Route 
              path="/booking" 
              title="Portal de Agendamentos"
              desc="Plataforma pública para clientes agendarem serviços"
            />
            <Route 
              path="/dashboard" 
              title="Dashboard Cliente"
              desc="Área privada para visualizar e gerenciar agendamentos"
            />
            <Route 
              path="/admin" 
              title="Painel Administrativo"
              desc="Dashboard admin com KPIs, agendamentos e notificações"
            />
          </div>
        </section>

        {/* APIs */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            APIs Disponíveis
          </h2>
          
          <div className="space-y-4">
            <APIEndpoint
              method="POST"
              path="/api/admin/login"
              title="Login Admin"
              desc="Autentica um administrador"
              body={{
                email: 'admin@eliesio.com',
                password: 'admin123'
              }}
              response={{
                adminId: 'xxx',
                email: 'admin@eliesio.com',
                fullName: 'Administrador'
              }}
            />

            <APIEndpoint
              method="GET"
              path="/api/admin/kpis?date=2026-07-20"
              title="KPIs do Dashboard"
              desc="Retorna métricas do dia (receita, ocupação, clientes)"
              response={{
                totalRevenue: 250.00,
                totalAppointments: 5,
                completedAppointments: 3,
                occupancyRate: 45,
                uniqueCustomers: 4
              }}
            />

            <APIEndpoint
              method="GET"
              path="/api/admin/appointments?date=2026-07-20&status=confirmed"
              title="Listar Agendamentos"
              desc="Lista agendamentos com filtro por status e data"
              response={{
                appointments: [
                  {
                    id: '123',
                    scheduled_datetime: '2026-07-20T14:00:00',
                    status: 'confirmed',
                    customer: { full_name: 'João Silva', phone: '11987654321' },
                    service: { name: 'Corte Simples', price: 50 }
                  }
                ]
              }}
            />

            <APIEndpoint
              method="POST"
              path="/api/notifications/send"
              title="Enviar Notificação"
              desc="Envia notificação WhatsApp para cliente"
              body={{
                type: 'confirmation',
                appointmentId: '123',
                phoneNumber: '11987654321',
                customerName: 'João Silva',
                serviceName: 'Corte Simples',
                scheduledDateTime: '2026-07-20T14:00:00',
                barberName: 'Carlos Silva'
              }}
            />

            <APIEndpoint
              method="GET"
              path="/api/jobs/send-reminders"
              title="Job de Lembretes"
              desc="Envia lembretes 24h antes do agendamento (pode ser chamado via cron)"
              response={{
                message: 'Lembretes enviados com sucesso',
                count: 5,
                total: 5
              }}
            />
          </div>
        </section>

        {/* Autenticação Admin */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">Credenciais de Teste</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 space-y-3">
            <p className="text-sm text-yellow-700 font-semibold">Use essas credenciais para acessar o painel:</p>
            <div className="space-y-2 font-mono text-sm">
              <div><span className="text-yellow-700 font-semibold">Email:</span> admin@eliesio.com</div>
              <div><span className="text-yellow-700 font-semibold">Senha:</span> admin123</div>
            </div>
          </div>
        </section>

        {/* Tabelas */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">Estrutura do Banco de Dados</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Table
              name="appointments"
              fields={['id', 'customer_id', 'barber_id', 'service_id', 'scheduled_datetime', 'status']}
            />
            <Table
              name="customers"
              fields={['id', 'full_name', 'email', 'phone', 'created_at']}
            />
            <Table
              name="barbers"
              fields={['id', 'full_name', 'specialty', 'is_active']}
            />
            <Table
              name="services"
              fields={['id', 'name', 'duration', 'price', 'is_active']}
            />
            <Table
              name="staff_users"
              fields={['id', 'email', 'role', 'is_active']}
            />
            <Table
              name="notifications"
              fields={['id', 'appointment_id', 'type', 'phone_number', 'sent_at']}
            />
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-border pt-12 text-center text-muted-foreground">
          <p>&copy; 2025 ELIESIO MONTE. Todos os direitos reservados.</p>
        </div>
      </div>
    </main>
  )
}

function Route({ path, title, desc }: { path: string; title: string; desc: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="font-mono text-sm font-semibold text-primary mb-2">{path}</div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  )
}

interface APIEndpointProps {
  method: string
  path: string
  title: string
  desc: string
  body?: Record<string, unknown>
  response?: Record<string, unknown>
}

function APIEndpoint({ method, path, title, desc, body, response }: APIEndpointProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2 py-1 text-xs font-bold rounded ${
            method === 'POST' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
          }`}>
            {method}
          </span>
          <span className="font-mono text-sm text-primary">{path}</span>
        </div>
        <h3 className="font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-3">{desc}</p>
      </div>

      {body && (
        <div className="text-xs space-y-1">
          <p className="font-semibold text-foreground">Corpo da Requisição:</p>
          <pre className="bg-muted p-2 rounded text-muted-foreground overflow-x-auto">
            {JSON.stringify(body, null, 2)}
          </pre>
        </div>
      )}

      {response && (
        <div className="text-xs space-y-1">
          <p className="font-semibold text-foreground">Resposta:</p>
          <pre className="bg-muted p-2 rounded text-muted-foreground overflow-x-auto">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function Table({ name, fields }: { name: string; fields: string[] }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="font-mono font-semibold text-primary mb-3">{name}</h3>
      <div className="space-y-1 text-xs">
        {fields.map((field) => (
          <div key={field} className="text-muted-foreground">
            • {field}
          </div>
        ))}
      </div>
    </div>
  )
}
