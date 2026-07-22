import { NextRequest, NextResponse } from 'next/server'
import { verifyOTP } from '@/lib/auth/otp'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, otpCode } = await request.json()

    if (!phoneNumber || !otpCode) {
      return NextResponse.json(
        { error: 'Telefone e código OTP são obrigatórios' },
        { status: 400 }
      )
    }

    // Verifica o OTP
    const isValid = await verifyOTP(phoneNumber, otpCode)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Código OTP inválido ou expirado' },
        { status: 401 }
      )
    }

    // Verifica ou cria o cliente
    const supabase = await createClient()
    let { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phoneNumber)
      .limit(1)

    if (fetchError) throw fetchError

    let customerId: string

    if (!customer || customer.length === 0) {
      // Cria novo cliente
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({
          phone: phoneNumber,
          full_name: '', // Será preenchido depois
          barbershop_id: '550e8400-e29b-41d4-a716-446655440000', // UUID default para ELIESIO MONTE
        })
        .select('id')

      if (createError) throw createError
      customerId = newCustomer?.[0]?.id || ''
    } else {
      customerId = customer[0].id
    }

    return NextResponse.json(
      {
        message: 'Autenticado com sucesso',
        customerId,
        phoneNumber,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[v0] Erro ao verificar OTP:', error)
    return NextResponse.json(
      { error: 'Falha ao verificar código OTP' },
      { status: 500 }
    )
  }
}
