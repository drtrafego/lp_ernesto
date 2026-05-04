import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID ?? ''
  const ga4Id = process.env.NEXT_PUBLIC_GA4_ID ?? ''

  const html = readFileSync(join(process.cwd(), 'public', 'obrigado_obsidian.html'), 'utf-8')
    .replace(/%%GTM_ID%%/g, gtmId)
    .replace(/%%GA4_ID%%/g, ga4Id)

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
