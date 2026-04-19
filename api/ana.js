// api/ana.js
// Endpoint para o Assistente Ana usar OpenRouter

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const { pergunta, historico } = req.body
  const OPENROUTER_API_KEY = process.env.VITE_OPENROUTER_API_KEY

  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'API key não configurada' })
  }

  try {
    const mensagens = [
      {
        role: 'system',
        content: `Você é Ana, assistente jurídica do Juridiquês Popular.

REGRAS ABSOLUTAS:
- VOCÊ SÓ PODE falar APENAS o que está no processo fornecido
- Responder dúvidas sobre o conteúdo do processo
- Traduzir linguagem jurídica para linguagem simples
- Nunca use latim ou termos técnicos sem tradução

LINGUAGEM OBRIGATÓRIA:
- Português brasileiro simples
- Compreensível por quem tem ensino fundamental
- Respostas curtas e diretas

Se não souber a resposta: "Não está no processo. Não posso falar sobre isso."`
      }
    ]

    // Adiciona histórico
    if (historico && historico.length > 0) {
      historico.forEach(msg => {
        mensagens.push({ role: msg.role, content: msg.content })
      })
    }

    // Adiciona pergunta atual
    mensagens.push({ role: 'user', content: pergunta })

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://juridiquespopular.com.br',
        'X-Title': 'Juridiques Popular - Ana'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct',
        messages: mensagens,
        max_tokens: 1024,
        temperature: 0.3
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Erro OpenRouter:', data)
      return res.status(500).json({ error: 'Erro ao processar pergunta' })
    }

    const resposta = data.choices?.[0]?.message?.content || 'Desculpe, não consegui processar sua pergunta.'

    return res.status(200).json({ resposta })

  } catch (error) {
    console.error('Erro na API ANA:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
}