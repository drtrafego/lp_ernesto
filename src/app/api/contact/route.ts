import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/lib/db'
import { leads } from '@/lib/schema'
import { sendMetaCAPI, sendGA4Lead } from '@/lib/tracking-server'

const ContactSchema = z.object({
  name:     z.string().min(2, 'Nome muito curto').max(120),
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
  const fbc      = parseCookie('_fbc')
  const fbp      = parseCookie('_fbp')
  const gaCookie = parseCookie('_ga')

  const eventSourceUrl = req.headers.get('origin') ?? undefined

  let leadId: number | string

  try {
    const [row] = await withTimeout(
      getDb().insert(leads).values({
        organization_id: process.env.ORGANIZATION_ID,
        name:         input.name,
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
    whatsapp: input.whatsapp,
    ip,
    userAgent,
    fbc,
    fbp,
    gaCookie,
    eventSourceUrl,
  }).catch((err) => console.error('[contact] Erro CAPI background:', err))

  void sendGA4Lead({
    leadId,
    gaCookie,
    userAgent,
    ip,
    utmSource:   input.utm_source,
    utmMedium:   input.utm_medium,
    utmCampaign: input.utm_campaign,
  }).catch((err) => console.error('[contact] Erro GA4 background:', err))

  return response
}
