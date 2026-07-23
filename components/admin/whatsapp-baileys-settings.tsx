'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, QrCode, Info, Smartphone } from 'lucide-react'

export default function WhatsAppBaileysSettings() {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [pollCount, setPollCount] = useState(0)
  const MAX_POLL_ATTEMPTS = 10 // Máximo de 10 tentativas de polling (5 minutos)

  // Busca QR code
  const fetchQRCode = async (isInitial = false) => {
    try {
      setLoading(true)
      if (isInitial) {
        setMessage('Gerando QR code...')
      }

      const response = await fetch('/api/whatsapp/qrcode-baileys')
      const data = await response.json()

      if (data.connected) {
        setStatus('connected')
        setQrCode(null)
        setMessage('✅ WhatsApp conectado com sucesso!')
        setPollCount(0)
      } else if (data.qrCode) {
        setStatus('connecting')
        setQrCode(data.qrCode)
        setMessage('Escaneie este QR code com seu WhatsApp pessoal')
        // Apenas inicia polling na primeira geração do QR code
        if (isInitial || pollCount === 0) {
          setPollCount(1)
        }
      } else {
        setMessage('Gerando QR code... Tente novamente em alguns segundos')
      }
    } catch (error) {
      console.error('[v0] Erro ao buscar QR code:', error)
      setMessage('Erro ao gerar QR code')
    } finally {
      setLoading(false)
    }
  }

  // Polling para verificar se conectou (5 segundos, máx 10 tentativas)
  useEffect(() => {
    let timeout: NodeJS.Timeout

    if (status === 'connecting' && pollCount > 0 && pollCount < MAX_POLL_ATTEMPTS) {
      timeout = setTimeout(() => {
        setPollCount(prev => prev + 1)
        // Apenas verifica status, não regenera QR code
        fetchStatusOnly()
      }, 5000)
    } else if (pollCount >= MAX_POLL_ATTEMPTS && status === 'connecting') {
      setMessage('Tempo limite excedido. Clique em "Gerar QR Code" para tentar novamente.')
      setPollCount(0)
    }

    return () => clearTimeout(timeout)
  }, [pollCount, status])

  // Apenas verifica o status sem regenerar QR code
  const fetchStatusOnly = async () => {
    try {
      const response = await fetch('/api/whatsapp/qrcode-baileys')
      const data = await response.json()

      if (data.connected) {
        setStatus('connected')
        setQrCode(null)
        setMessage('✅ WhatsApp conectado com sucesso!')
        setPollCount(0)
      }
    } catch (error) {
      console.error('[v0] Erro ao verificar status:', error)
    }
  }

  // Verifica conexão ao montar
  useEffect(() => {
    fetchQRCode(true)
  }, [])

  const handleDisconnect = async () => {
    try {
      setLoading(true)
      // Aqui você poderia chamar um endpoint para desconectar
      setStatus('disconnected')
      setQrCode(null)
      setMessage('Desconectado. Escaneie um novo QR code para conectar.')
    } finally {
      setLoading(false)
    }
  }

  const statusBadge = {
    connected: {
      label: 'Conectado',
      className: 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400',
      dot: 'bg-green-500',
    },
    connecting: {
      label: 'Conectando',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400',
      dot: 'bg-blue-500 animate-pulse',
    },
    disconnected: {
      label: 'Desconectado',
      className: 'bg-muted text-muted-foreground',
      dot: 'bg-amber-500',
    },
  }[status]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <QrCode className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold leading-tight text-foreground">
              WhatsApp — Baileys
            </h3>
            <p className="text-xs text-muted-foreground">
              Conecte seu número como bot, grátis e sem limites
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusBadge.className}`}
        >
          <span className={`h-2 w-2 rounded-full ${statusBadge.dot}`} />
          {statusBadge.label}
        </span>
      </div>

      {/* Painel principal por estado */}
      {status === 'connected' ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center dark:border-green-900 dark:bg-green-950/30">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <p className="mt-4 text-base font-semibold text-green-700 dark:text-green-400">
            WhatsApp conectado
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Tudo pronto — as confirmações de agendamento serão enviadas automaticamente.
          </p>
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Desconectar
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-background p-6">
          {qrCode && status === 'connecting' ? (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                <img
                  src={qrCode}
                  alt="QR Code para conectar o WhatsApp"
                  className="h-64 w-64"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Smartphone className="h-4 w-4 text-primary" />
                <span>
                  WhatsApp → <strong className="text-foreground">Aparelhos conectados</strong> → Conectar um aparelho
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <QrCode className="h-7 w-7" />
              </div>
              <p className="max-w-xs text-sm text-muted-foreground">
                Gere um QR code e escaneie com o WhatsApp do celular para conectar.
              </p>
            </div>
          )}

          {message && (
            <p className="mt-4 text-center text-xs text-muted-foreground">{message}</p>
          )}

          <button
            onClick={() => fetchQRCode(true)}
            disabled={loading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Gerando...' : qrCode ? 'Gerar novo QR Code' : 'Gerar QR Code'}
          </button>
        </div>
      )}

      {/* Informação */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <strong>Baileys:</strong> usa seu próprio número como bot — grátis e sem limites.
          A sessão fica salva e se mantém conectada mesmo após reinícios.
        </span>
      </div>
    </div>
  )
}
