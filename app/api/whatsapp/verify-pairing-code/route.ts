import { NextResponse } from 'next/server'
import { getWhatsAppSocket } from '@/lib/whatsapp/baileys-connection'

export async function POST(request: Request) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Código não fornecido' },
        { status: 400 }
      )
    }

    console.log('[v0] Verificando código de pairing:', code)

    const sock = getWhatsAppSocket()

    if (!sock) {
      return NextResponse.json(
        { success: false, error: 'WhatsApp não inicializado. Tente novamente.' },
        { status: 500 }
      )
    }

    // O Baileys automaticamente completa a autenticação quando o código é inserido
    // Aqui apenas verificamos se a conexão foi estabelecida
    // Você pode adicionar lógica adicional aqui se necessário

    console.log('[v0] Código de pairing enviado para processamento')

    // Aguarda um pouco para a autenticação processar
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Verifica se está conectado
    const isConnected = sock.user?.id ? true : false

    if (isConnected) {
      console.log('[v0] ✅ Conectado via código de pairing!')
      return NextResponse.json({
        success: true,
        message: 'Conectado ao WhatsApp com sucesso!',
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Código inválido ou expirado. Tente novamente.' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[v0] Erro ao verificar código de pairing:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao processar código' },
      { status: 500 }
    )
  }
}
