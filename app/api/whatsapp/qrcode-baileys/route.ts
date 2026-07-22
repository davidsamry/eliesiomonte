import { NextResponse, NextRequest } from 'next/server'
import {
  initializeWhatsAppConnection,
  getQRCode,
  getConnectionStatus,
  isConnected,
} from '@/lib/whatsapp/baileys-connection'

export async function GET(request: NextRequest) {
  try {
    // Já conectado
    if (isConnected()) {
      return NextResponse.json({
        connected: true,
        status: 'connected',
        qrCode: null,
      })
    }

    // Inicia se ainda não iniciou
    const currentStatus = getConnectionStatus()
    if (currentStatus === 'disconnected') {
      await initializeWhatsAppConnection()
    }

    // Aguarda QR code por até 15 segundos (30 tentativas x 500ms)
    let qrCode = getQRCode()
    let attempts = 0

    while (!qrCode && attempts < 30) {
      await new Promise(r => setTimeout(r, 500))
      qrCode = getQRCode()
      attempts++
    }

    if (isConnected()) {
      return NextResponse.json({ connected: true, status: 'connected', qrCode: null })
    }

    if (!qrCode) {
      return NextResponse.json(
        { error: 'QR code não gerado ainda. Aguarde e tente novamente.', status: 'generating', connected: false },
        { status: 202 }
      )
    }

    return NextResponse.json({
      qrCode,
      status: 'connecting',
      connected: false,
    })
  } catch (error: any) {
    console.error('[baileys-api] Erro:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === 'check-connection') {
      return NextResponse.json({
        connected: isConnected(),
        status: getConnectionStatus(),
      })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
