# Projeto LP Ernesto — Chácaras Nanci

---

## 1. O que é o projeto

Landing page para o loteamento **Chácaras Nanci**, comercializado pela **Ferreira Garcia Imobiliária** (CRECI 8649/J), localizada em Sinop/MT.

Construída com Next.js (App Router), hospedada no Vercel. O backend captura leads, salva no Neon PostgreSQL com `organization_id` para identificação no CRM, dispara eventos para a Meta via Conversions API e para o GA4 via Measurement Protocol.

---

## 2. Informações do empreendimento

| Campo | Valor |
|---|---|
| Empreendimento | Chácaras Nanci |
| Imobiliária | Ferreira Garcia Imobiliária |
| CRECI | 8649/J — MT |
| Endereço | Rua das Aroeiras, 505, Setor Comercial, CEP 78.550-224, Sinop/MT |
| WhatsApp | (66) 99682-9009 |
| Tamanho dos lotes | 2.400 m² |
| Infraestrutura | Ruas cascalhadas e energia elétrica trifásica |
| Documentação | 100% regularizada |

---

## 3. Domínio e acesso

| Item | Valor |
|---|---|
| Domínio | `ferreiragarciaimobiliaria.com.br` |
| Subdomínio ativo | `nanci.ferreiragarciaimobiliaria.com.br` |
| Provedor DNS | GK2.CLOUD (gerenciado via cPanel do cliente) |
| Vercel CNAME | `b010328408634c82.vercel-dns-017.com.` |
| Vercel A record | `216.198.79.1` |
| Status DNS | Aguardando acesso do cliente ao cPanel para configurar CNAME do subdomínio |
| Projeto Vercel | `gastaos-projects/lp-ernesto` |
| Projeto ID | `prj_G1ne256nqx8bPu3n9eNNbqfFsFuL` |
| Org ID | `team_kkkpoJEZDx2r2Oyi8v8Jbnbu` |

---

## 4. Rotas do projeto

| Rota | Descrição |
|---|---|
| `/` | Rewrite para `/obsidian` — home do subdomínio nanci.ferreiragarciaimobiliaria.com.br |
| `/obsidian` | LP principal (Meta Ads) |
| `/obsidian/obrigado` | Página de obrigado com countdown 3s e redirect WhatsApp |
| `/chacara-nanci` | Mesma LP (links Google / SEO) |
| `/chacara-nanci/obrigado` | Mesma página de obrigado |
| `POST /api/contact` | Recebe leads, salva banco, dispara CAPI e GA4 |

---

## 5. Fluxo completo do lead

```
Usuário acessa / ou /obsidian ou /chacara-nanci
        |
        | Pixel dispara: PageView + ViewContent
        | GTM captura UTMs da URL automaticamente
        v
Clica em qualquer botão CTA
        |
        v
Rola até o formulário (#formulario)
        |
        v
Preenche: Nome + WhatsApp
  - Validação visual com mensagem de erro e shake se campos incompletos
  - Formulário não avança sem nome (min 2 chars) e WhatsApp (min 10 dígitos)
        |
        v
Submit
        |
        v
[CLIENT] fbq('track', 'Lead', {}, { eventID: leadId })
[CLIENT] dataLayer.push({ event: 'generate_lead', lead_id: leadId })
        |
        v
POST /api/contact
  - Valida com Zod
  - Captura IP, User-Agent, cookies _fbc, _fbp, _ga
  - Captura UTMs (utm_source, utm_medium, utm_campaign, utm_term)
  - Salva no Neon PostgreSQL com organization_id (timeout 5s, fallback em memória)
  - Retorna 200 OK com leadId
  - [background] Meta CAPI → evento Lead (mesmo eventID do Pixel)
  - [background] GA4 Measurement Protocol → evento generate_lead
        |
        v
Redirect → /obsidian/obrigado
        |
        | dataLayer.push({ event: 'generate_lead', page: 'obrigado' })
        v
Countdown 3 segundos
        |
        v
Redirect → wa.me/5566996829009
           msg: "Gostaria de mais informações da Chácara Nanci"
```

---

## 6. Arquivos principais

```
next.config.mjs             Rewrite / -> /obsidian

public/
  site_01_obsidian.html     LP principal (placeholders %%GTM_ID%%, %%GA4_ID%%, %%FB_PIXEL_ID%%)
  obrigado_obsidian.html    Página de obrigado (placeholder %%GTM_ID%%)
  img-1.jpeg                Galeria item 1
  img-2.jpeg                Pôr do sol (hero background)
  img-3.jpeg                Cavalos (CTA background)
  img-4.jpeg                Vista aérea (galeria)
  img-5.jpeg                Galeria item 4
  Imagem nova.jpeg          Seção sobre (abaixo do hero)
  varias.png                Galeria extra

src/
  lib/
    schema.ts               Tabela "leads" (organization_id, name, whatsapp, utms)
    db.ts                   Conexão Drizzle + Neon
    tracking-server.ts      Meta CAPI + GA4 Measurement Protocol (server-side)
  app/
    obsidian/
      route.ts              GET /obsidian → injeta GTM_ID, GA4_ID e FB_PIXEL_ID no HTML
      obrigado/route.ts     GET /obsidian/obrigado → injeta GTM_ID no HTML
    chacara-nanci/
      route.ts              GET /chacara-nanci → mesma LP
      obrigado/route.ts     GET /chacara-nanci/obrigado → mesma obrigado
    api/contact/route.ts    POST /api/contact → orquestra banco, CAPI, GA4
```

---

