import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

    // Obtém agendamentos no período
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .gte('scheduled_datetime', `${startDate}T00:00:00`)
      .lte('scheduled_datetime', `${endDate}T23:59:59`)
      .in('status', ['pending', 'confirmed'])

    if (appointmentsError) throw appointmentsError

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
