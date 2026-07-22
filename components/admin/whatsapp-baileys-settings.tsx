'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, AlertCircle, QrCode } from 'lucide-react'

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

  return (
    <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
      <div className="flex items-center gap-2">
        <QrCode className="w-5 h-5" />
        <h3 className="font-semibold">WhatsApp - Baileys (Gratuito)</h3>
      </div>



      {/* Status */}
      <div className="p-3 rounded-lg bg-background">
        <div className="flex items-center gap-2">
          {status === 'connected' && (
            <>
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-600">Conectado ✅</span>
            </>
          )}
          {status === 'connecting' && (
            <>
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="text-sm font-medium text-blue-600">Conectando...</span>
            </>
          )}
          {status === 'disconnected' && (
            <>
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-600">Desconectado</span>
            </>
          )}
        </div>
      </div>

      {/* QR Code */}
      {qrCode && status === 'connecting' && (
        <div className="flex flex-col items-center gap-3 p-4 bg-background rounded-lg">
          <img src={qrCode} alt="QR Code" className="w-48 h-48 border-2 border-border rounded" />
          <p className="text-xs text-center text-foreground/70">
            Escaneie com seu WhatsApp pessoal
          </p>
        </div>
      )}

      {/* Mensagem */}
      {message && (
        <p className="text-sm text-foreground/70">{message}</p>
      )}

      {/* Botões */}
      <div className="flex gap-2">
        {status !== 'connected' ? (
          <button
            onClick={() => fetchQRCode(true)}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Gerando...' : 'Gerar QR Code'}
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 disabled:opacity-50 transition"
          >
            Desconectar
          </button>
        )}
      </div>

      {/* Informações */}
      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-900 dark:text-blue-100">
          <strong>ℹ️ Baileys:</strong> Usa seu próprio WhatsApp como bot. Totalmente gratuito, sem limites.
        </p>
      </div>
    </div>
  )
}
