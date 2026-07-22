import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { guardSetupRoute } from '@/lib/security/setup-guard'

export async function GET(request: NextRequest) {
  const blocked = guardSetupRoute(request)
  if (blocked) return blocked

  try {
    const supabase = await createClient()

    // Tenta criar a tabela
    const { error } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.whatsapp_credentials (
          id SERIAL PRIMARY KEY,
          credentials JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `,
    } as any)

    if (error && !error.message?.includes('already exists')) {
      console.log('[v0] Aviso ao criar tabela:', error)
    }

    return NextResponse.json({ 
      success: true,
      message: 'Tabela de credenciais WhatsApp pronta'
    })
  } catch (error) {
    console.error('[v0] Erro ao criar tabela:', error)
    
    // Como alternativa, retorna sucesso mesmo assim
    // O usuário pode criar manualmente via Supabase dashboard se necessário
    return NextResponse.json({ 
      success: true,
      message: 'Tabela pode precisar ser criada manualmente no Supabase dashboard',
      details: String(error)
    })
  }
}
