import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import {
  getWhatsAppSocket,
  isConnected,
  getConnectionStatus,
} from '@/lib/whatsapp/baileys-connection'

/**
 * Envia uma mensagem de teste via WhatsApp e retorna detalhes do envio para
 * diagnóstico (JID resolvido, se o número existe no WhatsApp, id da mensagem).
 * Protegido por sessão de admin.
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
    const sock = getWhatsAppSocket()
    if (!sock || !isConnected()) {
      return NextResponse.json({
        success: false,
        connected: false,
        status,
        error: `WhatsApp não conectado (status: ${status}).`,
      })
    }

    let number = phoneNumber.replace(/\D/g, '')
    if (!number.startsWith('55') && (number.length === 10 || number.length === 11)) {
      number = '55' + number
    }

    // Verifica o número no WhatsApp
    let exists: boolean | null = null
    let jid = `${number}@s.whatsapp.net`
    try {
      const results = await sock.onWhatsApp(number)
      const info = results?.[0]
      exists = info ? Boolean(info.exists) : false
      if (info?.jid) jid = info.jid
    } catch (e) {
      exists = null // não foi possível verificar
    }

    if (exists === false) {
      return NextResponse.json({
        success: false,
        connected: true,
        status,
        number,
        exists,
        error: `O número ${number} não possui conta de WhatsApp.`,
      })
    }

    const result = await sock.sendMessage(jid, {
      text: '✅ Teste da ELIESIO MONTE — se você recebeu esta mensagem, as notificações estão funcionando!',
    })

    return NextResponse.json({
      success: true,
      connected: true,
      status,
      number,
      jid,
      exists,
      messageId: result?.key?.id ?? null,
      detail: `enviado • jid=${jid} • exists=${exists} • id=${result?.key?.id ?? '—'}`,
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
