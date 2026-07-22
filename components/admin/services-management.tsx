'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Scissors, Plus, Edit2, Trash2, X, Check } from 'lucide-react'

interface Service {
  id: string
  name: string
  description: string
  duration: number
  price: number
  is_active: boolean
}

export function ServicesManagement() {
  const [services, setServices] = useState<Service[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: '30',
    price: '',
  })

  useEffect(() => {
    loadServices()
  }, [])

  const loadServices = async () => {
    try {
      const response = await fetch('/api/services')
      if (!response.ok) throw new Error('Falha ao carregar serviços')
      const data = await response.json()
      setServices(data.filter((s: Service) => s.is_active))
    } catch (err) {
      setError('Erro ao carregar serviços')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const url = editingId ? `/api/services/${editingId}` : '/api/services'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          duration: formData.duration,
          price: formData.price,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao salvar serviço')
      }

      await loadServices()
      setFormData({ name: '', description: '', duration: '30', price: '' })
      setEditingId(null)
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar serviço')
      console.error('[v0] Erro ao salvar serviço:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (service: Service) => {
    setFormData({
      name: service.name,
      description: service.description || '',
      duration: service.duration.toString(),
      price: service.price.toString(),
    })
    setEditingId(service.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja deletar este serviço?')) return

    try {
      const response = await fetch(`/api/services/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Falha ao deletar')
      await loadServices()
    } catch (err) {
      setError('Erro ao deletar serviço')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
          <Scissors className="w-5 h-5 text-primary" />
          Gerenciar Serviços
        </h3>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm h-12 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Serviço
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
              Nome do Serviço
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 sm:px-4 py-3 text-xs sm:text-sm border border-border rounded-lg bg-card h-12"
              required
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold mb-2 text-foreground">
              Descrição (opcional)
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 sm:px-4 py-3 text-xs sm:text-sm border border-border rounded-lg bg-card h-12"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs sm:text-sm font-semibold mb-2 text-foreground">
                Duração (minutos)
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-3 sm:px-4 py-3 text-xs sm:text-sm border border-border rounded-lg bg-card h-12"
                required
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold mb-2 text-foreground">
                Preço (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3 sm:px-4 py-3 text-xs sm:text-sm border border-border rounded-lg bg-card h-12"
                required
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-3 sm:py-4 text-xs sm:text-sm h-12"
            >
              {loading ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
                setFormData({ name: '', description: '', duration: '30', price: '' })
              }}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 sm:py-4 text-xs sm:text-sm h-12"
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {services.length === 0 ? (
          <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
            Nenhum serviço disponível
          </p>
        ) : (
          services.map((service) => (
            <div
              key={service.id}
              className="p-3 sm:p-4 bg-card border border-border rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-xs sm:text-sm text-foreground">{service.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {service.duration} min • R$ {service.price.toFixed(2)}
                </p>
                {service.description && (
                  <p className="text-xs text-muted-foreground mt-1">{service.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(service)}
                  className="p-2 hover:bg-primary/10 rounded-lg transition"
                >
                  <Edit2 className="w-4 h-4 text-primary" />
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
