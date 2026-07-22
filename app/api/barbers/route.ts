import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { BARBERSHOP_ID } from '@/lib/config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { data: barbers, error } = await supabase
      .from('barbers')
      .select('*')
      .eq('barbershop_id', BARBERSHOP_ID)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(barbers)
  } catch (error) {
    console.error('[v0] Erro ao buscar barbeiros:', error)
    return NextResponse.json(
      { error: 'Falha ao buscar barbeiros' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { full_name, specialty } = await request.json()

    if (!full_name) {
      return NextResponse.json(
        { error: 'Nome do barbeiro é obrigatório' },
        { status: 400 }
      )
    }

    const { data: barber, error } = await supabase
      .from('barbers')
      .insert({
        full_name,
        specialty: specialty || [],
        barbershop_id: BARBERSHOP_ID,
        is_active: true,
      })
      .select()

    if (error) throw error
    if (!barber || barber.length === 0) {
      return NextResponse.json(
        { error: 'Falha ao salvar barbeiro' },
        { status: 500 }
      )
    }

    return NextResponse.json(barber[0], { status: 201 })
  } catch (error) {
    console.error('[v0] Erro ao criar barbeiro:', error)
    return NextResponse.json(
      { error: 'Falha ao criar barbeiro' },
      { status: 500 }
    )
  }
}
