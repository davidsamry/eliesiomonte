import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BARBERSHOP_ID } from '@/lib/config'

export async function POST(request: NextRequest) {
  try {
    const { name, phoneNumber } = await request.json()

    if (!name || !phoneNumber) {
      return NextResponse.json(
        { error: 'Nome e telefone são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Primeiro, tenta buscar um cliente existente com esse número de telefone
    const { data: existingCustomers, error: searchError } = await supabase
      .from('customers')
      .select('id, full_name, phone')
      .eq('phone', phoneNumber)
      .limit(1)

    if (searchError) throw searchError

    // Se encontrou um cliente existente, retorna seus dados
    if (existingCustomers && existingCustomers.length > 0) {
      const existingCustomer = existingCustomers[0]
      return NextResponse.json(
        {
          message: 'Cliente encontrado',
          customerId: existingCustomer.id,
          existingName: existingCustomer.full_name,
          isNew: false,
        },
        { status: 200 }
      )
    }

    // Cliente não existe, vamos criar um novo
    // Importamos a função de gerar UUID
    function generateUUID(): string {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
    }

    const newCustomerId = generateUUID()

    const { data: newCustomer, error: createError } = await supabase
      .from('customers')
      .insert({
        id: newCustomerId,
        full_name: name,
        phone: phoneNumber,
        barbershop_id: BARBERSHOP_ID,
      })
      .select()

    if (createError) throw createError

    return NextResponse.json(
      {
        message: 'Cliente criado com sucesso',
        customerId: newCustomerId,
        isNew: true,
      },
      { status: 201 }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('[v0] Erro ao buscar/criar cliente:', errorMessage)
    return NextResponse.json(
      {
        error: 'Falha ao processar cliente',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    )
  }
}
