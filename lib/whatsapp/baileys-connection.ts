import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys'
import QRCode from 'qrcode'
import pino from 'pino'
import * as fs from 'fs'
import * as path from 'path'

const AUTH_DIR = '/tmp/baileys_auth'

// Singleton global - persiste entre chamadas na mesma instância do servidor
let sock: ReturnType<typeof makeWASocket> | null = null
let qrCodeRaw: string | null = null          // string bruta do Baileys
let qrCodeDataURL: string | null = null      // data:image/png base64 para o front
let connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected'
let isInitializing = false
let currentPairingCode: string | null = null

// Garante que o diretório de auth existe
function ensureAuthDir() {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true })
  }
}

/**
 * Inicializa a conexão WhatsApp com Baileys
 * Deve ser chamado apenas UMA vez - depois disso o singleton cuida do resto
 */
export async function initializeWhatsAppConnection() {
  // Já conectado
  if (connectionStatus === 'connected' && sock) {
    return sock
  }

  // Já inicializando - retorna socket atual
  if (isInitializing && sock) {
    return sock
  }

  isInitializing = true
  connectionStatus = 'connecting'
  qrCodeRaw = null
  qrCodeDataURL = null

  console.log('[baileys] Iniciando conexão...')

  try {
    ensureAuthDir()

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
    const { version } = await fetchLatestBaileysVersion()

    // Logger silencioso para não poluir os logs
    const logger = pino({ level: 'silent' })

    sock = makeWASocket({
      version,
      logger,
      auth: state,
      printQRInTerminal: false,
      browser: ['Chrome (Linux)', '', ''],
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
    })

    // Salva credenciais quando atualizam
    sock.ev.on('creds.update', saveCreds)

    // Handler principal de conexão
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      console.log('[baileys] connection.update ->', { connection, hasQR: !!qr })

      if (qr) {
        qrCodeRaw = qr
        console.log('[baileys] QR code recebido, gerando DataURL...')
        try {
          qrCodeDataURL = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'H',
            width: 300,
            margin: 2,
          })
          connectionStatus = 'connecting'
          console.log('[baileys] QR code DataURL gerado -', qrCodeDataURL?.length, 'chars')
        } catch (err) {
          console.error('[baileys] Erro ao converter QR para DataURL:', err)
        }
      }

      if (connection === 'open') {
        console.log('[baileys] Conectado!')
        connectionStatus = 'connected'
        qrCodeRaw = null
        qrCodeDataURL = null
        isInitializing = false
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
        const loggedOut = statusCode === DisconnectReason.loggedOut
        console.log('[baileys] Conexão fechada. statusCode:', statusCode, '| loggedOut:', loggedOut)

        isInitializing = false

        if (loggedOut) {
          // Apaga credenciais e desconecta
          connectionStatus = 'disconnected'
          sock = null
          try { fs.rmSync(AUTH_DIR, { recursive: true }) } catch (_) {}
          console.log('[baileys] Deslogado - credenciais removidas')
        } else if (connectionStatus !== 'connected') {
          // Reconecta após pausa
          connectionStatus = 'disconnected'
          sock = null
          console.log('[baileys] Reconectando em 3s...')
          setTimeout(() => initializeWhatsAppConnection(), 3000)
        }
      }
    })

    return sock
  } catch (error) {
    console.error('[baileys] Erro fatal na inicialização:', error)
    connectionStatus = 'disconnected'
    isInitializing = false
    sock = null
    throw error
  }
}

/**
 * Retorna o QR code como DataURL (data:image/png;base64,...)
 */
export function getQRCode(): string | null {
  return qrCodeDataURL
}

/**
 * Retorna o status atual da conexão
 */
export function getConnectionStatus(): string {
  return connectionStatus
}

/**
 * Verifica se está conectado
 */
export function isConnected(): boolean {
  return connectionStatus === 'connected' && sock !== null
}

/**
 * Retorna a instância da socket
 */
export function getWhatsAppSocket() {
  return sock
}

/**
 * Armazena código de pairing
 */
export function setPairingCode(code: string) {
  currentPairingCode = code
}

/**
 * Retorna código de pairing atual
 */
export function getPairingCode(): string | null {
  return currentPairingCode
}

/**
 * Envia mensagem de texto via WhatsApp
 */
export async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
  if (!sock || connectionStatus !== 'connected') {
    console.warn('[baileys] Tentativa de envio sem conexão')
    return false
  }

  try {
    let number = phoneNumber.replace(/\D/g, '')
    // Brasil: garante o DDI 55 quando ausente (10 ou 11 dígitos = DDD + número).
    if (!number.startsWith('55') && (number.length === 10 || number.length === 11)) {
      number = '55' + number
    }
    const jid = `${number}@s.whatsapp.net`
    await sock.sendMessage(jid, { text: message })
    console.log('[baileys] Mensagem enviada para', number)
    return true
  } catch (error) {
    console.error('[baileys] Erro ao enviar mensagem:', error)
    return false
  }
}

const NOTIFICATION_TEMPLATES: Record<string, (data: Record<string, string>) => string> = {
  confirmed: (d) =>
    `Olá ${d.customer}! Seu agendamento com ${d.barber} para ${d.service} foi confirmado para ${d.dateTime}. Não se esqueça! 💈`,
  reminder_24h: (d) =>
    `Oi ${d.customer}! Lembrete: seu agendamento com ${d.barber} para ${d.service} é amanhã às ${d.dateTime}. Aguardamos você!`,
  reminder_30min: (d) =>
    `Oi ${d.customer}! Faltam apenas 30 minutos para seu agendamento com ${d.barber}. Estamos esperando! 💈`,
}

/**
 * Envia uma notificação de agendamento formatada via WhatsApp
 */
export async function sendAppointmentNotification(
  phoneNumber: string,
  type: string,
  data: Record<string, string>
): Promise<boolean> {
  // Se a mensagem já foi processada, usa ela diretamente
  if (data.message) {
    console.log('[baileys] Enviando mensagem pré-processada')
    return sendWhatsAppMessage(phoneNumber, data.message)
  }

  // Caso contrário, formata com o template
  const template = NOTIFICATION_TEMPLATES[type]
  if (!template) {
    console.warn('[baileys] Tipo de notificação desconhecido:', type)
    return false
  }
  const message = template(data)
  return sendWhatsAppMessage(phoneNumber, message)
}

/**
 * Desconecta do WhatsApp e limpa o estado
 */
export async function disconnectWhatsApp() {
  try {
    if (sock) {
      await sock.end(undefined)
    }
  } catch (_) {}
  sock = null
  connectionStatus = 'disconnected'
  qrCodeRaw = null
  qrCodeDataURL = null
  isInitializing = false
  console.log('[baileys] Desconectado')
}
