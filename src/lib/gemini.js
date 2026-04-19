// ═══════════════════════════════════════════════════════════════════════════════
// ⚠️ REGRA ABSOLUTA E INALTERÁVEL - NUNCA MUDAR ESTA FUNÇÃO!
// ═══════════════════════════════════════════════════════════════════════════════
//
// O Juridiquês Popular tem ÚNICA E EXCLUSIVA função:
// "Traduzir textos jurídicos para linguagem simples que qualquer pessoa entenda"
//
// ═══════════════════════════════════════════════════════════════════════════════

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY

export const LIMITE_GRATUITO_CHARS = 12800
export const PERCENTUAL_NAO_LOGADO = 0.30
export const PERCENTUAL_LOGADO = 0.60
export const PRECO_AVULSO = 5.00

const MODELOS = [
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3' },
  { id: 'mistralai/mistral-7b-instruct', name: 'Mistral' },
]

// ============================================
// SISTEMA DE SEGURANÇA ANTI-BURLA
// ============================================

export function gerarHashProcesso(texto) {
  const palavras = texto
    .toLowerCase()
    .replace(/[^a-záàãâéêíóôõúüç\s]/g, '')
    .split(/\s+/)
    .filter(p => p.length > 6)
  const unicas = [...new Set(palavras)]
  unicas.sort((a, b) => b.length - a.length)
  return unicas.slice(0, 50).join('|')
}

export function detectarTentativaBurla(texto, historicoHashes) {
  const palavras = texto
    .toLowerCase()
    .replace(/[^a-záàãâéêíóôõúüç\s]/g, '')
    .split(/\s+/)
    .filter(p => p.length > 6)
  
  if (palavras.length < 50) {
    return { suspeito: true, motivo: 'Texto muito curto' }
  }
  
  const unicas = [...new Set(palavras)]
  const percentualRepetido = 1 - (unicas.length / palavras.length)
  
  if (percentualRepetido > 0.7) {
    return { suspeito: true, motivo: 'Alto índice de palavras repetidas' }
  }
  
  if (historicoHashes && historicoHashes.length > 0) {
    const palavrasAtuais = new Set(palavras)
    for (const hashSalvo of historicoHashes) {
      const palavrasSalvas = new Set(hashSalvo.split('|'))
      const interseção = palavrasAtuais.intersection(palavrasSalvas)
      const similaridade = interseção.size / palavrasAtuais.size
      
      if (similaridade > 0.25) {
        return { suspeito: true, motivo: 'Texto similar a processo anterior' }
      }
    }
  }
  
  return { suspeito: false, motivo: null }
}

export function ehMesmoProcesso(textoNovo, hashSalvo) {
  if (!hashSalvo) return false
  const palavrasSalvas = new Set(hashSalvo.split('|'))
  const palavrasNovas = textoNovo
    .toLowerCase()
    .replace(/[^a-záàãâéêíóôõúüç\s]/g, '')
    .split(/\s+/)
    .filter(p => p.length > 6)
  if (palavrasNovas.length === 0) return false
  const coincidencias = palavrasNovas.filter(p => palavrasSalvas.has(p)).length
  return (coincidencias / palavrasNovas.length) >= 0.30
}

// ============================================
// DIRETRIZES DE TRANSCRIÇÃO - REGRA INALTERÁVEL
// ============================================

const DIRETRIZES_TRANSCRICAO = `
DIRETRIZES DA TRANSCRIÇÃO (REGRA INALTERÁVEL):

1. MANTENHA os termos jurídicos EXATAMENTE como estão escritos no documento original.
   - Não remova "animus furandi", mantenha como está no original
   - Não remova "Subsunção Típica", mantenha como está no original
   - Não traduza termos técnicos com parênteses explicativos

2. TRADUZA APENAS o restante do texto para linguagem simples.
   - Apenas simplifique as partes que não são termos técnicos
   - Mantenha os termos jurídicos técnicos no formato original

3. NÃO acrescente explicações entre parênteses.
   - Se o documento diz "animus furandi", deixe "animus furandi"
   - Se o documento diz "Subsunção Típica", deixe "Subsunção Típica"

4. Mantenha FIDELIDADE absoluta ao original.
   - Não invente informações
   - Não altere o sentido
   - Preserve o CONTEXTO

5. Linguagem simples APENAS para texto livre (não para termos técnicos).
`

const REGRA_FIDELIDADE = `
REGRA DE FIDELIDADE:
- Use apenas o que está escrito no documento
- NÃO invente informações
- NÃO presuma dados ausentes
- NÃO transforme alegação em fato
- Se não souber: "NÃO CONSTA EXPRESSAMENTE NO DOCUMENTO"
- Se incompleto: "INFORMAÇÃO AMBÍGUA OU INCOMPLETA"
`

