'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, ArrowLeft } from 'lucide-react'
import WhatsAppBaileysSettings from '@/components/admin/whatsapp-baileys-settings'

export default function SettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('whatsapp')
  const [whatsappConnected, setWhatsappConnected] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Settings className="w-8 h-8" />
            Configurações
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie as configurações da sua barbearia
          </p>
        </div>
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition min-h-10"
          title="Voltar para o painel admin"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Voltar</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-card border border-border rounded-lg">
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 px-4 py-3 font-semibold text-sm transition ${
              activeTab === 'whatsapp'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            WhatsApp
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 px-4 py-3 font-semibold text-sm transition ${
              activeTab === 'general'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Geral
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`flex-1 px-4 py-3 font-semibold text-sm transition ${
              activeTab === 'billing'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Faturamento
          </button>
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
