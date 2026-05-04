# Projeto LP Ernesto — Chácaras Nanci
## Resumo completo do que foi feito

---

## 1. O que é o projeto

Landing page de alto padrão para o loteamento **Chácaras Nanci**, comercializado pela **Ferreira Garcia Imobiliária** (CRECI 8649/J), localizada em Sinop/MT.

A página foi construída com Next.js 14 e hospedada no Vercel. O backend captura leads, salva no banco de dados e dispara eventos para a Meta via Conversions API.

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

## 3. Fluxo do lead

```
Usuário acessa /obsidian
        |
        v
Clica em qualquer botão CTA
        |
        v
Rola até o formulário (#formulario) no final da página
        |
        v
Preenche: Nome + WhatsApp
        |
        v
Submit → POST /api/contact
  - Valida com Zod
  - Salva no banco Neon (timeout 5s, fallback em memória)
  - Captura UTMs da URL automaticamente
  - Retorna 200 OK
  - [background] Dispara evento Lead na Meta CAPI
        |
        v
Redirect → /obsidian/obrigado
        |
        v
Página de obrigado com countdown de 3 segundos
        |
        v
Redirect → WhatsApp
Número: 5566996829009
Mensagem: "Gostaria de mais informações da Chácara Nanci"
```

---

## 4. Rotas do projeto

| Rota | Arquivo | Descrição |
|---|---|---|
| `/obsidian` | `src/app/obsidian/route.ts` | Serve a LP principal |
| `/obsidian/obrigado` | `src/app/obsidian/obrigado/route.ts` | Página de obrigado com redirect 3s |
| `POST /api/contact` | `src/app/api/contact/route.ts` | Recebe leads, salva e dispara CAPI |

---

## 5. Arquivos principais

```
public/
  site_01_obsidian.html       LP principal
  obrigado_obsidian.html      Página de obrigado
  img-1.jpeg                  Foto nova Drive (galeria item 1)
  img-2.jpeg                  Pôr do sol (hero background)
  img-3.jpeg                  Cavalos (CTA background)
  img-4.jpeg                  Vista aérea (galeria)
  img-5.jpeg                  Foto nova Drive 2 (galeria item 4)
  Imagem nova.jpeg            Seção logo abaixo do hero (sobre)
  varias.png                  Galeria extra

src/
  lib/
    schema.ts                 Tabela "leads" no PostgreSQL
    db.ts                     Conexão Drizzle + Neon
    tracking-server.ts        Meta CAPI server-side
  app/
    obsidian/route.ts
    obsidian/obrigado/route.ts
    api/contact/route.ts
```

---

## 6. Banco de dados — tabela leads

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | serial (PK) | Usado como external_id na CAPI |
| `name` | text | Nome do lead |
| `whatsapp` | text | WhatsApp (qualquer formato) |
| `utm_source` | text | Ex: facebook |
| `utm_medium` | text | Ex: cpc |
| `utm_campaign` | text | Nome da campanha |
| `utm_term` | text | Variante da campanha |
| `created_at` | timestamp | Gerado automaticamente |

---

## 7. Variáveis de ambiente necessárias no Vercel

| Variável | Onde obter | Status |
|---|---|---|
| `DATABASE_URL` | console.neon.tech | A configurar |
| `FB_PIXEL_ID` | Meta Business, Gerenciador de Eventos | A configurar |
| `FB_ACCESS_TOKEN` | Meta Business, Gerenciador de Eventos, Conversions API | A configurar |
| `NEXT_PUBLIC_FB_PIXEL_ID` | Mesmo valor do FB_PIXEL_ID | A configurar |

---

## 8. Tracking — situação atual

### Meta CAPI (server-side)
- Implementado e pronto
- Evento: `Lead`
- Dados enviados com SHA-256: telefone, primeiro nome, external_id
- Dados em claro: IP, User-Agent, cookies _fbc e _fbp
- `content_name`: "Lead Chácara Nanci"
- Só ativa quando as env vars forem adicionadas no Vercel

### Meta Pixel (front-end)
- Ainda não implementado
- Precisa do Pixel ID para adicionar no HTML

### Google Analytics / GTM
- Ainda não implementado
- Precisa do ID GA4 (G-XXXXXXXXXX) ou GTM (GTM-XXXXXXX)

### Eventos planejados — Meta Pixel
| Evento | Gatilho |
|---|---|
| `PageView` | Ao carregar a página |
| `ViewContent` | Ao carregar a página |
| `Lead` | Ao submeter o formulário |

### Eventos planejados — Google Analytics
| Evento | Gatilho |
|---|---|
| `page_view` | Automático |
| `generate_lead` | Ao submeter o formulário |
| `view_item` | Ao ver a seção de diferenciais |
| `scroll` | Em 25%, 50%, 75% e 90% da página |
| `click` | Nos botões CTA |

---

## 9. SEO e GEO implementados

### Meta tags
- `title`: Chácaras Nanci — Lotes de 2.400m² em Sinop/MT | Ferreira Garcia Imobiliária
- `description`: texto otimizado com palavras-chave locais
- `robots`: index, follow
- `canonical`: URL da página

### Palavras-chave
- chácara à venda Sinop
- lotes rurais Sinop MT
- terreno chácara Sinop
- loteamento Sinop Mato Grosso
- chácara 2400m² Sinop
- imóvel rural Sinop
- Ferreira Garcia Imobiliária
- comprar chácara Sinop
- lote campo Sinop
- chácara Nanci Sinop

### GEO tags
- Região: BR-MT (Mato Grosso)
- Cidade: Sinop
- Coordenadas: -11.8642, -55.5073

### Schema.org (JSON-LD)
- Tipo: RealEstateListing + RealEstateAgent
- Endereço completo
- Telefone do corretor
- Área de atuação: Sinop/MT

### Open Graph
- Título, descrição e locale configurados para compartilhamento nas redes sociais

---

## 10. Ajustes visuais feitos na LP

- Imagens da galeria sem escurecimento (brightness 1)
- Galeria no mobile: 1 coluna com altura fixa
- Overlay do hero mais escuro para legibilidade do texto
- Sombra no título e subtítulo do hero
- Estatísticas (2.400m², 100%, 10min) com fonte reduzida no mobile
- Todos os CTAs como âncoras para o formulário (#formulario)
- Botão "Ligar Agora" removido
- "Scroll" traduzido para "Deslize"
- Imagem horizontal abaixo do hero com aspect-ratio 16/9 no mobile
- Hero content empurrado para cima no mobile para o botão aparecer na primeira dobra
- Nome corrigido: Ferreira Garcia Imobiliária (sem o &)
- Lotes: 2.400 m²
- Infraestrutura: ruas cascalhadas e energia trifásica
- Quote section: "Chácaras Nanci, Ferreira Garcia Imobiliária"
- Footer com endereço completo e CRECI 8649/J

---

## 11. Pendências

- [ ] Adicionar variáveis de ambiente no Vercel (DATABASE_URL, FB_PIXEL_ID, FB_ACCESS_TOKEN)
- [ ] Rodar `pnpm db:push` para criar a tabela no Neon
- [ ] Implementar Meta Pixel front-end (aguardando Pixel ID)
- [ ] Implementar Google Analytics ou GTM (aguardando ID)
- [ ] Testar fluxo completo: formulário > banco > CAPI > WhatsApp
- [ ] Configurar domínio próprio no Vercel
