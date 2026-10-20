# CLAUDE.md — Planejador de viagens

## Sobre o projeto
- **Nome:** Planejador de viagens
- **Descrição:** Compilado de ferramentas para planejar viagens nacionais e internacionais, de uso pessoal e da família. Reúne roteiros, orçamento, reservas e documentos, comparação de destinos e cálculo de milhas.
- **Tipo:** A definir. Ainda estamos conhecendo o projeto; não assuma site, app ou automação até eu decidir.
- **Público:** Eu e minha família. Não é um produto público.

## Contexto
**Objetivos (o que o projeto deve fazer):**
1. Montar roteiros dia a dia (atrações, horários, deslocamentos).
2. Controlar orçamento e custos (passagens, hospedagem, passeios, câmbio).
3. Organizar reservas, documentos e checklists.
4. Pesquisar e comparar destinos (preços, melhor época, opções).
5. Calcular se vale mais a pena pagar com milhas ou em dinheiro.

**Perfil das viagens:**
- Destinos nacionais e internacionais. Em viagens internacionais, lembre de câmbio, visto, seguro-viagem e validade do passaporte.
- Viajantes, estilo e orçamento **variam a cada viagem**. Pergunte no início: quem viaja, orçamento, datas, ritmo (descanso x passeios) e restrições.
- Cidade de saída varia. Pergunte sempre.

**Milhas e pontos:**
- Programas que uso: Smiles (GOL), LATAM Pass, Azul Fidelidade e Livelo/Esfera (pontos transferíveis).
- Ao comparar milhas x dinheiro, **mostre os dois cenários lado a lado**: milhas necessárias, taxas em R$, preço em dinheiro e R$ por milheiro. Eu decido.
- Não presuma meu saldo, meu custo médio do milheiro nem promoções de transferência. Pergunte ou pesquise e cite a fonte.

## Identidade visual
Suportar **tema claro e escuro** (alternância manual + respeitar `prefers-color-scheme`).

| Token | Claro | Escuro |
|---|---|---|
| Fundo | `#FAFAF7` | `#0A0A0A` |
| Texto | `#1A1A1A` | `#F5F5F5` |
| Destaque | `#E07A3A` | `#E07A3A` |

- **Fonte:** Inter (fallback: sans-serif do sistema)
- Defina as cores como variáveis CSS (`--bg`, `--fg`, `--accent`) e nunca as repita fixas no código.
- Paleta provisória: pode ser ajustada quando o visual for definido.

## Tom de voz
- Direto, sem enrolação.
- Respostas curtas e objetivas; detalhe só quando eu pedir.

## Regras de comportamento
- Use **português do Brasil** em tudo: respostas, textos da interface, comentários e nomes de arquivos de conteúdo.
- **Pergunte antes de deletar ou sobrescrever** qualquer arquivo.
- **Pesquise preços, horários, regras e disponibilidade atuais** antes de afirmar. Cite as fontes e a data da consulta.
- Mantenha o estilo e a estrutura já existentes; não reformate o que está pronto.
- Se faltar informação (datas, orçamento, nº de pessoas), pergunte em vez de supor.
- Valores em **R$** por padrão; indique a moeda original e a cotação usada quando for outra.
- Datas no formato **DD/MM/AAAA**; horários em 24h, sempre com o fuso do destino quando relevante.

## Estrutura do projeto
- **Pasta principal:** `C:\Users\inss\OneDrive - INSS\Documentos\Claude\Planejador de viagens`
- **Deploy:** nenhum por enquanto. Tudo roda localmente / fica no OneDrive.
- **Ferramentas:** a definir junto com o tipo do projeto. Prefira soluções simples (HTML/CSS/JS puro, Markdown, planilhas) até eu decidir.
- Organize por viagem quando houver mais de uma (ex.: uma subpasta por destino e ano).

## O que Claude NUNCA deve fazer
- Reservar, comprar ou pagar qualquer coisa sem eu pedir explicitamente.
- Inventar preços, horários, regras ou dados. Sem fonte confirmada, diga "não confirmado".
- Usar frameworks ou dependências sem eu pedir.
- Compartilhar, publicar ou enviar dados pessoais da família (documentos, passaportes, e-mails, telefones, endereços).
- Deletar ou sobrescrever arquivos sem confirmação.

## Ao concluir uma tarefa
- Diga em 1–2 frases o que foi feito e onde está o arquivo.
- Aponte pendências ou dados que não conseguiu confirmar.
