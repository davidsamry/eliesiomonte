import { createClient } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'

const AUTH_DIR = '/tmp/baileys_auth'
const CREDS_FILE = path.join(AUTH_DIR, 'creds.json')

/**
 * Carrega credenciais do Supabase ou arquivo local
 */
export async function loadPersistedAuth() {
  try {
    const supabase = await createClient()

    // Tenta carregar do Supabase
    const { data, error } = await supabase
      .from('whatsapp_credentials')
      .select('credentials')
      .single()

    if (data && data.credentials) {
      console.log('[v0] Credenciais do WhatsApp carregadas do Supabase')
      
      // Salva em arquivo temporário também para o Baileys usar
      if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true })
      }
      fs.writeFileSync(CREDS_FILE, JSON.stringify(data.credentials, null, 2))
      
      return data.credentials
    }
  } catch (err) {
    console.log('[v0] Não conseguiu carregar credenciais do Supabase, tentando arquivo local')
  }

  // Fallback: Tenta carregar do arquivo local
  try {
    if (fs.existsSync(CREDS_FILE)) {
      const creds = fs.readFileSync(CREDS_FILE, 'utf-8')
      console.log('[v0] Credenciais carregadas do arquivo local')
      return JSON.parse(creds)
    }
  } catch (err) {
    console.log('[v0] Nenhum arquivo local de credenciais encontrado')
  }

  return null
}

/**
 * Salva credenciais no Supabase e arquivo local
 */
export async function savePersistedAuth(credentials: any) {
  try {
    // Salva em arquivo local
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true })
    }
    fs.writeFileSync(CREDS_FILE, JSON.stringify(credentials, null, 2))
    console.log('[v0] Credenciais salvas em arquivo local')

    // Salva no Supabase
    const supabase = await createClient()

    const { error: existingError } = await supabase
      .from('whatsapp_credentials')
      .select('id')
      .single()

    if (existingError?.code === 'PGRST116') {
      // Tabela vazia, faz insert
      await supabase
        .from('whatsapp_credentials')
        .insert({ credentials, updated_at: new Date().toISOString() })
    } else {
      // Atualiza registro existente
      await supabase
        .from('whatsapp_credentials')
        .update({ credentials, updated_at: new Date().toISOString() })
        .eq('id', 1)
    }

    console.log('[v0] Credenciais salvas no Supabase')
  } catch (error) {
    console.error('[v0] Erro ao salvar credenciais:', error)
  }
}

/**
 * Limpa credenciais armazenadas
 */
export async function clearPersistedAuth() {
  try {
    // Remove arquivo local
    if (fs.existsSync(CREDS_FILE)) {
      fs.unlinkSync(CREDS_FILE)
    }

    // Remove do Supabase
    const supabase = await createClient()
    await supabase
      .from('whatsapp_credentials')
      .delete()
      .gte('id', 0)

    console.log('[v0] Credenciais removidas')
  } catch (error) {
    console.error('[v0] Erro ao limpar credenciais:', error)
  }
}
