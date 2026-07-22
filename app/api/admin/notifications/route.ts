import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format, startOfDay, endOfDay } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')
    const type = searchParams.get('type')

    const supabase = await createClient()
    const date = new Date(dateStr)
    const startDate = startOfDay(date)
    const endDate = endOfDay(date)

    let query = supabase
      .from('notifications')
      .select('*')
      .gte('sent_at', startDate.toISOString())
      .lte('sent_at', endDate.toISOString())

    if (type) {
      query = query.eq('type', type)
    }

    const { data: notifications, error } = await query.order('sent_at', {
      ascending: false,
    })

    if (error) throw error

    // Conta por tipo
    const countByType = {
      confirmation: notifications?.filter((n) => n.type === 'confirmation').length || 0,
      reminder: notifications?.filter((n) => n.type === 'reminder').length || 0,
      cancellation: notifications?.filter((n) => n.type === 'cancellation').length || 0,
    }

    return NextResponse.json({
      notifications,
      countByType,
      total: notifications?.length || 0,
    })
  } catch (error) {
    console.error('[v0] Erro ao obter notificações:', error)
    return NextResponse.json(
      { error: 'Falha ao obter notificações' },
      { status: 500 }
    )
  }
}
