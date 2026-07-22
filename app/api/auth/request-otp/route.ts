import { NextRequest, NextResponse } from 'next/server'
import { createOTPSession, enforceOtpRateLimit } from '@/lib/auth/otp'

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Número de telefone é obrigatório' },
        { status: 400 }
      )
    }

    // Rate limiting por telefone (cooldown + limite por hora)
    const rate = await enforceOtpRateLimit(phoneNumber)
    if (!rate.ok) {
      return NextResponse.json(
        { error: rate.reason || 'Muitas solicitações.' },
        {
          status: 429,
          headers: rate.retryAfterSeconds
            ? { 'Retry-After': String(rate.retryAfterSeconds) }
            : undefined,
        }
      )
    }

    // Cria uma sessão OTP
    const { otp } = await createOTPSession(phoneNumber)

    console.log(`[v0] OTP gerado para ${phoneNumber}: ${otp}`)
    // Nota: O OTP está sendo gerado mas não enviado automaticamente.
    // Para usar em produção, integre com Twilio, Baileys ou outro serviço de SMS/WhatsApp

    return NextResponse.json(
      { 
        message: 'Código OTP gerado com sucesso',
        // Em produção, remova a linha abaixo para segurança
        otp: process.env.NODE_ENV === 'development' ? otp : undefined
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[v0] Erro ao requisitar OTP:', error)
    return NextResponse.json(
      { error: 'Falha ao processar OTP' },
      { status: 500 }
    )
  }
}
