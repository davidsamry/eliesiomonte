import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .eq('barbershop_id', '550e8400-e29b-41d4-a716-446655440000')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(customers)
  } catch (error) {
    console.error('[v0] Erro ao buscar clientes:', error)
    return NextResponse.json(
      { error: 'Falha ao buscar clientes' },
      { status: 500 }
    )
  }
}
