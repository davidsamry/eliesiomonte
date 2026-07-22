import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { BARBERSHOP_ID } from '@/lib/config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = await params
    const { full_name, specialty, is_active } = await request.json()

    const updateData: any = {}
    if (full_name) updateData.full_name = full_name
    if (specialty !== undefined) updateData.specialty = specialty
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: barber, error } = await supabase
      .from('barbers')
      .update(updateData)
      .eq('id', id)
      .eq('barbershop_id', BARBERSHOP_ID)
      .select()

    if (error) throw error
    if (!barber || barber.length === 0) {
      return NextResponse.json(
        { error: 'Barbeiro não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(barber[0])
  } catch (error) {
    console.error('[v0] Erro ao atualizar barbeiro:', error)
    return NextResponse.json(
      { error: 'Falha ao atualizar barbeiro' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = await params
    const { error } = await supabase
      .from('barbers')
      .update({ is_active: false })
      .eq('id', id)
      .eq('barbershop_id', BARBERSHOP_ID)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Erro ao deletar barbeiro:', error)
    return NextResponse.json(
      { error: 'Falha ao deletar barbeiro' },
      { status: 500 }
    )
  }
}
