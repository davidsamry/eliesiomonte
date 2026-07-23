import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { addDays, format, parseISO } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const startDate = searchParams.get('startDate') || format(new Date(), 'yyyy-MM-dd')
    const endDate =
      searchParams.get('endDate') ||
      format(addDays(new Date(), 30), 'yyyy-MM-dd')

    // Obtém todos os barbeiros ativos
    const { data: barbers, error: barbersError } = await supabase
      .from('barbers')
      .select('*')
      .eq('is_active', true)

    if (barbersError) throw barbersError

    // Obtém todos os serviços ativos
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)

    if (servicesError) throw servicesError

    // Agendamentos do período. Lê com a service role para enxergar TODOS os
    // agendamentos (o RLS pode esconder os de outros clientes), retornando
    // apenas os campos necessários à disponibilidade — sem dados pessoais.
    let appointments: {
      barber_id: string
      scheduled_datetime: string
      status: string
    }[] = []
    try {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const apptClient = serviceKey
        ? createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
        : supabase
      const { data, error } = await apptClient
        .from('appointments')
        .select('barber_id, scheduled_datetime, status')
        .gte('scheduled_datetime', `${startDate}T00:00:00`)
        .lte('scheduled_datetime', `${endDate}T23:59:59`)
        .in('status', ['pending', 'confirmed'])
      if (error) throw error
      appointments = (data as typeof appointments) || []
    } catch (e) {
      console.error('[v0] Erro ao obter agendamentos p/ disponibilidade:', e)
      appointments = []
    }

    // Obtém bloqueios de data
    const { data: blockedDates, error: blockedError } = await supabase
      .from('blocked_dates')
      .select('*')
      .gte('start_date', startDate)
      .lte('end_date', endDate)

    if (blockedError) throw blockedError

    // Obtém disponibilidades de cada barbeiro (dias e horários)
    const { data: barberAvailability, error: availabilityError } = await supabase
      .from('barber_availability')
      .select('*')

    if (availabilityError) throw availabilityError

    return NextResponse.json({
      barbers,
      services,
      appointments,
      blockedDates,
      barberAvailability,
    })
  } catch (error) {
    console.error('[v0] Erro ao obter disponibilidades:', error)
    return NextResponse.json(
      { error: 'Falha ao obter disponibilidades' },
      { status: 500 }
    )
  }
}
