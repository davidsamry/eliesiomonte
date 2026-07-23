import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import {
  isConnected,
  getConnectionStatus,
  sendWhatsAppMessage,
} from '@/lib/whatsapp/baileys-connection'

/**
 * Envia uma mensagem de teste via WhatsApp para diagnosticar o envio,
 * isolado do fluxo de agendamento. Protegido por sessão de admin.
 */
export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { phoneNumber } = await request.json()
    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Informe um número.' },
        { status: 400 }
      )
    }

    const status = getConnectionStatus()
    if (!isConnected()) {
      return NextResponse.json({
        success: false,
        connected: false,
        status,
        error:
          'O WhatsApp não está conectado no servidor (status: ' + status + ').',
      })
    }

    const ok = await sendWhatsAppMessage(
      phoneNumber,
      '✅ Teste da ELIESIO MONTE — se você recebeu esta mensagem, as notificações estão funcionando!'
    )

    return NextResponse.json({
      success: ok,
      connected: true,
      status,
      error: ok
        ? null
        : 'Não foi possível enviar. Verifique se o número tem WhatsApp e o formato (DDI+DDD+número).',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[v0] Erro no teste de envio WhatsApp:', msg)
    return NextResponse.json(
      { success: false, connected: true, error: msg },
      { status: 200 }
    )
  }
}
