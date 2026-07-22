import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Busca o admin
    const { data: admin, error: fetchError } = await supabase
      .from('staff_users')
      .select('*')
      .eq('email', email)
      .eq('role', 'admin')
      .limit(1)

    if (fetchError) throw fetchError
    if (!admin || admin.length === 0) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    const adminUser = admin[0]

    // Valida a senha (simples comparação com hash)
    // Em produção, use bcrypt ou similar
    const passwordHash = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex')

    if (adminUser.password_hash !== passwordHash) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    if (!adminUser.is_active) {
      return NextResponse.json(
        { error: 'Admin inativo' },
        { status: 401 }
      )
    }

    // Retorna dados do admin
    return NextResponse.json(
      {
        message: 'Login bem-sucedido',
        adminId: adminUser.id,
        email: adminUser.email,
        fullName: adminUser.full_name,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[v0] Erro ao fazer login admin:', error)
    return NextResponse.json(
      { error: 'Falha ao fazer login' },
      { status: 500 }
    )
  }
}
