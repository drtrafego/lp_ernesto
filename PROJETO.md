# Projeto LP Ernesto — Chácaras Nanci
## Resumo completo do que foi feito

---

## 1. O que é o projeto

Landing page de alto padrão para o loteamento **Chácaras Nanci**, comercializado pela **Ferreira Garcia Imobiliária** (CRECI 8649/J), localizada em Sinop/MT.

A página foi construída com Next.js 14 e hospedada no Vercel. O backend captura leads, salva no banco de dados Neon (com `organization_id` para identificar a empresa no CRM), dispara eventos para a Meta via Conversions API e envia para o GA4 via Measurement Protocol.

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

## 3. Rotas do projeto

| Rota | Descrição |
|---|---|
| `/obsidian` | LP principal (Meta Ads) |
| `/obsidian/obrigado` | Página de obrigado com countdown 3s e redirect WhatsApp |
| `/chacara-nanci` | Mesma LP (links Google / SEO) |
| `/chacara-nanci/obrigado` | Mesma página de obrigado |
| `POST /api/contact` | Recebe leads, salva banco, dispara CAPI, GA4 e CRM |

---

## 4. Fluxo completo do lead

```
Usuário acessa /obsidian ou /chacara-nanci
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
Preenche: Nome + WhatsApp → submit
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
  - Salva no Neon PostgreSQL (timeout 5s, fallback em memória)
  - Retorna 200 OK com leadId
  - [background] Meta CAPI → evento Lead (mesmo eventID do Pixel)
  - [background] GA4 Measurement Protocol → evento generate_lead
  - lead salvo com organization_id (identifica empresa no CRM Neon)
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

## 5. Arquivos principais

```
public/
  site_01_obsidian.html       LP principal (com placeholders %%GTM_ID%%, %%FB_PIXEL_ID%%)
  obrigado_obsidian.html      Página de obrigado (com placeholder %%GTM_ID%%)
  img-1.jpeg                  Foto nova Drive (galeria item 1)
  img-2.jpeg                  Pôr do sol (hero background)
  img-3.jpeg                  Cavalos (CTA background)
  img-4.jpeg                  Vista aérea (galeria)
  img-5.jpeg                  Foto nova Drive 2 (galeria item 4)
  Imagem nova.jpeg            Seção logo abaixo do hero (sobre)
  varias.png                  Galeria extra

src/
  lib/
    schema.ts                 Tabela "leads" (organization_id, name, whatsapp, utms)
    db.ts                     Conexão Drizzle + Neon
    tracking-server.ts        Meta CAPI + GA4 Measurement Protocol (server-side)
  app/
    obsidian/
      route.ts                GET /obsidian → injeta GTM_ID e FB_PIXEL_ID no HTML
      obrigado/route.ts       GET /obsidian/obrigado → injeta GTM_ID no HTML
    chacara-nanci/
      route.ts                GET /chacara-nanci → mesma LP
      obrigado/route.ts       GET /chacara-nanci/obrigado → mesma obrigado
    api/contact/route.ts      POST /api/contact → orquestra banco, CAPI, GA4, CRM
```

---

## 6. Banco de dados — tabela leads

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

---

## 7. Tracking — situação completa

### Meta Pixel (client-side) — HTML

| Evento | Quando | Status |
|---|---|---|
| `PageView` | Ao carregar a página | Implementado |
| `ViewContent` | Ao carregar a página | Implementado |
| `Lead` | Ao submeter o formulário, com `eventID` para deduplicação | Implementado |

### Meta CAPI (server-side) — tracking-server.ts

| Evento | Quando | Status |
|---|---|---|
| `Lead` | Background após salvar no banco | Implementado |

Dados enviados com SHA-256: telefone (`ph`), primeiro nome (`fn`), external_id.
Dados em claro: IP, User-Agent, cookies `_fbc` e `_fbp`.
Deduplicação: `event_id` = `leadId` (mesmo valor do Pixel client-side).

### Ordem dos scripts no `<head>` (ambas as páginas)

```
1. dataLayer init + captura de UTMs   ← síncrono
2. GTM snippet                         ← async, placeholder %%GTM_ID%%
3. GA4 gtag.js direto                  ← async, placeholder %%GA4_ID%%
   send_page_view: false               ← evita pageview duplicado com GTM
