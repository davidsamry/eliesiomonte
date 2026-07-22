import { NextRequest, NextResponse } from 'next/server'
import { seedDatabase } from '@/lib/seed'
import { guardSetupRoute } from '@/lib/security/setup-guard'

export async function GET(request: NextRequest) {
  const blocked = guardSetupRoute(request)
  if (blocked) return blocked

  try {
    const success = await seedDatabase()
    if (success) {
      return NextResponse.json(
        { message: 'Database seeded successfully' },
        { status: 200 }
      )
    } else {
      return NextResponse.json(
        { error: 'Failed to seed database' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[v0] Seed error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
