import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_TEMPLATES = [
  {
    id: 'default-confirmation',
    type: 'confirmation',
    title: 'Confirmação de Agendamento',
    message: 'Olá {{customer_name}}! Seu agendamento com {{barber_name}} para {{service_name}} foi confirmado para {{appointment_date}} às {{appointment_time}}. Não se esqueça! 💈',
    variables: ['customer_name', 'barber_name', 'service_name', 'appointment_date', 'appointment_time'],
  },
  {
    id: 'default-24h',
    type: 'reminder_24h',
    title: 'Lembrete 24 horas antes',
    message: 'Oi {{customer_name}}! Lembrete: seu agendamento com {{barber_name}} para {{service_name}} é amanhã às {{appointment_time}}. Aguardamos você! 😊',
    variables: ['customer_name', 'barber_name', 'service_name', 'appointment_time'],
  },
  {
    id: 'default-30min',
    type: 'reminder_30min',
    title: 'Lembrete 30 minutos antes',
    message: 'Oi {{customer_name}}! Faltam apenas 30 minutos para seu agendamento com {{barber_name}}. Estamos esperando! 💈',
    variables: ['customer_name', 'barber_name'],
  },
]

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .order('type')

    if (error || !data) {
      console.log('[v0] Retornando templates padrão, erro:', error?.message)
      return NextResponse.json({ templates: DEFAULT_TEMPLATES, isDefault: true })
    }

    if (data.length === 0) {
      console.log('[v0] Nenhum template customizado, retornando padrões')
      return NextResponse.json({ templates: DEFAULT_TEMPLATES, isDefault: true })
    }

    // Merge custom com defaults
    const merged = DEFAULT_TEMPLATES.map(defaultTemplate => {
      const custom = data.find(d => d.type === defaultTemplate.type)
      return custom 
        ? { ...defaultTemplate, message: custom.message, id: custom.id }
        : defaultTemplate
    })

    console.log('[v0] Retornando', merged.length, 'templates customizados')
    return NextResponse.json({ templates: merged })
  } catch (err) {
    console.error('[v0] GET erro:', err)
    return NextResponse.json({ templates: DEFAULT_TEMPLATES, isDefault: true })
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await request.json()
    const { type, message } = body

    if (!type || !message) {
      return NextResponse.json(
        { error: 'Type e message são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verificar se já existe
    const { data: existing } = await supabase
      .from('notification_templates')
      .select('id')
      .eq('type', type)
      .single()

    if (existing?.id) {
      // Atualizar
      const { data, error } = await supabase
        .from('notification_templates')
        .update({
          message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()

      if (error) {
        console.error('[v0] Erro ao atualizar:', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      console.log('[v0] Template atualizado:', type)
      return NextResponse.json({ template: data?.[0], success: true })
    } else {
      // Inserir novo
      const { data, error } = await supabase
        .from('notification_templates')
        .insert({ type, message, created_at: new Date().toISOString() })
        .select()

      if (error) {
        console.error('[v0] Erro ao inserir:', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      console.log('[v0] Template criado:', type)
      return NextResponse.json({ template: data?.[0], success: true }, { status: 201 })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[v0] POST erro:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
