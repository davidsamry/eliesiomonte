import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { guardSetupRoute } from '@/lib/security/setup-guard'

/**
 * Setup endpoint para criar a tabela notification_templates
 * Este endpoint deve ser chamado uma única vez para inicializar a tabela
 */

export async function POST(request: NextRequest) {
  const blocked = guardSetupRoute(request)
  if (blocked) return blocked

  try {
    const supabase = await createClient()

    // Cria a tabela notification_templates
    const { error: createTableError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS notification_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          barbershop_id UUID,
          type TEXT NOT NULL CHECK (type IN ('confirmation', 'reminder_24h', 'reminder_30min')),
          message TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(barbershop_id, type)
        );
      `,
    })

    if (createTableError && !createTableError.message.includes('already exists')) {
      throw createTableError
    }

    // Insere templates padrão
    const defaultTemplates = [
      {
        type: 'confirmation',
        message: 'Olá {{customer_name}}! Seu agendamento com {{barber_name}} para {{service_name}} foi confirmado para {{appointment_date}} às {{appointment_time}}. Não se esqueça! 💈',
      },
      {
        type: 'reminder_24h',
        message: 'Oi {{customer_name}}! Lembrete: seu agendamento com {{barber_name}} para {{service_name}} é amanhã às {{appointment_time}}. Aguardamos você! 😊',
      },
      {
        type: 'reminder_30min',
        message: 'Oi {{customer_name}}! Faltam apenas 30 minutos para seu agendamento com {{barber_name}}. Estamos esperando! 💈',
      },
    ]

    for (const template of defaultTemplates) {
      // Verifica se já existe
      const { data: existing } = await supabase
        .from('notification_templates')
        .select('id')
        .eq('type', template.type)
        .is('barbershop_id', null)
        .single()

      if (!existing) {
        // Insere novo template
        const { error: insertError } = await supabase
          .from('notification_templates')
          .insert({
            type: template.type,
            message: template.message,
            barbershop_id: null,
          })

        if (insertError) {
          console.error('[v0] Erro ao inserir template padrão:', insertError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Tabela notification_templates criada com sucesso',
    })
  } catch (error: any) {
    console.error('[v0] Erro ao criar tabela:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Falha ao criar tabela',
      },
      { status: 500 }
    )
  }
}
