import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyPassword, hashPassword } from '@/lib/auth/password'
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from '@/lib/auth/session'

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

    // Valida a senha (scrypt com salt; aceita hash legado SHA-256 e faz upgrade)
    const { valid, needsUpgrade } = verifyPassword(
      password,
      adminUser.password_hash
    )

    if (!valid) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    if (!adminUser.is_active) {
      return NextResponse.json({ error: 'Admin inativo' }, { status: 401 })
    }

    // Upgrade transparente de hash legado para scrypt.
    if (needsUpgrade) {
      try {
        await supabase
          .from('staff_users')
          .update({ password_hash: hashPassword(password) })
          .eq('id', adminUser.id)
      } catch (e) {
        console.error('[auth] Falha ao atualizar hash legado:', e)
      }
    }

    // Cria a sessão assinada e devolve no cookie httpOnly.
    const token = createSessionToken({
      adminId: adminUser.id,
      email: adminUser.email,
    })

    if (!token) {
      console.error('[auth] SESSION_SECRET ausente — não foi possível criar sessão.')
      return NextResponse.json(
        { error: 'Configuração de sessão ausente no servidor.' },
        { status: 500 }
      )
    }

    const response = NextResponse.json(
      {
        message: 'Login bem-sucedido',
        adminId: adminUser.id,
        email: adminUser.email,
        fullName: adminUser.full_name,
      },
      { status: 200 }
    )
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions)
    return response
  } catch (error) {
    console.error('[v0] Erro ao fazer login admin:', error)
    return NextResponse.json({ error: 'Falha ao fazer login' }, { status: 500 })
  }
}
