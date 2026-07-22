import { NextRequest, NextResponse } from 'next/server'
import {
  SESSION_COOKIE,
  verifySessionToken,
  type SessionPayload,
} from '@/lib/auth/session'

/**
 * Guard para rotas administrativas.
 *
 * Uso no início do handler:
 *
 *   const auth = requireAdmin(request)
 *   if (auth instanceof NextResponse) return auth
 *   // auth.adminId / auth.email disponíveis
 *
 * Retorna o payload da sessão quando autorizado, ou uma resposta 401.
 */
export function requireAdmin(
  request: NextRequest
): SessionPayload | NextResponse {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = verifySessionToken(token)

  if (!session) {
    return NextResponse.json(
      { error: 'Não autorizado. Faça login como admin.' },
      { status: 401 }
    )
  }

  return session
}
