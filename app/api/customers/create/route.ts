import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BARBERSHOP_ID } from '@/lib/config'

export async function POST(request: NextRequest) {
  try {
    const { customerId, name, phoneNumber } = await request.json()

    if (!customerId || !name || !phoneNumber) {
      return NextResponse.json(
        { error: 'Dados do cliente incompletos' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Tenta inserir o cliente se não existir
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .limit(1)

    if (!existingCustomer || existingCustomer.length === 0) {
      // Cliente não existe, cria um novo
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          id: customerId,
          full_name: name,
          phone: phoneNumber,
          barbershop_id: BARBERSHOP_ID,
        })
        .select()

      if (error) throw error

      return NextResponse.json(
        {
          message: 'Cliente criado com sucesso',
          customer: customer?.[0],
        },
        { status: 201 }
      )
    }

    // Cliente já existe
    return NextResponse.json(
      {
        message: 'Cliente já registrado',
        customer: { id: customerId },
      },
      { status: 200 }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('[v0] Erro ao criar cliente:', errorMessage)
    return NextResponse.json(
      {
        error: 'Falha ao criar cliente',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    )
  }
}