```

Por que GA4 direto no head: o `window.gtag` só existia depois que o GTM carregava a tag de configuração GA4 internamente, o que causa atraso. GA4 direto garante que `gtag()` está disponível imediatamente.

### GTM + GA4 (dataLayer) — client-side

| Evento | Quando | Status |
|---|---|---|
| UTMs capturados | Ao carregar (utm_source, utm_medium, utm_campaign, utm_content, utm_term, gclid) | Implementado |
| `generate_lead` | Ao submeter o formulário | Implementado |
| `generate_lead` | Ao entrar na página de obrigado | Implementado |

### GA4 Measurement Protocol (server-side) — tracking-server.ts

| Evento | Quando | Status |
|---|---|---|
| `generate_lead` | Background após salvar no banco | Implementado |

Parâmetros: `client_id` (extraído do cookie `_ga`), `session_id`, `currency`, `value`, `form_name`, `external_id`, UTMs.

### CRM — integração via banco

O lead é salvo diretamente no Neon com o campo `organization_id` (UUID da empresa). Não há webhook externo. O CRM lê os leads pelo `organization_id` na tabela `leads`.

---

## 8. Variáveis de ambiente — Vercel

| Variável | Onde obter | Status |
|---|---|---|
| `DATABASE_URL` | console.neon.tech | Configurado |
| `NEXT_PUBLIC_FB_PIXEL_ID` | Meta Business, Gerenciador de Eventos | A configurar |
| `FB_ACCESS_TOKEN` | Meta Business, Gerenciador de Eventos, Conversions API | A configurar |
| `NEXT_PUBLIC_GTM_ID` | Google Tag Manager (ex: GTM-XXXXXXX) | A configurar |
| `NEXT_PUBLIC_GA4_ID` | GA4, Measurement ID (ex: G-XXXXXXXXXX) — usado no front e server-side | A configurar |
| `GA_API_SECRET` | GA4, Admin, Data Streams, Measurement Protocol API secrets | A configurar |
| `ORGANIZATION_ID` | UUID da empresa no CRM Neon | Configurado (ea612c4f...) |

---

## 9. SEO e GEO

### Meta tags
- `title`: Chácaras Nanci — Lotes de 2.400m² em Sinop/MT | Ferreira Garcia Imobiliária
- `description`: texto otimizado com palavras-chave locais
- `robots`: index, follow
- `canonical`: URL da página

### Palavras-chave
chácara à venda Sinop, lotes rurais Sinop MT, terreno chácara Sinop, loteamento Sinop Mato Grosso, chácara 2400m² Sinop, imóvel rural Sinop, Ferreira Garcia Imobiliária, comprar chácara Sinop, lote campo Sinop, chácara Nanci Sinop

### GEO
- Região: BR-MT, Cidade: Sinop, Coordenadas: -11.8642, -55.5073

### Schema.org (JSON-LD)
RealEstateListing + RealEstateAgent com endereço e telefone completos.

---

## 10. Imagens — mapeamento

| Seção | Arquivo |
|---|---|
| Hero (fundo) | `img-2.jpeg` — pôr do sol |
| Sobre (abaixo do hero) | `Imagem nova.jpeg` — foto horizontal do lote |
| Galeria 1ª | `img-1.jpeg` |
| Galeria 2ª | `img-3.jpeg` |
| Galeria 3ª | `img-4.jpeg` |
| Galeria 4ª | `img-5.jpeg` |
| CTA final (fundo) | `img-3.jpeg` |

---

## 11. Pendências

- [x] Configurar `DATABASE_URL` no Vercel
- [x] Configurar `ORGANIZATION_ID` no Vercel
- [ ] Rodar `pnpm db:push` para aplicar coluna `organization_id` na tabela do Neon
- [ ] Adicionar no Vercel: `NEXT_PUBLIC_FB_PIXEL_ID`, `FB_ACCESS_TOKEN`
- [ ] Adicionar no Vercel: `NEXT_PUBLIC_GTM_ID` (cliente vai trazer)
- [ ] Adicionar no Vercel: `NEXT_PUBLIC_GA4_ID`, `GA_API_SECRET`
- [ ] Testar fluxo completo: formulário > banco > CAPI > GA4 > WhatsApp
- [ ] Domínio `ferreiragarciaimobiliaria.com.br`: aguardando acesso ao painel GK2.CLOUD para adicionar CNAME `www` apontando para `b010328408634c82.vercel-dns-017.com.`