## 7. Banco de dados — tabela leads

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | serial (PK) | Usado como external_id na CAPI e event_id no GA4 |
| `organization_id` | text | UUID da empresa no CRM Neon (env: ORGANIZATION_ID) |
| `name` | text | Nome do lead |
| `whatsapp` | text | WhatsApp (qualquer formato) |
| `utm_source` | text | Ex: facebook |
| `utm_medium` | text | Ex: cpc |
| `utm_campaign` | text | Nome da campanha |
| `utm_term` | text | Variante da campanha |
| `created_at` | timestamp | Gerado automaticamente |

> Pendente: rodar `pnpm db:push` para aplicar a coluna `organization_id` no banco Neon.

---

## 8. Tracking

### Meta Pixel (client-side)

| Evento | Quando |
|---|---|
| `PageView` | Ao carregar a página |
| `ViewContent` | Ao carregar a página |
| `Lead` | Submit do formulário, com `eventID` para deduplicação com CAPI |

### Meta CAPI (server-side)

| Evento | Quando |
|---|---|
| `Lead` | Background após salvar no banco |

Dados hasheados com SHA-256: telefone (`ph`), primeiro nome (`fn`), external_id.
Dados em claro: IP, User-Agent, cookies `_fbc` e `_fbp`.
Deduplicação: `event_id` = `leadId` (mesmo valor do Pixel client-side).

### Ordem dos scripts no `<head>`

```
1. dataLayer init + captura de UTMs   ← síncrono
2. GTM snippet                         ← async, placeholder %%GTM_ID%%
3. GA4 gtag.js direto                  ← async, placeholder %%GA4_ID%%
   send_page_view: false               ← evita pageview duplicado com GTM
```

GA4 injetado direto no head (não via GTM) para garantir que `window.gtag` esteja disponível imediatamente.

### GTM + GA4 (dataLayer)

| Evento | Quando |
|---|---|
| UTMs capturados | Ao carregar (utm_source, utm_medium, utm_campaign, utm_content, utm_term, gclid) |
| `generate_lead` | Submit do formulário |
| `generate_lead` | Entrada na página de obrigado |

### GA4 Measurement Protocol (server-side)

| Evento | Quando |
|---|---|
| `generate_lead` | Background após salvar no banco |

Parâmetros: `client_id` (do cookie `_ga`), `session_id`, `currency`, `value`, `form_name`, `external_id`, UTMs.

### CRM

Lead salvo diretamente no Neon com `organization_id = ea612c4f-5a1f-4b0d-bfbb-00387b60b284`. Sem webhook externo. O CRM filtra os leads pelo `organization_id`.

---

## 9. Variáveis de ambiente — Vercel

Todas configuradas em Production e Preview:

| Variável | Descrição | Status |
|---|---|---|
| `DATABASE_URL` | String de conexão Neon PostgreSQL | Configurado |
| `ORGANIZATION_ID` | UUID da empresa no CRM Neon | Configurado |
| `NEXT_PUBLIC_FB_PIXEL_ID` | Pixel ID Meta — usado no front e server via CAPI | Configurado |
| `FB_ACCESS_TOKEN` | Token Meta Conversions API (server-side) | Configurado |
| `NEXT_PUBLIC_GTM_ID` | GTM-5LJVTJTC | Configurado |
| `NEXT_PUBLIC_GA4_ID` | G-5T0PQSXCZS — Measurement ID GA4 | Configurado |
| `GA_API_SECRET` | Secret do GA4 Measurement Protocol (server-side) | Configurado |

---

## 10. IDs de tracking

| Ferramenta | ID |
|---|---|
| Google Tag Manager | GTM-5LJVTJTC |
| GA4 Measurement ID | G-5T0PQSXCZS |
| GA4 Stream ID | 14825827660 |

---

## 11. SEO e GEO

- `title`: Chácaras Nanci — Lotes de 2.400m² em Sinop/MT | Ferreira Garcia Imobiliária
- `description`: texto otimizado com palavras-chave locais
- `robots`: index, follow
- `canonical`: URL da página
- Região: BR-MT, Cidade: Sinop, Coordenadas: -11.8642, -55.5073
- Schema.org: RealEstateListing + RealEstateAgent com endereço e telefone completos

Palavras-chave: chácara à venda Sinop, lotes rurais Sinop MT, terreno chácara Sinop, loteamento Sinop Mato Grosso, chácara 2400m² Sinop, imóvel rural Sinop, Ferreira Garcia Imobiliária, comprar chácara Sinop, lote campo Sinop, chácara Nanci Sinop

---

## 12. Imagens

| Seção | Arquivo |
|---|---|
| Hero (fundo) | `img-2.jpeg` — pôr do sol |
| Sobre (abaixo do hero) | `Imagem nova.jpeg` — foto horizontal do lote |
| Galeria 1 | `img-1.jpeg` |
| Galeria 2 | `img-3.jpeg` |
| Galeria 3 | `img-4.jpeg` |
| Galeria 4 | `img-5.jpeg` |
| CTA final (fundo) | `img-3.jpeg` |

---

## 13. Pendências

- [ ] Rodar `pnpm db:push` para aplicar coluna `organization_id` na tabela Neon
- [ ] Configurar CNAME `nanci` no cPanel do cliente (GK2.CLOUD) apontando para `b010328408634c82.vercel-dns-017.com.`
- [ ] Testar fluxo completo: formulário > banco > CAPI > GA4 > WhatsApp
- [ ] Verificar deduplicação Meta (Pixel + CAPI mesmo event_id)
- [ ] Verificar eventos GA4 no DebugView após deploy com variáveis
