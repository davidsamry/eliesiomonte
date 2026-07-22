import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendAppointmentNotification, isConnected } from '@/lib/whatsapp/baileys-connection'

interface NotificationPayload {
  type: 'confirmation' | 'reminder_24h' | 'reminder_30min'
  appointmentId: string
  phoneNumber: string
  customerName: string
  serviceName: string
  scheduledDateTime: string
  barberName: string
}

/**
 * Formata dados para envio via Baileys
 */
function formatNotificationData(payload: NotificationPayload) {
  const appointmentDate = new Date(payload.scheduledDateTime)
  const formattedTime = appointmentDate.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return {
    service: payload.serviceName,
    barber: payload.barberName,
    dateTime: formattedTime,
  }
}

/**
 * Envia notificação WhatsApp via Baileys (Grátis e Automatizado)
 */
async function sendViaWhatsApp(
  phoneNumber: string,
  type: string,
  appointmentData: any,
  message?: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!isConnected()) {
      console.warn('[v0] Baileys não está conectado ao WhatsApp')
      console.log('[v0] Para conectar: acesse /admin/settings → WhatsApp e escaneie o QR code')
      return { success: false, message: 'Baileys desconectado' }
    }

    // Se passou mensagem processada, usa ela diretamente
    if (message) {
      console.log('[v0] Enviando mensagem personalizada via Baileys:', phoneNumber)
      const success = await sendAppointmentNotification(phoneNumber, type, { message })
      return { success, message: message }
    }

    // Caso contrário, formata com os dados
    const baileyType = type === 'confirmation' ? 'confirmed' : type.includes('24h') ? 'reminder_24h' : 'reminder_30min'
    const success = await sendAppointmentNotification(phoneNumber, baileyType, appointmentData)
    return { success, message: '' }
  } catch (error: any) {
    console.error('[v0] Erro ao enviar WhatsApp Baileys:', error.message || error)
    return { success: false, message: String(error) }
  }
}

/**
 * Registra notificação no banco de dados
 */
async function logNotification(
  appointmentId: string,
  type: string,
  phoneNumber: string,
  message: string,
  success: boolean
): Promise<void> {
  try {
    const supabase = await createClient()

    await supabase.from('notifications').insert({
      appointment_id: appointmentId,
      type,
      phone_number: phoneNumber,
      message_content: message,
      status: success ? 'sent' : 'failed',
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[v0] Erro ao registrar notificação:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as NotificationPayload

    // Valida dados obrigatórios
    if (!payload.appointmentId || !payload.phoneNumber || !payload.type) {
      return NextResponse.json(
        { error: 'appointmentId, phoneNumber e type são obrigatórios' },
        { status: 400 }
      )
    }

    console.log('[v0] Processando notificação:', payload.type, 'para', payload.phoneNumber)

    // Busca o template processado
    const templateUrl = new URL('/api/notification-templates/get', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    templateUrl.searchParams.set('type', payload.type)
    templateUrl.searchParams.set('customer_name', payload.customerName)
    templateUrl.searchParams.set('barber_name', payload.barberName)
    templateUrl.searchParams.set('service_name', payload.serviceName)
    
    // Formata data para o template
    const appointmentDate = new Date(payload.scheduledDateTime)
    const formattedDate = appointmentDate.toLocaleDateString('pt-BR')
    const formattedTime = appointmentDate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
    
    templateUrl.searchParams.set('appointment_date', formattedDate)
    templateUrl.searchParams.set('appointment_time', formattedTime)

    console.log('[v0] Buscando template:', templateUrl.toString())

    const templateResponse = await fetch(templateUrl.toString())
    const { message: processedMessage } = await templateResponse.json()

    console.log('[v0] Template processado:', processedMessage?.substring(0, 50))

    // Envia via WhatsApp (Baileys)
    const { success, message: sendMessage } = await sendViaWhatsApp(
      payload.phoneNumber,
      payload.type,
      {},
      processedMessage
    )

    // Registra no banco
    const supabase = await createClient()
    await supabase.from('notifications').insert({
      appointment_id: payload.appointmentId,
      type: payload.type,
      phone_number: payload.phoneNumber,
      message_content: processedMessage || `${payload.type} - ${payload.serviceName}`,
      status: success ? 'sent' : 'failed',
      created_at: new Date().toISOString(),
    })

    if (!success) {
      console.warn('[v0] Falha ao enviar notificação:', sendMessage)
      return NextResponse.json(
        {
          error: 'Baileys não está conectado. Escaneie o QR code em /admin/settings → WhatsApp',
          connected: false,
        },
        { status: 503 }
      )
    }

    console.log(`[v0] ✅ Notificação ${payload.type} enviada para ${payload.phoneNumber}`)

    return NextResponse.json({
      success: true,
      message: 'Notificação enviada com sucesso via WhatsApp',
      type: payload.type,
      phoneNumber: payload.phoneNumber,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[v0] Erro na API de notificações WhatsApp:', errorMsg)
    return NextResponse.json(
      { error: 'Falha ao processar notificação: ' + errorMsg },
      { status: 500 }
    )
  }
}
