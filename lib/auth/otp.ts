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

// Configuração de rate limiting do OTP
const OTP_COOLDOWN_SECONDS = 60 // intervalo mínimo entre pedidos
const OTP_MAX_PER_HOUR = 5 // máximo de pedidos por hora por telefone

export interface OtpRateLimitResult {
  ok: boolean
  retryAfterSeconds?: number
  reason?: string
}

/**
 * Limita a frequência de geração de OTP por telefone, usando a própria tabela
 * otp_sessions (persistente entre instâncias serverless).
 * - Cooldown de OTP_COOLDOWN_SECONDS entre pedidos.
 * - No máximo OTP_MAX_PER_HOUR pedidos por hora.
 */
export async function enforceOtpRateLimit(
  phoneNumber: string
): Promise<OtpRateLimitResult> {
  const supabase = await createClient()
  const now = Date.now()

  // Cooldown: existe algum pedido nos últimos OTP_COOLDOWN_SECONDS?
  const cooldownSince = new Date(now - OTP_COOLDOWN_SECONDS * 1000).toISOString()
  const { data: recent, error: recentError } = await supabase
    .from('otp_sessions')
    .select('created_at')
    .eq('phone_number', phoneNumber)
    .gte('created_at', cooldownSince)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!recentError && recent && recent.length > 0) {
    const last = new Date(recent[0].created_at as string).getTime()
    const elapsed = Math.floor((now - last) / 1000)
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, OTP_COOLDOWN_SECONDS - elapsed),
      reason: 'Aguarde antes de solicitar um novo código.',
    }
  }

  // Limite por hora
  const hourSince = new Date(now - 60 * 60 * 1000).toISOString()
  const { count, error: countError } = await supabase
    .from('otp_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('phone_number', phoneNumber)
    .gte('created_at', hourSince)

  if (!countError && typeof count === 'number' && count >= OTP_MAX_PER_HOUR) {
    return {
      ok: false,
      retryAfterSeconds: 60 * 60,
      reason: 'Muitas solicitações. Tente novamente mais tarde.',
    }
  }

  return { ok: true }
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
