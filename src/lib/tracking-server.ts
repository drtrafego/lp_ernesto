// NUNCA importe em Client Components

export interface CAPIPayload {
  leadId: number | string
  name: string
  whatsapp: string
  ip?: string
  userAgent?: string
  fbc?: string
  fbp?: string
  gaCookie?: string
  eventSourceUrl?: string
}

async function hashData(raw: string): Promise<string> {
  const { createHash } = await import('crypto')
  return createHash('sha256').update(raw.trim().toLowerCase()).digest('hex')
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName
}

function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

// ── Meta CAPI ────────────────────────────────────────────────────
export async function sendMetaCAPI(payload: CAPIPayload): Promise<void> {
  const pixelId     = process.env.NEXT_PUBLIC_FB_PIXEL_ID
  const accessToken = process.env.FB_ACCESS_TOKEN

  if (!pixelId || !accessToken) {
    console.warn('[CAPI] FB_PIXEL_ID ou FB_ACCESS_TOKEN ausente — evento ignorado.')
    return
  }

  try {
    const { leadId, name, whatsapp, ip, userAgent, fbc, fbp, eventSourceUrl } = payload

    const [hashedPhone, hashedFirstName, hashedExternalId] =
      await Promise.all([
        hashData(cleanPhone(whatsapp)),
        hashData(firstName(name)),
        hashData(String(leadId)),
      ])

    const body = {
      data: [
        {
          event_name: 'Lead',
          event_time: Math.floor(Date.now() / 1000),
          event_id: String(leadId),
          action_source: 'website',
          event_source_url: eventSourceUrl ?? undefined,
          user_data: {
            ph: [hashedPhone],
            fn: [hashedFirstName],
            ...(ip        && { client_ip_address: ip }),
            ...(userAgent && { client_user_agent: userAgent }),
            ...(fbc && { fbc }),
            ...(fbp && { fbp }),
            external_id: [hashedExternalId],
          },
          custom_data: {
            content_name: 'Lead Chácara Nanci',
            value: 0,
            currency: 'BRL',
          },
        },
      ],
    }

    const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[CAPI] Erro na resposta da Meta:', response.status, error)
      return
    }

    const result = await response.json()
    console.log('[CAPI] Evento enviado:', {
      leadId,
      eventsReceived: result.events_received,
      fbtrace: result.fbtrace_id,
    })
  } catch (err) {
    console.error('[CAPI] Falha inesperada (isolada):', err)
  }
}

// ── GA4 Measurement Protocol ─────────────────────────────────────
export async function sendGA4Lead(payload: {
  leadId: number | string
  gaCookie?: string
  userAgent?: string
  ip?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
}): Promise<void> {
  const measurementId = process.env.NEXT_PUBLIC_GA4_ID
  const apiSecret     = process.env.GA_API_SECRET

  if (!measurementId || !apiSecret) {
    console.warn('[GA4] NEXT_PUBLIC_GA4_ID ou GA_API_SECRET ausente — evento ignorado.')
    return
  }

  try {
    const { leadId, gaCookie, utmSource, utmMedium, utmCampaign } = payload

    // Extrai client_id do cookie _ga (formato: GA1.1.XXXXXXXXXX.XXXXXXXXXX)
    let clientId = `lead_${Date.now()}`
    if (gaCookie) {
      const parts = gaCookie.split('.')
      if (parts.length >= 4) clientId = `${parts[2]}.${parts[3]}`
    }

    const sessionId = String(Date.now())

    const body = {
      client_id: clientId,
      non_personalized_ads: false,
      events: [
        {
          name: 'generate_lead',
          params: {
            engagement_time_msec: 100,
            session_id: sessionId,
            currency: 'BRL',
            value: 0,
            lead_source: 'landing_page',
            form_name: 'Lead Chácara Nanci',
            external_id: String(leadId),
            ...(utmSource   && { utm_source:   utmSource }),
            ...(utmMedium   && { utm_medium:   utmMedium }),
            ...(utmCampaign && { utm_campaign: utmCampaign }),
          },
        },
      ],
    }

    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      console.error('[GA4] Erro na resposta:', response.status)
      return
    }

    console.log('[GA4] Evento generate_lead enviado:', { leadId, clientId })
  } catch (err) {
    console.error('[GA4] Falha inesperada (isolada):', err)
  }
}
