import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { leads } from '@/lib/schema'
import { sendMetaCAPI } from '@/lib/tracking-server'

const ContactSchema = z.object({
  name:     z.string().min(2, 'Nome muito curto').max(120),
  email:    z.string().email('E-mail inválido'),
  whatsapp: z.string().min(10, 'Telefone inválido').max(20),
  utm_source:   z.string().optional(),
  utm_medium:   z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term:     z.string().optional(),
})

type ContactInput = z.infer<typeof ContactSchema>

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms),
    ),
  ])
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let input: ContactInput
  try {
    const raw = await req.json()
    input = ContactSchema.parse(raw)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, errors: err.flatten().fieldErrors },
        { status: 422 },
      )
    }
    return NextResponse.json(
      { success: false, message: 'Payload inválido' },
      { status: 400 },
    )
  }

  const xForwardedFor = req.headers.get('x-forwarded-for')
  const ip = xForwardedFor
    ? xForwardedFor.split(',')[0].trim()
    : (req.headers.get('x-real-ip') ?? undefined)

  const userAgent = req.headers.get('user-agent') ?? undefined

  const cookieHeader = req.headers.get('cookie') ?? ''
  const parseCookie  = (name: string): string | undefined => {
    const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
    return match ? decodeURIComponent(match[1]) : undefined
  }
  const fbc = parseCookie('_fbc')
  const fbp = parseCookie('_fbp')

  const eventSourceUrl = req.headers.get('origin') ?? undefined

  let leadId: number | string

  try {
    const [row] = await withTimeout(
      db.insert(leads).values({
        name:         input.name,
        email:        input.email,
        whatsapp:     input.whatsapp,
        utm_source:   input.utm_source,
        utm_medium:   input.utm_medium,
        utm_campaign: input.utm_campaign,
        utm_term:     input.utm_term,
      }).returning({ id: leads.id }),
      5_000,
    )
    leadId = row.id
    console.log('[contact] Lead salvo no banco:', leadId)
  } catch (dbErr) {
    leadId = `backup_timeout_${Date.now()}`
    console.error('[contact] Banco indisponível — fallback:', leadId, dbErr)
  }

  const response = NextResponse.json({ success: true, leadId }, { status: 200 })

  void sendMetaCAPI({
    leadId,
    name:     input.name,
    email:    input.email,
    whatsapp: input.whatsapp,
    ip,
    userAgent,
    fbc,
    fbp,
    eventSourceUrl,
  }).catch((err) =>
    console.error('[contact] Erro CAPI background:', err),
  )

  return response
}
