# LP Ernesto — Chácaras Nanci

Landing page de alto padrão para loteamento rural, com backend de captura de leads integrado ao banco de dados e Meta Conversions API.

---

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Drizzle ORM** + **Neon PostgreSQL**
- **Zod** (validação)
- **Meta Conversions API** (CAPI server-side)
- **Vercel** (deploy)

---

## Estrutura do projeto

```
public/
  site_01_obsidian.html       ← LP principal (Chácaras Nanci)
  obrigado_obsidian.html      ← Página de obrigado (redirect 3s → WhatsApp)
  img-1.jpeg                  ← Foto nova (galeria item 1)
  img-2.jpeg                  ← Pôr do sol (hero background)
  img-3.jpeg                  ← Cavalos (CTA background)
  img-4.jpeg                  ← Vista aérea (galeria)
  img-5.jpeg                  ← Foto nova 2 (galeria item 4)
  Imagem nova.jpeg            ← Seção abaixo do hero (sobre)
  varias.png                  ← Galeria extra

src/
  lib/
    schema.ts                 ← Tabela "leads" (name, whatsapp, utms)
    db.ts                     ← Conexão Drizzle + Neon
    tracking-server.ts        ← Meta CAPI (SHA-256, fire-and-forget)
  app/
    obsidian/
      route.ts                ← GET /obsidian → serve site_01_obsidian.html
      obrigado/
        route.ts              ← GET /obsidian/obrigado → página de obrigado
    api/
      contact/
        route.ts              ← POST /api/contact → salva lead + dispara CAPI

drizzle.config.ts
```

---

## Rotas

| Rota | Descrição |
|---|---|
| `/obsidian` | Landing page Chácaras Nanci |
| `/obsidian/obrigado` | Página de obrigado com countdown 3s e redirect para WhatsApp |
| `POST /api/contact` | Recebe `{ name, whatsapp, utm_* }`, salva no banco e dispara CAPI |

---

## Fluxo do lead

```
Usuário clica em qualquer CTA
        │
        ▼
Rola até #formulario (âncora no final da página)
        │
        ▼
Preenche nome + WhatsApp → submit
        │
        ▼
POST /api/contact
  ├── Valida com Zod
  ├── Salva no Neon (timeout 5s, fallback em memória)
  ├── Retorna 200 OK
  └── [background] sendMetaCAPI() fire-and-forget
        │
        ▼
Redirect → /obsidian/obrigado
        │
        ▼
Countdown 3 segundos
        │
        ▼
Redirect → wa.me/5566996829009
           msg: "Gostaria de mais informações da Chácara Nanci"
```

---

## Variáveis de ambiente

```bash
# Neon PostgreSQL
DATABASE_URL=postgresql://user:password@host.neon.tech/neondb?sslmode=require

# Meta Conversions API (server-side — nunca expor ao browser)
FB_PIXEL_ID=
FB_ACCESS_TOKEN=

# Meta Pixel (front-end)
NEXT_PUBLIC_FB_PIXEL_ID=
```

Configurar em: Vercel → Project Settings → Environment Variables.

---

## Banco de dados

Tabela `leads`:

| Coluna | Tipo | Obrigatório |
|---|---|---|
| `id` | serial (PK) | sim |
| `name` | text | sim |
| `whatsapp` | text | sim |
| `utm_source` | text | não |
| `utm_medium` | text | não |
| `utm_campaign` | text | não |
| `utm_term` | text | não |
| `created_at` | timestamp | sim (auto) |

```bash
# Aplicar schema no banco
pnpm db:push

# Produção (migration versionada)
pnpm db:generate
pnpm db:migrate
```

---

## Desenvolvimento local

```bash
pnpm install
cp .env.local.example .env.local   # preencher as variáveis
pnpm db:push                        # criar tabela no Neon
pnpm dev                            # http://localhost:3000/obsidian
```

---

## Informações do empreendimento

- **Empreendimento:** Chácaras Nanci
- **Imobiliária:** Ferreira Garcia Imobiliária
- **CRECI:** 8649/J — MT
- **Endereço:** Rua das Aroeiras, 505, Setor Comercial, CEP 78.550-224, Sinop/MT
- **WhatsApp:** (66) 99682-9009
- **Lotes:** 2.400 m²
- **Infraestrutura:** Ruas cascalhadas e energia elétrica trifásica
