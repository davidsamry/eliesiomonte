import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data: availability, error } = await supabase
      .from('barber_availability')
      .select('*')
      .eq('barber_id', id)
      .order('day_of_week', { ascending: true })

    if (error) throw error

    return NextResponse.json(availability || [])
  } catch (err) {
    console.error('[v0] Error fetching availability:', err)
    return NextResponse.json(
      { error: 'Erro ao buscar disponibilidades' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = await params
    const supabase = await createClient()
    const { day_of_week, start_time, end_time, break_start, break_end, is_available } = await req.json()

    if (!day_of_week && day_of_week !== 0) {
      return NextResponse.json(
        { error: 'Dia da semana é obrigatório' },
        { status: 400 }
      )
    }

    // Se o dia está disponível, start_time e end_time são obrigatórios
    if (is_available && (!start_time || !end_time)) {
      return NextResponse.json(
        { error: 'Horário de início e fim são obrigatórios' },
        { status: 400 }
      )
    }

    console.log('[v0] PUT request:', { id, day_of_week, is_available, start_time, end_time })

    // Buscar primeiro registro desse dia para atualizar
    const { data: existing } = await supabase
      .from('barber_availability')
      .select('id')
      .eq('barber_id', id)
      .eq('day_of_week', day_of_week)
      .limit(1)

    if (is_available === false) {
      // Marcar como indisponível - atualizar primeiro registro ou criar novo
      if (existing && existing.length > 0) {
        // Deletar todos os registros antigos
        const { error: deleteError } = await supabase
          .from('barber_availability')
          .delete()
          .eq('barber_id', id)
          .eq('day_of_week', day_of_week)

        if (deleteError) throw deleteError
      }

      // Criar registro marcado como indisponível
      const { data, error } = await supabase
        .from('barber_availability')
        .insert({
          barber_id: id,
          day_of_week,
          is_available: false,
          start_time: '00:00:00',
          end_time: '00:00:00',
          break_start: null,
          break_end: null,
        })
        .select()

      if (error) throw error
      return NextResponse.json(data[0])
    }

    // Marcar como disponível
    if (existing && existing.length > 0) {
      // Deletar todos os registros antigos
      const { error: deleteError } = await supabase
        .from('barber_availability')
        .delete()
        .eq('barber_id', id)
        .eq('day_of_week', day_of_week)

      if (deleteError) throw deleteError
    }

    // Criar novo registro com horário
    const { data, error } = await supabase
      .from('barber_availability')
      .insert({
        barber_id: id,
        day_of_week,
        is_available: true,
        start_time: start_time || '09:00:00',
        end_time: end_time || '18:00:00',
        break_start: break_start || null,
        break_end: break_end || null,
      })
      .select()

    if (error) throw error
    return NextResponse.json(data[0])
  } catch (err) {
    console.error('[v0] Error updating availability:', err)
    return NextResponse.json(
      { error: 'Erro ao salvar disponibilidade' },
      { status: 500 }
    )
  }
}
