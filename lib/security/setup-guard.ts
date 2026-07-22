import { NextRequest, NextResponse } from 'next/server'

/**
 * Protege rotas administrativas de inicialização (seed / setup de tabelas).
 *
 * Regras:
 * - Em desenvolvimento (NODE_ENV !== 'production'): liberado.
 * - Em produção: exige o header `x-setup-secret` (ou query `?secret=`)
 *   igual à variável de ambiente SETUP_SECRET.
 * - Se SETUP_SECRET não estiver definida em produção, a rota é bloqueada.
 *
 * Retorna `null` quando a requisição está autorizada, ou uma resposta 403
 * quando deve ser bloqueada.
 */
export function guardSetupRoute(request?: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV !== 'production') {
    return null
  }

  const expected = process.env.SETUP_SECRET
  if (!expected) {
    return NextResponse.json(
      { error: 'Rota de setup desativada em produção (defina SETUP_SECRET).' },
      { status: 403 }
    )
  }

  let provided: string | null = null
  if (request) {
    provided =
      request.headers.get('x-setup-secret') ||
      new URL(request.url).searchParams.get('secret')
  }

  if (provided !== expected) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  }

  return null
}
