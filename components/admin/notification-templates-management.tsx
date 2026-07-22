'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Save } from 'lucide-react'

interface NotificationTemplate {
  id: string
  type: 'confirmation' | 'reminder_24h' | 'reminder_30min'
  title: string
  message: string
  variables: string[]
}

const TEMPLATE_TYPES = [
  {
    id: 'confirmation',
    label: 'Confirmação de Agendamento',
    description: 'Enviada quando o cliente confirma um agendamento',
  },
  {
    id: 'reminder_24h',
    label: 'Lembrete 24 horas antes',
    description: 'Enviada 24 horas antes do agendamento',
  },
  {
    id: 'reminder_30min',
    label: 'Lembrete 30 minutos antes',
    description: 'Enviada 30 minutos antes do agendamento',
  },
]

const AVAILABLE_VARIABLES = [
  { name: 'customer_name', label: '{{customer_name}}' },
  { name: 'barber_name', label: '{{barber_name}}' },
  { name: 'service_name', label: '{{service_name}}' },
  { name: 'appointment_date', label: '{{appointment_date}}' },
  { name: 'appointment_time', label: '{{appointment_time}}' },
]

export function NotificationTemplatesManagement() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [selectedType, setSelectedType] = useState<string>('confirmation')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message_feedback, setMessageFeedback] = useState('')

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      setMessageFeedback('') // Limpa mensagens anteriores
      const response = await fetch('/api/notification-templates')
      if (!response.ok) throw new Error('Falha ao carregar templates')
      const data = await response.json()
      setTemplates(data.templates || [])
      
      // Carrega o template do tipo selecionado
      const selected = data.templates?.find((t: NotificationTemplate) => t.type === selectedType)
      if (selected) {
        setMessage(selected.message)
      }
    } catch (error) {
      console.error('[v0] Erro ao carregar templates:', error)
      setMessageFeedback('Erro ao carregar templates')
    } finally {
      setLoading(false)
    }
  }

  const handleTypeChange = (type: string) => {
    setSelectedType(type)
    const selected = templates.find((t) => t.type === type)
    if (selected) {
      setMessage(selected.message)
    } else {
      setMessage('')
    }
  }

  const handleSaveTemplate = async () => {
    if (!message.trim()) {
      setMessageFeedback('Por favor, preencha a mensagem')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/notification-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          message: message.trim(),
        }),
      })

      if (!response.ok) throw new Error('Falha ao salvar template')

      setMessageFeedback('Template salvo com sucesso!')
      setTimeout(() => setMessageFeedback(''), 3000)
      await loadTemplates()
    } catch (error) {
      console.error('[v0] Erro ao salvar template:', error)
      setMessageFeedback('Erro ao salvar template')
    } finally {
      setSaving(false)
    }
  }

  const insertVariable = (variable: string) => {
    setMessage(message + variable)
  }

  const currentTemplate = TEMPLATE_TYPES.find((t) => t.id === selectedType)

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Personalizar Notificações</p>
          <p className="text-xs text-blue-700 mt-1">
            Customize o conteúdo das mensagens de WhatsApp enviadas aos seus clientes. Use as variáveis disponíveis para personalizar as mensagens.
          </p>
        </div>
      </div>

      {/* Template Type Selection */}
      <div className="space-y-4">
        <label className="text-sm font-semibold text-foreground block">Tipo de Notificação</label>
        <div className="grid grid-cols-1 gap-3">
          {TEMPLATE_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => handleTypeChange(type.id)}
              className={`p-4 border-2 rounded-lg text-left transition ${
                selectedType === type.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-border hover:border-blue-400'
              }`}
            >
              <p className="font-semibold text-sm">{type.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Template Message Editor */}
      <div className="space-y-4">
        <label className="text-sm font-semibold text-foreground block">
          Mensagem - {currentTemplate?.label}
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Digite a mensagem que será enviada via WhatsApp..."
          className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-40 resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {message.length} caracteres
        </p>
      </div>

      {/* Available Variables */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">Variáveis Disponíveis</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {AVAILABLE_VARIABLES.map((variable) => (
            <button
              key={variable.name}
              onClick={() => insertVariable(variable.label)}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-xs font-mono transition"
            >
              {variable.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Preview</p>
        <div className="bg-gray-100 border border-border rounded-lg p-4 text-sm whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
          {message || '(sua mensagem aparecerá aqui)'}
        </div>
      </div>

      {/* Feedback Message */}
      {message_feedback && (
        <div
          className={`p-3 rounded-lg text-sm font-medium ${
            message_feedback.includes('sucesso')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message_feedback}
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSaveTemplate}
        disabled={saving || loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Salvando...' : 'Salvar Template'}
      </button>
    </div>
  )
}
