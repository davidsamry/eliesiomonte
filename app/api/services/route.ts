import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('barbershop_id', '550e8400-e29b-41d4-a716-446655440000')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(services)
  } catch (error) {
    console.error('[v0] Erro ao buscar serviços:', error)
    return NextResponse.json(
      { error: 'Falha ao buscar serviços' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, description, duration, price } = await request.json()

    if (!name || !duration || !price) {
      return NextResponse.json(
        { error: 'Nome, duração e preço são obrigatórios' },
        { status: 400 }
      )
    }

    const { data: service, error } = await supabase
      .from('services')
      .insert({
        name,
        description,
        duration: parseInt(duration),
        price: parseFloat(price),
        barbershop_id: '550e8400-e29b-41d4-a716-446655440000',
        is_active: true,
      })
      .select()

    if (error) throw error
    if (!service || service.length === 0) {
      return NextResponse.json(
        { error: 'Falha ao salvar serviço' },
        { status: 500 }
      )
    }

    return NextResponse.json(service[0], { status: 201 })
  } catch (error) {
    console.error('[v0] Erro ao criar serviço:', error)
    return NextResponse.json(
      { error: 'Falha ao criar serviço' },
      { status: 500 }
    )
  }
}
