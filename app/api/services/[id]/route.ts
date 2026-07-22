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
    const { name, description, duration, price, is_active } = await request.json()

    const updateData: any = {}
    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (duration) updateData.duration = parseInt(duration)
    if (price) updateData.price = parseFloat(price)
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: service, error } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', id)
      .eq('barbershop_id', BARBERSHOP_ID)
      .select()

    if (error) throw error
    if (!service || service.length === 0) {
      return NextResponse.json(
        { error: 'Serviço não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(service[0])
  } catch (error) {
    console.error('[v0] Erro ao atualizar serviço:', error)
    return NextResponse.json(
      { error: 'Falha ao atualizar serviço' },
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
      .from('services')
      .update({ is_active: false })
      .eq('id', id)
      .eq('barbershop_id', BARBERSHOP_ID)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Erro ao deletar serviço:', error)
    return NextResponse.json(
      { error: 'Falha ao deletar serviço' },
      { status: 500 }
    )
  }
}
