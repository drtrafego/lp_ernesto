// NUNCA importe em Client Components

const ORG_SLUG = 'obsidian'

export interface CRMLeadPayload {
  name: string
  phone: string
  campaign?: string
}

export async function syncCRM(payload: CRMLeadPayload): Promise<void> {
  const baseUrl = process.env.CRM_API_URL

  if (!baseUrl) {
    console.warn('[CRM] CRM_API_URL ausente — sincronização ignorada.')
    return
  }

  try {
    const body = {
      org_slug: ORG_SLUG,
      name:     payload.name,
      phone:    payload.phone.replace(/\D/g, '').replace(/^0+/, ''),
      message:  'Gostaria de mais informações da Chácara Nanci',
      ...(payload.campaign && { campaign: payload.campaign }),
    }

    const response = await fetch(`${baseUrl}/crm/sync-whatsapp-lead`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[CRM] Erro na resposta:', response.status, error)
      return
    }

    const result = await response.json()
    console.log('[CRM] Lead sincronizado:', {
      org_slug: ORG_SLUG,
      phone:    payload.phone,
      status:   result.status,
    })
  } catch (err) {
    console.error('[CRM] Falha inesperada (isolada):', err)
  }
}
