import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  const gtmId   = process.env.NEXT_PUBLIC_GTM_ID     ?? ''
  const pixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID ?? ''

  const html = readFileSync(join(process.cwd(), 'public', 'site_01_obsidian.html'), 'utf-8')
    .replace(/%%GTM_ID%%/g, gtmId)
    .replace(/%%FB_PIXEL_ID%%/g, pixelId)

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
