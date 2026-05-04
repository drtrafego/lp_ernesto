// NUNCA importe em Client Components

export interface CAPIPayload {
  leadId: number | string
  name: string
  whatsapp: string
  ip?: string
  userAgent?: string
  fbc?: string
  fbp?: string
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

export async function sendMetaCAPI(payload: CAPIPayload): Promise<void> {
  const pixelId     = process.env.FB_PIXEL_ID
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
