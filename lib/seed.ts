import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

const BARBERSHOP_ID = '550e8400-e29b-41d4-a716-446655440000'

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export async function seedDatabase() {
  const supabase = await createClient()

  try {
    // Criar admin
    const adminData = {
      id: '550e8400-e29b-41d4-a716-446655440501',
      barbershop_id: BARBERSHOP_ID,
      email: 'admin@eliesio.com',
      phone: '11999999999',
      full_name: 'Administrador',
      role: 'admin',
      password_hash: hashPassword('admin123'),
      is_active: true,
    }

    const { error: adminError } = await supabase.from('staff_users').insert(adminData)
    if (adminError && !adminError.message.includes('duplicate')) {
      console.error('[v0] Erro ao inserir admin:', adminError)
    }

    // Criar barbeiros
    const barbers = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        barbershop_id: BARBERSHOP_ID,
        full_name: 'Carlos Silva',
        specialty: ['corte', 'barba', 'design'],
        average_service_time: 30,
        is_active: true,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        barbershop_id: BARBERSHOP_ID,
        full_name: 'João Santos',
        specialty: ['corte', 'fade', 'design'],
        average_service_time: 35,
        is_active: true,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        barbershop_id: BARBERSHOP_ID,
        full_name: 'Pedro Oliveira',
        specialty: ['corte', 'barba', 'tratamento capilar'],
        average_service_time: 25,
        is_active: true,
      },
    ]

    // Insere barbeiros
    for (const barber of barbers) {
      const { error } = await supabase.from('barbers').insert(barber)
      if (error && !error.message.includes('duplicate')) {
        console.error('[v0] Erro ao inserir barbeiro:', error)
      }
    }

    // Criar serviços
    const services = [
      {
        id: '550e8400-e29b-41d4-a716-446655440101',
        barbershop_id: BARBERSHOP_ID,
        name: 'Corte Simples',
        description: 'Corte clássico',
        duration: 30,
        price: 50.0,
        barbers_available: barbers.map((b) => b.id),
        is_active: true,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440102',
        barbershop_id: BARBERSHOP_ID,
        name: 'Corte + Barba',
        description: 'Corte com design de barba',
        duration: 45,
        price: 75.0,
        barbers_available: barbers.map((b) => b.id),
        is_active: true,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440103',
        barbershop_id: BARBERSHOP_ID,
        name: 'Barba Premium',
        description: 'Barba com design e hidratação',
        duration: 40,
        price: 65.0,
        barbers_available: barbers.slice(0, 2).map((b) => b.id),
        is_active: true,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440104',
        barbershop_id: BARBERSHOP_ID,
        name: 'Fade Moderno',
        description: 'Corte fade com desenho',
        duration: 35,
        price: 60.0,
        barbers_available: [barbers[1].id],
        is_active: true,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440105',
        barbershop_id: BARBERSHOP_ID,
        name: 'Tratamento Capilar',
        description: 'Máscara e hidratação',
        duration: 30,
        price: 55.0,
        barbers_available: [barbers[2].id],
        is_active: true,
      },
    ]

    // Insere serviços
    for (const service of services) {
      const { error } = await supabase.from('services').insert(service)
      if (error && !error.message.includes('duplicate')) {
        console.error('[v0] Erro ao inserir serviço:', error)
      }
    }

    // Criar disponibilidades dos barbeiros
    for (const barber of barbers) {
      // Segunda a Sexta: 09:00 - 18:00, com pausa das 12:00 - 13:00
      for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
        const availabilities = [
          {
            barber_id: barber.id,
            day_of_week: dayOfWeek,
            start_time: '09:00',
            end_time: '12:00',
            is_available: true,
            break_start: null,
            break_end: null,
          },
          {
            barber_id: barber.id,
            day_of_week: dayOfWeek,
            start_time: '13:00',
            end_time: '18:00',
            is_available: true,
            break_start: null,
            break_end: null,
          },
        ]

        for (const availability of availabilities) {
          const { error } = await supabase
            .from('barber_availability')
            .insert(availability)
          if (error && !error.message.includes('duplicate')) {
            console.error('[v0] Erro ao inserir disponibilidade:', error)
          }
        }
      }
    }

    // Criar tabela de notificações se não existir
    // Isso será feito via SQL raw porque o Supabase não permite criar tabelas via insert
    const { error: notifError } = await supabase.rpc('create_notifications_table')
    if (notifError && !notifError.message.includes('already exists')) {
      console.warn('[v0] Aviso ao criar tabela notifications:', notifError)
    }

    console.log('[v0] Database seeded successfully!')
    return true
  } catch (error) {
    console.error('[v0] Erro ao fazer seed do banco:', error)
    return false
  }
}
