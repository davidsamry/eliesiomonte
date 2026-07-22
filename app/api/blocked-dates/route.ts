import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BARBERSHOP_ID = '550e8400-e29b-41d4-a716-446655440000'

export async function GET(req: NextRequest) {
  try {
    const { data: blockedDates, error } = await supabase
      .from('blocked_dates')
      .select('*')
      .eq('barbershop_id', BARBERSHOP_ID)
      .order('start_date', { ascending: false })

    if (error) throw error

    return NextResponse.json(blockedDates || [])
  } catch (err) {
    console.error('[v0] Error fetching blocked dates:', err)
    return NextResponse.json(
      { error: 'Erro ao buscar datas bloqueadas' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { barber_id, start_date, end_date, reason } = await req.json()

    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: 'Datas obrigatórias faltando' },
        { status: 400 }
      )
    }

    const { data: blockedDate, error } = await supabase
      .from('blocked_dates')
      .insert({
        barbershop_id: BARBERSHOP_ID,
        barber_id: barber_id || null,
        start_date,
        end_date,
        reason: reason || 'Não disponível',
      })
      .select()

    if (error) throw error
    if (!blockedDate || blockedDate.length === 0) {
      return NextResponse.json(
        { error: 'Falha ao bloquear data' },
        { status: 500 }
      )
    }

    return NextResponse.json(blockedDate[0], { status: 201 })
  } catch (err) {
    console.error('[v0] Error creating blocked date:', err)
    return NextResponse.json(
      { error: 'Erro ao bloquear data' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID obrigatório' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('blocked_dates')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[v0] Error deleting blocked date:', err)
    return NextResponse.json(
      { error: 'Erro ao remover bloqueio' },
      { status: 500 }
    )
  }
}
