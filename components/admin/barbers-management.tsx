'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Users, Plus, Edit2, Trash2 } from 'lucide-react'

interface Barber {
  id: string
  full_name: string
  specialty: string[]
  is_active: boolean
}

export function BarbersManagement() {
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    full_name: '',
  })

  useEffect(() => {
    loadBarbers()
  }, [])

  const loadBarbers = async () => {
    try {
      const response = await fetch('/api/barbers')
      if (!response.ok) throw new Error('Falha ao carregar barbeiros')
      const data = await response.json()
      setBarbers(data.filter((b: Barber) => b.is_active))
    } catch (err) {
      setError('Erro ao carregar barbeiros')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const url = editingId ? `/api/barbers/${editingId}` : '/api/barbers'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao salvar barbeiro')
      }

      await loadBarbers()
      setFormData({ full_name: '' })
      setEditingId(null)
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar barbeiro')
      console.error('[v0] Erro ao salvar barbeiro:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (barber: Barber) => {
    setFormData({
      full_name: barber.full_name,
    })
    setEditingId(barber.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja deletar este barbeiro?')) return

    try {
      const response = await fetch(`/api/barbers/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Falha ao deletar')
      await loadBarbers()
    } catch (err) {
      setError('Erro ao deletar barbeiro')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Gerenciar Barbeiros
        </h3>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm h-12 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Barbeiro
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
              Nome do Barbeiro
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 sm:px-4 py-3 text-xs sm:text-sm border border-border rounded-lg bg-card h-12"
              required
            />
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
                setFormData({ full_name: '' })
              }}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 sm:py-4 text-xs sm:text-sm h-12"
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {barbers.length === 0 ? (
          <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
            Nenhum barbeiro disponível
          </p>
        ) : (
          barbers.map((barber) => (
            <div
              key={barber.id}
              className="p-3 sm:p-4 bg-card border border-border rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="flex-1">
                <h4 className="font-semibold text-xs sm:text-sm text-foreground">{barber.full_name}</h4>
                {barber.specialty && barber.specialty.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {barber.specialty.join(', ')}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(barber)}
                  className="p-2 hover:bg-primary/10 rounded-lg transition"
                >
                  <Edit2 className="w-4 h-4 text-primary" />
                </button>
                <button
                  onClick={() => handleDelete(barber.id)}
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
