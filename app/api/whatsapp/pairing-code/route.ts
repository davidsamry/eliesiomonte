import { NextResponse } from 'next/server'
import { initializeWhatsAppConnection, getPairingCode, setPairingCode } from '@/lib/whatsapp/baileys-connection'

let pairingCodePromise: Promise<string | null> | null = null

export async function GET() {
  try {
    console.log('[v0] Requisitando código de pairing...')
    
    // Inicializa conexão se necessário
    const sock = await initializeWhatsAppConnection()
    
    if (!sock) {
      return NextResponse.json(
        { success: false, error: 'Falha ao inicializar WhatsApp' },
        { status: 500 }
      )
    }

    // Aguarda um pouco para garantir que a conexão está estável
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Se já há uma geração de código em progresso, aguarda
    if (pairingCodePromise) {
      console.log('[v0] Aguardando código de pairing anterior...')
      const existingCode = await pairingCodePromise
      if (existingCode) {
        return NextResponse.json({
          success: true,
          code: existingCode,
          message: 'Código de pairing já gerado. Use o código exibido.',
        })
      }
    }

    // Cria uma promise para gerar o código
    pairingCodePromise = new Promise(async (resolve) => {
      try {
        const phoneNumber = process.env.PHONE_NUMBER || '558899942458'
        console.log('[v0] Gerando código de pairing para:', phoneNumber)
        
        // Tenta gerar o código com timeout
        const timeoutPromise = new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout ao gerar código')), 15000)
        )
        
        const code = await Promise.race([
          sock!.requestPairingCode(phoneNumber),
          timeoutPromise
        ]) as string
        
        console.log('[v0] Código de pairing gerado com sucesso:', code)
        setPairingCode(code)
        resolve(code)
      } catch (error) {
        console.error('[v0] Erro ao gerar código de pairing:', error)
        resolve(null)
      } finally {
        // Limpa a promise após 60 segundos
        setTimeout(() => {
          pairingCodePromise = null
        }, 60000)
      }
    })

    const code = await pairingCodePromise

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Falha ao gerar código de pairing. Tente novamente.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      code: code,
      message: 'Código de pairing gerado. Insira este código no WhatsApp no navegador ou outro dispositivo.',
    })
  } catch (error) {
    console.error('[v0] Erro na API de pairing code:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar código: ' + String(error) },
      { status: 500 }
    )
  }
}
