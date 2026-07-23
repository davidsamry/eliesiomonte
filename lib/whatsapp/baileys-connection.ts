import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys'
import QRCode from 'qrcode'
import pino from 'pino'
import * as fs from 'fs'
import * as path from 'path'

// Caminho da sessão do WhatsApp. Em produção, aponte para um volume persistente
// (WHATSAPP_AUTH_DIR=/data/whatsapp_auth) para não perder a conexão em redeploys.
const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || '/tmp/baileys_auth'

// Estado do Baileys guardado no globalThis para ser compartilhado entre TODAS as
// cópias deste módulo (o Next pode duplicar o módulo por rota; sem isso, a rota
// que conecta o WhatsApp e a rota que envia a notificação teriam sockets diferentes).
type BaileysState = {
  sock: ReturnType<typeof makeWASocket> | null
  qrCodeRaw: string | null
  qrCodeDataURL: string | null
  connectionStatus: 'disconnected' | 'connecting' | 'connected'
  isInitializing: boolean
  currentPairingCode: string | null
}

const globalStore = globalThis as unknown as { __baileysState?: BaileysState }
const state: BaileysState =
  globalStore.__baileysState ??
  (globalStore.__baileysState = {
    sock: null,
    qrCodeRaw: null,
    qrCodeDataURL: null,
    connectionStatus: 'disconnected',
    isInitializing: false,
    currentPairingCode: null,
  })

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
  if (state.connectionStatus === 'connected' && state.sock) {
    return state.sock
  }

  // Já inicializando - retorna socket atual
  if (state.isInitializing && state.sock) {
    return state.sock
  }

  state.isInitializing = true
  state.connectionStatus = 'connecting'
  state.qrCodeRaw = null
  state.qrCodeDataURL = null

  console.log('[baileys] Iniciando conexão...')

  try {
    ensureAuthDir()

    const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
    const { version } = await fetchLatestBaileysVersion()

    // Logger silencioso para não poluir os logs
    const logger = pino({ level: 'silent' })

    state.sock = makeWASocket({
      version,
      logger,
      auth: authState,
      printQRInTerminal: false,
      browser: ['Chrome (Linux)', '', ''],
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
    })

    // Salva credenciais quando atualizam
    state.sock.ev.on('creds.update', saveCreds)

    // Handler principal de conexão
    state.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      console.log('[baileys] connection.update ->', { connection, hasQR: !!qr })

      if (qr) {
        state.qrCodeRaw = qr
        console.log('[baileys] QR code recebido, gerando DataURL...')
        try {
          state.qrCodeDataURL = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'H',
            width: 300,
            margin: 2,
          })
          state.connectionStatus = 'connecting'
          console.log('[baileys] QR code DataURL gerado -', state.qrCodeDataURL?.length, 'chars')
        } catch (err) {
          console.error('[baileys] Erro ao converter QR para DataURL:', err)
        }
      }

      if (connection === 'open') {
        console.log('[baileys] Conectado!')
        state.connectionStatus = 'connected'
        state.qrCodeRaw = null
        state.qrCodeDataURL = null
        state.isInitializing = false
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
        const loggedOut = statusCode === DisconnectReason.loggedOut
        console.log('[baileys] Conexão fechada. statusCode:', statusCode, '| loggedOut:', loggedOut)

        state.isInitializing = false

        if (loggedOut) {
          // Apaga credenciais e desconecta
          state.connectionStatus = 'disconnected'
          state.sock = null
          try { fs.rmSync(AUTH_DIR, { recursive: true }) } catch (_) {}
          console.log('[baileys] Deslogado - credenciais removidas')
        } else if (state.connectionStatus !== 'connected') {
          // Reconecta após pausa
          state.connectionStatus = 'disconnected'
          state.sock = null
          console.log('[baileys] Reconectando em 3s...')
          setTimeout(() => initializeWhatsAppConnection(), 3000)
        }
      }
    })

    return state.sock
  } catch (error) {
    console.error('[baileys] Erro fatal na inicialização:', error)
    state.connectionStatus = 'disconnected'
    state.isInitializing = false
    state.sock = null
    throw error
  }
}

/**
 * Retorna o QR code como DataURL (data:image/png;base64,...)
 */
export function getQRCode(): string | null {
  return state.qrCodeDataURL
}

/**
 * Retorna o status atual da conexão
 */
export function getConnectionStatus(): string {
  return state.connectionStatus
}

/**
 * Verifica se está conectado
 */
export function isConnected(): boolean {
  return state.connectionStatus === 'connected' && state.sock !== null
}

/**
 * Retorna a instância da socket
 */
export function getWhatsAppSocket() {
  return state.sock
}

/**
 * Armazena código de pairing
 */
export function setPairingCode(code: string) {
  state.currentPairingCode = code
}

/**
 * Retorna código de pairing atual
 */
export function getPairingCode(): string | null {
  return state.currentPairingCode
}

/**
 * Envia mensagem de texto via WhatsApp
 */
export async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
  if (!state.sock || state.connectionStatus !== 'connected') {
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
    await state.sock.sendMessage(jid, { text: message })
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
    if (state.sock) {
      await state.sock.end(undefined)
    }
  } catch (_) {}
  state.sock = null
  state.connectionStatus = 'disconnected'
  state.qrCodeRaw = null
  state.qrCodeDataURL = null
  state.isInitializing = false
  console.log('[baileys] Desconectado')
}
