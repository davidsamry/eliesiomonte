'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, ArrowLeft } from 'lucide-react'
import WhatsAppBaileysSettings from '@/components/admin/whatsapp-baileys-settings'

export default function SettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('whatsapp')
  const [whatsappConnected, setWhatsappConnected] = useState(false)

  const tabs = [
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'general', label: 'Geral' },
    { id: 'billing', label: 'Faturamento' },
  ]

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie as configurações da sua barbearia
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          title="Voltar para o painel admin"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Voltar</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex border-b border-border p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'whatsapp' && (
            <WhatsAppBaileysSettings />
          )}

          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-foreground mb-4">
                  Informações da Barbearia
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground block mb-1">
                      Nome da Barbearia
                    </label>
                    <input
                      type="text"
                      defaultValue="Eliesio Monte Barbearia"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-foreground block mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      defaultValue="contato@eliesio.com"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-foreground block mb-1">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      defaultValue="(11) 9999-9999"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-foreground block mb-1">
                      Endereço
                    </label>
                    <textarea
                      defaultValue="Rua exemplo, 123 - São Paulo, SP"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:border-primary focus:outline-none"
                      rows={3}
                    />
                  </div>

                  <button className="px-4 py-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition">
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                💳 Seção de faturamento ainda em desenvolvimento
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
