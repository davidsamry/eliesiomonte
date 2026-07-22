import { createClient } from '@/lib/supabase/server'

// Gera um código OTP de 6 dígitos
export function generateOTP(): string {
  // Em modo teste (sem Twilio), usar OTP fixo 111111
  const isTestMode = !process.env.TWILIO_ACCOUNT_SID
  if (isTestMode) {
    console.log('[v0] MODO TESTE ATIVADO: Use OTP 111111 para testar')
    return '111111'
  }
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Cria uma sessão OTP no banco de dados
export async function createOTPSession(
  phoneNumber: string
): Promise<{ otp: string; expiresAt: Date }> {
  const supabase = await createClient()
  const otp = generateOTP()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutos

  const { error } = await supabase.from('otp_sessions').insert({
    phone_number: phoneNumber,
    otp_code: otp,
    attempts: 0,
    is_verified: false,
    expires_at: expiresAt.toISOString(),
  })

  if (error) throw new Error(`Falha ao criar sessão OTP: ${error.message}`)

  return { otp, expiresAt }
}

// Verifica o OTP fornecido pelo usuário
export async function verifyOTP(
  phoneNumber: string,
  otpCode: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('otp_sessions')
    .select('*')
    .eq('phone_number', phoneNumber)
    .eq('otp_code', otpCode)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) {
    return false
  }

  const session = data[0]

  // Verifica se tentativas ultrapassaram o limite
  if (session.attempts >= 3) {
    return false
  }

  // Incrementa tentativas
  await supabase
    .from('otp_sessions')
    .update({ attempts: session.attempts + 1 })
    .eq('id', session.id)

  // Se a verificação falhar, incrementa tentativas e retorna false
  if (session.otp_code !== otpCode) {
    return false
  }

  // Marca como verificado
  await supabase
    .from('otp_sessions')
    .update({ is_verified: true })
    .eq('id', session.id)

  return true
}

// Limpa OTP expiradas
export async function cleanupExpiredOTPs(): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from('otp_sessions')
    .delete()
    .lt('expires_at', new Date().toISOString())
}