// ============================================
// PROMPTS
// ============================================

const PROMPT_RESUMO = `Você é tradutor jurídico do Juridiquês Popular.

TAREFA: RESUMO do documento em linguagem simples.

Responda (cada resposta max 3 frases):
1. Quem está sendo acusado?
2. Qual é o crime?
3. O que a pessoa teria feito?
4. Quando aconteceu?
5. Onde aconteceu?
6. Quem acusa?
7. Quem é a vítima?
8. Quais provas?
9. Há testemunha?
10. Há perícia?
11. O réu foi preso?
12. Qual defesa?
13. O juiz decidiu?
14. Qual decisão?
15. Fase do processo?
16. Há sentença?
17. Condenação ou absolvição?
18. Qual pena?
19. Cabe recurso?
20. Próximo passo?

DOCUMENTO:
`

const PROMPT_TRANSCRICAO = `Você é tradutor jurídico do Juridiquês Popular.

TAREFA: TRANSCRIÇÃO do documento original.

${DIRETRIZES_TRANSCRICAO}
${REGRA_FIDELIDADE}

REGRAS:
- Mantenha os termos técnicos EXATAMENTE como estão no original
- Traduza apenas o texto livre para linguagem simples
- NÃO adicione explicações entre parênteses
- Mantenha a ORDEM original do documento
- Traduza o documento INTEIRO

TRADUZA O DOCUMENTO ABAIXO:

`

// ============================================
// FUNÇÕES
// ============================================

export function limparMarkdown(texto) {
  return texto
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/_{1,2}(.+?)_{1,2}/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .trim()
}

export function cortarEmPercentual(texto, percentual) {
  const limite = Math.floor(texto.length * percentual)
  const textoAteLimite = texto.slice(0, limite)
  const ultimoNewline = textoAteLimite.lastIndexOf('\n')
  return ultimoNewline > 0 ? textoAteLimite.slice(0, ultimoNewline) : textoAteLimite
}

async function chamarOpenRouter(prompt, onLog) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('Chave OpenRouter não configurada')
  }

  for (let tentativa = 0; tentativa < MODELOS.length; tentativa++) {
    const modelo = MODELOS[tentativa]
    if (onLog) onLog(`🤖 ${modelo.name}...`)
    
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Juridiques Popular'
        },
        body: JSON.stringify({
          model: modelo.id,
          messages: [
            { role: 'system', content: 'Tradutor jurídico brasileiro.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 8192,
          temperature: 0.2
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        if (tentativa < MODELOS.length - 1) await new Promise(r => setTimeout(r, 1000))
        continue
      }
      
      if (data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content
      }
    } catch (erro) {
      if (onLog) onLog(`❌ ${erro.message}`)
    }
    
    if (tentativa < MODELOS.length - 1) await new Promise(r => setTimeout(r, 1000))
  }
  throw new Error('Modelos falharam')
}

async function gerarResumo(texto, onLog) {
  if (onLog) onLog('📝 Gerando RESUMO...')
  return await chamarOpenRouter(PROMPT_RESUMO + texto.slice(0, 8000), onLog)
}

async function transcreverDocumento(texto, onLog) {
  if (onLog) onLog('📄 Gerando TRANSCRIÇÃO...')
  return await chamarOpenRouter(PROMPT_TRANSCRICAO + texto, onLog)
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

export async function traduzirTexto(texto, isPro, isAvulso = false, isLogado = false, onProgresso, onLog) {
  const textoCompleto = isPro || isAvulso ? texto : texto.slice(0, LIMITE_GRATUITO_CHARS)
  
  const resumoBruto = await gerarResumo(textoCompleto, onLog)
  const resumo = limparMarkdown(resumoBruto)
  
  const transcricaoBruta = await transcreverDocumento(textoCompleto, onLog)
  const transcricao = limparMarkdown(transcricaoBruta)
  
  let percentualExibido
  if (isPro || isAvulso) {
    percentualExibido = 1.0
  } else if (isLogado) {
    percentualExibido = PERCENTUAL_LOGADO
  } else {
    percentualExibido = PERCENTUAL_NAO_LOGADO
  }
  
  const traducaoExibida = cortarEmPercentual(transcricao, percentualExibido)
  const travado = !(isPro || isAvulso)
  
  return {
    resumo,
    traducao: traducaoExibida,
    traducaoCompleta: travado ? null : transcricao,
    travado,
    percentualExibido: percentualExibido * 100,
    totalBlocos: 1,
    caracteresUsados: textoCompleto.length
  }
}