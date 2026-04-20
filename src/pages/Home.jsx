import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { traduzirTexto, gerarHashProcesso, ehMesmoProcesso, limparMarkdown, LIMITE_GRATUITO_CHARS, PRECO_AVULSO, detectarTentativaBurla } from '../lib/gemini'
import { iniciarPagamento, verificarPlano, verificarProcessoAvulso } from '../lib/kiwify'
import ModalLogin from '../components/ModalLogin'
import ModalPlanos from '../components/ModalPlanos'
import AssistenteAna from '../components/AssistenteAna'

async function extrairTextoPDF(file) {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString()
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let textoCompleto = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    textoCompleto += content.items.map(item => item.str).join(' ') + '\n'
  }
  return textoCompleto.trim()
}

async function extrairTextoDOCX(file) {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value.trim()
}

async function baixarPDF(resumo, traducao, nomeArquivo) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const largura = doc.internal.pageSize.getWidth()
  const margemEsq = 15, margemDir = 15
  const larguraTexto = largura - margemEsq - margemDir
  let y = 20
  function adicionarSecao(titulo, conteudo, corTitulo) {
    doc.setFontSize(13); doc.setFont('helvetica', 'bold')
    doc.setTextColor(...corTitulo)
    doc.text(titulo, margemEsq, y); y += 8
    doc.setDrawColor(...corTitulo); doc.setLineWidth(0.5)
    doc.line(margemEsq, y, largura - margemDir, y); y += 6
    doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.setTextColor(40, 40, 40)
    const linhas = doc.splitTextToSize(conteudo, larguraTexto)
    for (const linha of linhas) {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.text(linha, margemEsq, y); y += 5.5
    }
    y += 10
  }
  doc.setFillColor(26, 43, 74); doc.rect(0, 0, largura, 16, 'F')
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 170, 138)
  doc.text('Juridiques Popular', margemEsq, 10)
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(160, 176, 200)
  doc.text('Traducao Juridica Simplificada', margemEsq, 14.5)
  doc.text(new Date().toLocaleDateString('pt-BR'), largura - margemDir, 10, { align: 'right' })
  y = 26
  adicionarSecao('RESUMO DO PROCESSO', resumo, [26, 170, 138])
  adicionarSecao('TRADUCAO POPULAR INTEGRAL', traducao, [244, 120, 32])
  const totalPaginas = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i); doc.setFontSize(7); doc.setTextColor(170, 170, 170); doc.setFont('helvetica', 'normal')
    doc.text('Este documento foi gerado por IA e nao substitui aconselhamento juridico profissional.', largura / 2, 290, { align: 'center' })
    doc.text(`Pagina ${i} de ${totalPaginas}`, largura - margemDir, 290, { align: 'right' })
  }
  const nomeBase = nomeArquivo ? nomeArquivo.replace(/\.[^/.]+$/, '') : 'traducao'
  doc.save(`juridiques-${nomeBase}.pdf`)
}

function dividirParagrafos(texto) {
  return texto.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0)
}

function TextoClicavel({ texto, podeOuvir, onClicarParagrafo, paragrafoAtivo, tocando }) {
  const paragrafos = dividirParagrafos(texto)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {podeOuvir && (
        <div style={{ fontSize: 11, color: '#a0b0c8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>👆</span><span>Toque num parágrafo para iniciar a leitura</span>
        </div>
      )}
      {paragrafos.map((p, i) => {
        const esteAtivo = paragrafoAtivo === i && tocando
        return (
          <div key={i} onClick={() => podeOuvir && onClicarParagrafo(i, paragrafos)}
            style={{
              fontSize: 14, color: esteAtivo ? '#fff' : '#c8d8e8', lineHeight: 1.8,
              padding: '6px 10px', borderRadius: 8,
              cursor: podeOuvir ? 'pointer' : 'default',
              background: esteAtivo ? 'rgba(26,170,138,0.25)' : 'transparent',
              borderLeft: esteAtivo ? '3px solid #1aaa8a' : '3px solid transparent',
              transition: 'all 0.2s ease', userSelect: podeOuvir ? 'none' : 'text',
            }}>
            {esteAtivo && <span style={{ display: 'inline-block', marginRight: 6, fontSize: 10, background: '#1aaa8a', color: '#fff', borderRadius: 4, padding: '1px 5px', verticalAlign: 'middle' }}>▶ lendo</span>}
            {p}
          </div>
        )
      })}
    </div>
  )
}

function MuroConversao({ onVerPlanos, onPagarAvulso }) {
  return (
    <div style={{ margin: '0 -16px -16px', position: 'relative' }}>
      <div style={{ height: 80, marginTop: -80, background: 'linear-gradient(to bottom, transparent, #1a2b4a)', position: 'relative', zIndex: 1 }} />
      <div style={{ background: '#1a2b4a', padding: '24px 20px 28px', borderTop: '2px solid #1aaa8a' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 6 }}>Você leu 60% do processo</div>
          <div style={{ fontSize: 13, color: '#a0b0c8', lineHeight: 1.6 }}>Desbloqueie o restante para ver a tradução completa,<br />incluindo a decisão final e todas as cláusulas.</div>
        </div>
        <div style={{ background: 'rgba(26,170,138,0.1)', border: '2px solid #1aaa8a', borderRadius: 16, padding: '16px 18px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1aaa8a' }}>🔓 Desbloquear este processo</div>
              <div style={{ fontSize: 12, color: '#a0b0c8', marginTop: 2 }}>Pagamento único — só para este documento</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>R${PRECO_AVULSO.toFixed(2).replace('.', ',')}</div>
              <div style={{ fontSize: 10, color: '#a0b0c8' }}>uma vez</div>
            </div>
          </div>
          <button onClick={onPagarAvulso} style={{ width: '100%', background: '#1aaa8a', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>
            🔓 VER PROCESSO COMPLETO — R${PRECO_AVULSO.toFixed(2).replace('.', ',')}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(160,176,200,0.3)' }} />
          <span style={{ fontSize: 11, color: '#a0b0c8', fontWeight: 600 }}>OU ASSINE E ECONOMIZE</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(160,176,200,0.3)' }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, background: 'rgba(244,120,32,0.1)', border: '1.5px solid #f47820', borderRadius: 14, padding: '14px 12px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#f47820', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap' }}>⭐ MAIS POPULAR</div>
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#f47820' }}>🔥 PRO</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>R$ 5,00</div>
              <div style={{ fontSize: 10, color: '#a0b0c8' }}>/mês — ilimitado</div>
            </div>
            <div style={{ fontSize: 11, color: '#a0b0c8', marginBottom: 12, lineHeight: 1.6 }}>✓ Processos ilimitados<br />✓ PDF + Voz<br />✓ Sem restrições</div>
            <button onClick={onVerPlanos} style={{ width: '100%', background: '#f47820', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>🔥 ASSINAR PRO</button>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(160,176,200,0.4)', borderRadius: 14, padding: '14px 12px' }}>
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#e0e8f0' }}>⭐ PLUS+</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>R$ 5,00</div>
              <div style={{ fontSize: 10, color: '#a0b0c8' }}>/mês</div>
            </div>
            <div style={{ fontSize: 11, color: '#a0b0c8', marginBottom: 12, lineHeight: 1.6 }}>✓ Tudo do PRO<br />✓ Assistente Ana<br />✓ Tire dúvidas do doc</div>
            <button onClick={onVerPlanos} style={{ width: '100%', background: 'rgba(255,255,255,0.1)', color: '#e0e8f0', border: '1px solid rgba(160,176,200,0.4)', borderRadius: 10, padding: '11px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>⭐ ASSINAR PLUS+</button>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: '#a0b0c8' }}>🔒 Pagamento seguro via Mercado Pago · Cancele quando quiser</div>
      </div>
    </div>
  )
}

export default function Home() {
  const [texto, setTexto] = useState('')
  const [aba, setAba] = useState('colar')
  const [carregando, setCarregando] = useState(false)
  const [progressoBloco, setProgressoBloco] = useState({ atual: 0, total: 0 })
  const [carregandoArquivo, setCarregandoArquivo] = useState(false)
  const [baixandoPDF, setBaixandoPDF] = useState(false)
  const [nomeArquivo, setNomeArquivo] = useState(null)
  const [usuario, setUsuario] = useState(null)
  const [mostrarLogin, setMostrarLogin] = useState(false)
  const [mostrarPlanos, setMostrarPlanos] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [isPro, setIsPro] = useState(false)
  const [isPlus, setIsPlus] = useState(false)
  const [isAvulso, setIsAvulso] = useState(false)

  const podeBaixarPDF = isPro || isAvulso
  const podeOuvir = isPro || isAvulso

  // TTS
  const [ttsAtivo, setTtsAtivo] = useState(false)
  const [ttsPausado, setTtsPausado] = useState(false)
  const [ttsSecao, setTtsSecao] = useState('resumo')
  const [velocidadeTTS, setVelocidadeTTS] = useState(1.0)
  const [paragrafos, setParagrafos] = useState([])
  const [paragrafoAtual, setParagrafoAtual] = useState(-1)
  const lendoRef = useRef(false)
  const paragrafosRef = useRef([])
  const velocidadeRef = useRef(1.0)
  const hashUltimoProcesso = useRef(null)
  const historicoHashes = useRef([]) // Armazena hashes de processos anteriores

  // Sincroniza velocidade com ref para uso no TTS
  useEffect(() => { velocidadeRef.current = velocidadeTTS }, [velocidadeTTS])

useEffect(() => {
    try {
      console.log('Home mount - checking Supabase:', !!supabase);
      supabase.auth.getSession().then(({ data: { session } }) => {
        console.log('Supabase session:', !!session);
        setUsuario(session?.user ?? null)
        if (session?.user) carregarPlano(session.user.id)
      }).catch(err => {
        console.error('Supabase getSession error:', err);
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUsuario(session?.user ?? null)
        if (session?.user) carregarPlano(session.user.id)
        else { setIsPro(false); setIsPlus(false); setIsAvulso(false) }
      })
      return () => { subscription.unsubscribe(); lendoRef.current = false; window.speechSynthesis?.cancel() }
    } catch (err) {
      console.error('Home useEffect error:', err);
    }
  }, [])

  async function carregarPlano(usuarioId) {
    const { plano, ativo } = await verificarPlano(supabase, usuarioId)
    setIsPro(ativo && (plano === 'pro' || plano === 'plus'))
    setIsPlus(ativo && plano === 'plus')
  }

  useEffect(() => {
    if (resultado) {
      const pars = ttsSecao === 'resumo' ? dividirParagrafos(resultado.resumo) : dividirParagrafos(resultado.traducao)
      setParagrafos(pars); paragrafosRef.current = pars
    }
  }, [resultado, ttsSecao])

  function lerAPartirDe(indice, pars) {
    if (!window.speechSynthesis) { setErro('Seu navegador não suporta Text-to-Speech.'); return }
    window.speechSynthesis.cancel()
    lendoRef.current = true
    paragrafosRef.current = pars || paragrafos
    setTtsAtivo(true); setTtsPausado(false); setParagrafoAtual(indice)
    lerProximo(indice, pars || paragrafos)
  }

  function lerProximo(indice, pars) {
    if (!lendoRef.current) return
    if (indice >= pars.length) { lendoRef.current = false; setTtsAtivo(false); setTtsPausado(false); setParagrafoAtual(-1); return }
    const utterance = new SpeechSynthesisUtterance(limparMarkdown(pars[indice]))
    utterance.lang = 'pt-BR'
    utterance.rate = velocidadeRef.current  // usa a velocidade atual
    utterance.pitch = 1.0
    const vozes = window.speechSynthesis.getVoices()
    const vozBR = vozes.find(v => v.lang === 'pt-BR') || vozes.find(v => v.lang.startsWith('pt'))
    if (vozBR) utterance.voice = vozBR
    setParagrafoAtual(indice)
    utterance.onend = () => { if (lendoRef.current) lerProximo(indice + 1, pars) }
    utterance.onerror = () => { lendoRef.current = false; setTtsAtivo(false); setTtsPausado(false); setParagrafoAtual(-1) }
    window.speechSynthesis.speak(utterance)
  }

  function pausarLeitura() { if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) { window.speechSynthesis.pause(); setTtsPausado(true) } }
  function continuarLeitura() { if (window.speechSynthesis.paused) { window.speechSynthesis.resume(); setTtsPausado(false) } }
  function pararLeitura() { lendoRef.current = false; window.speechSynthesis?.cancel(); setTtsAtivo(false); setTtsPausado(false); setParagrafoAtual(-1) }
  function handleClicarParagrafo(i, pars) { pararLeitura(); setTimeout(() => lerAPartirDe(i, pars), 100) }
  function mudarSecao(s) { pararLeitura(); setTtsSecao(s) }

  // Quando muda velocidade durante leitura, reinicia do parágrafo atual
function mudarVelocidade(novaVelocidade) {
    setVelocidadeTTS(novaVelocidade)
    velocidadeRef.current = novaVelocidade || 1.0
    if (ttsAtivo && !ttsPausado) {
      const indiceAtual = paragrafoAtual || 0
      const parsAtuais = paragrafosRef.current || []
      pararLeitura()
      setTimeout(() => lerAPartirDe(indiceAtual, parsAtuais), 150)
    }
  }

  async function handleTraduzir() {
    if (!texto.trim()) return
    setErro(null); setAviso(null); pararLeitura(); setProgressoBloco({ atual: 0, total: 0 })
    
    // Verifica se já traduziu este processo
    if (!isPro && !isAvulso && hashUltimoProcesso.current && ehMesmoProcesso(texto, hashUltimoProcesso.current)) {
      setErro('⚠️ Este texto parece ser parte do mesmo processo já traduzido. A versão gratuita permite apenas uma tradução por processo.')
      return
    }
    
    // Verifica tentativa de burlar o sistema
    if (!isPro && !isAvulso) {
      const verificacao = detectarTentativaBurla(texto, historicoHashes.current)
      if (verificacao.suspeito) {
        setErro('⚠️ ' + verificacao.motivo + ' Para desbloquear, faça login ou assine um plano.')
        return
      }
    }
    
    // Atualiza percentual de exibição
    const percentual = usuario ? 60 : 30
    
    if (!isPro && !isAvulso && texto.length > LIMITE_GRATUITO_CHARS) {
      setAviso(`Texto com ${texto.length.toLocaleString('pt-BR')} caracteres. Serão processados os primeiros ${LIMITE_GRATUITO_CHARS.toLocaleString('pt-BR')} e exibidos ${percentual}%.`)
    } else if (!isPro && !isAvulso) {
      setAviso(`Você receberá ${percentual}% da tradução. ${usuario ? 'Faça login para ver 60%' : 'Logue-se ou assine para ver mais'}.`)
    }
    
    setCarregando(true)
    try {
      const isLogado = !!usuario
      const data = await traduzirTexto(texto, isPro, isAvulso, isLogado, (atual, total) => setProgressoBloco({ atual, total }))
      setResultado(data)
      
      // Armazena o hash para evitar reuso
      hashUltimoProcesso.current = gerarHashProcesso(texto)
      if (historicoHashes.current.length >= 10) {
        historicoHashes.current.shift() // Remove mais antigo
      }
      historicoHashes.current.push(hashUltimoProcesso.current)
      
      if (!isPro && usuario) {
        const avulso = await verificarProcessoAvulso(supabase, usuario.id, hashUltimoProcesso.current)
        setIsAvulso(avulso)
      }
} catch (err) {
setErro(err.message || 'Erro ao traduzir. Tente novamente.')
    } finally {
      setCarregando(false); setProgressoBloco({ atual: 0, total: 0 })
    }
  }

  async function handleArquivo(e) {
    const file = e.target.files[0]; if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    setErro(null); setAviso(null); setNomeArquivo(file.name); setAba('arquivo')
    setCarregandoArquivo(true); setTexto(''); setResultado(null)
    hashUltimoProcesso.current = null; pararLeitura()
    try {
      let textoExtraido = ''
      if (ext === 'txt') textoExtraido = await file.text()
      else if (ext === 'pdf') { textoExtraido = await extrairTextoPDF(file); if (!textoExtraido) throw new Error('PDF sem texto legível.') }
      else if (ext === 'docx') { textoExtraido = await extrairTextoDOCX(file); if (!textoExtraido) throw new Error('Não foi possível extrair texto do DOCX.') }
      else throw new Error('Formato não suportado. Use PDF, DOCX ou TXT.')
      setTexto(textoExtraido)
      if (!isPro && !isAvulso && textoExtraido.length > LIMITE_GRATUITO_CHARS) {
        setAviso(`Arquivo com ${textoExtraido.length.toLocaleString('pt-BR')} caracteres. Serão processados os primeiros ${LIMITE_GRATUITO_CHARS.toLocaleString('pt-BR')} e exibidos 60%.`)
      }
    } catch (err) {
      setErro(err.message || 'Erro ao ler o arquivo.'); setNomeArquivo(null)
    } finally {
      setCarregandoArquivo(false); e.target.value = ''
    }
  }

  async function handleBaixarPDF() {
    if (!resultado || !podeBaixarPDF) return
    setBaixandoPDF(true)
    try { await baixarPDF(resultado.resumo, resultado.traducao, nomeArquivo) }
    catch (e) { setErro(e.message || 'Erro ao gerar PDF.') }
    finally { setBaixandoPDF(false) }
  }

  async function handlePagarAvulso() {
    if (!usuario) { setMostrarLogin(true); return }
    try { await iniciarPagamento({ tipo: 'avulso', usuarioId: usuario.id, usuarioEmail: usuario.email, processoHash: hashUltimoProcesso.current }) }
    catch (e) { setErro('Erro ao iniciar pagamento. Tente novamente.') }
  }

  async function handleAssinarPRO() {
    if (!usuario) { setMostrarLogin(true); return }
    try { await iniciarPagamento({ tipo: 'pro_mensal', usuarioId: usuario.id, usuarioEmail: usuario.email }) }
    catch (e) { setErro('Erro ao iniciar pagamento. Tente novamente.') }
  }

  async function handleAssinarPLUS() {
    if (!usuario) { setMostrarLogin(true); return }
    try { await iniciarPagamento({ tipo: 'plus_mensal', usuarioId: usuario.id, usuarioEmail: usuario.email }) }
    catch (e) { setErro('Erro ao iniciar pagamento. Tente novamente.') }
  }

  function limparTudo() {
    setTexto(''); setNomeArquivo(null); setAba('colar')
    setResultado(null); setErro(null); setAviso(null)
    hashUltimoProcesso.current = null; pararLeitura(); setIsAvulso(false)
  }

  const tribunaisSuperiores = [
    { nome: 'STF', url: 'https://portal.stf.jus.br' },
    { nome: 'STJ', url: 'https://www.stj.jus.br' },
    { nome: 'TST', url: 'https://www.tst.jus.br' },
    { nome: 'TSE', url: 'https://www.tse.jus.br' },
    { nome: 'CNJ', url: 'https://www.cnj.jus.br' },
  ]
  const tribunaisFederais = [
    { nome: 'TRF-1', url: 'https://www.trf1.jus.br' },
    { nome: 'TRF-2', url: 'https://www.trf2.jus.br' },
    { nome: 'TRF-3', url: 'https://www.trf3.jus.br' },
    { nome: 'TRF-4', url: 'https://www.trf4.jus.br' },
    { nome: 'TRF-5', url: 'https://www.trf5.jus.br' },
    { nome: 'TRF-6', url: 'https://www.trf6.jus.br' },
  ]
  const estados = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
  const urlsTJ = {
    AC:'https://www.tjac.jus.br',AL:'https://www.tjal.jus.br',AP:'https://www.tjap.jus.br',
    AM:'https://www.tjam.jus.br',BA:'https://www.tjba.jus.br',CE:'https://www.tjce.jus.br',
    DF:'https://www.tjdft.jus.br',ES:'https://www.tjes.jus.br',GO:'https://www.tjgo.jus.br',
    MA:'https://www.tjma.jus.br',MT:'https://www.tjmt.jus.br',MS:'https://www.tjms.jus.br',
    MG:'https://www.tjmg.jus.br',PA:'https://www.tjpa.jus.br',PB:'https://www.tjpb.jus.br',
    PR:'https://www.tjpr.jus.br',PE:'https://www.tjpe.jus.br',PI:'https://www.tjpi.jus.br',
    RJ:'https://www.tjrj.jus.br',RN:'https://www.tjrn.jus.br',RS:'https://www.tjrs.jus.br',
    RO:'https://www.tjro.jus.br',RR:'https://www.tjrr.jus.br',SC:'https://www.tjsc.jus.br',
    SP:'https://www.tjsp.jus.br',SE:'https://www.tjse.jus.br',TO:'https://www.tjto.jus.br'
  }

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", background: '#f0f2f5', minHeight: '100vh' }}>

      {/* HEADER */}
      <header style={{ background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #e8e8e8', position: 'sticky', top: 0, zIndex: 10, minHeight: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: '#1a2b4a', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#1aaa8a', fontSize: 17 }}>⚖</span>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2b4a', lineHeight: 1.1 }}>Juridiquês</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: '#1aaa8a', letterSpacing: '1.5px' }}>POPULAR</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {usuario ? (
            <>
              <div style={{ background: isPro ? '#f47820' : '#1aaa8a', color: '#fff', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {usuario.email[0].toUpperCase()}
              </div>
              {isPro && <span style={{ fontSize: 10, background: '#f47820', color: '#fff', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>PRO</span>}
              <button onClick={() => supabase.auth.signOut()} style={{ background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 8, padding: '7px 10px', fontWeight: 600, color: '#444', cursor: 'pointer', fontSize: 12 }}>Sair</button>
              {!isPro && <button onClick={handleAssinarPRO} style={{ background: '#f47820', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>🔥 PRO</button>}
            </>
          ) : (
            <>
              <button onClick={() => setMostrarLogin(true)} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: 8, padding: '7px 14px', fontWeight: 600, color: '#444', cursor: 'pointer', fontSize: 13 }}>Login</button>
              <button onClick={() => setMostrarPlanos(true)} style={{ background: '#f47820', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>🔥 PRO</button>
            </>
          )}
        </div>
      </header>

      {/* HERO */}
      <div style={{ background: '#fff', padding: '28px 16px 0', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#e6f9f4', border: '1px solid #b3edd9', borderRadius: 20, padding: '4px 12px', fontSize: 10, fontWeight: 600, color: '#0f7a5a', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1aaa8a', display: 'inline-block' }}></span>
          Tradução Jurídica Simplificada
        </div>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(28px,7vw,52px)', fontWeight: 900, color: '#1a2b4a', lineHeight: 1.15, margin: '0 0 8px' }}>
          Justiça em <span style={{ color: '#1aaa8a', display: 'block' }}>Linguagem Inclusiva</span>
        </h1>
        <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, margin: '10px auto 24px', maxWidth: 340 }}>
          Transforme textos jurídicos complexos em linguagem que qualquer pessoa entende.
        </p>

        <div style={{ background: '#1a2b4a', borderRadius: '20px 20px 0 0', padding: '18px 16px', margin: '0 -16px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button onClick={() => { setAba('colar'); setNomeArquivo(null); setAviso(null) }}
              style={{ flex: 1, background: aba === 'colar' ? '#fff' : 'transparent', border: aba === 'colar' ? 'none' : '1px solid #2d4060', borderRadius: 10, padding: '11px 0', fontSize: 12, fontWeight: 700, color: aba === 'colar' ? '#1a2b4a' : '#a0b0c8', cursor: 'pointer' }}>
              ✏️ COLAR TEXTO
            </button>
            <label style={{ flex: 1, background: aba === 'arquivo' ? '#fff' : 'transparent', border: aba === 'arquivo' ? 'none' : '1px solid #2d4060', borderRadius: 10, padding: '11px 0', fontSize: 12, fontWeight: 700, color: aba === 'arquivo' ? '#1a2b4a' : '#a0b0c8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {carregandoArquivo ? '⏳ Lendo...' : '📎 ANEXAR'}
              <input type="file" accept=".txt,.pdf,.docx" onChange={handleArquivo} style={{ display: 'none' }} />
            </label>
          </div>

          {nomeArquivo && !carregandoArquivo && (
            <div style={{ background: '#1aaa8a', borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{nomeArquivo.endsWith('.pdf') ? '📄' : nomeArquivo.endsWith('.docx') ? '📝' : '📃'}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeArquivo}</span>
              </div>
              <button onClick={limparTudo} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '4px 10px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✕ Limpar</button>
            </div>
          )}

          {carregandoArquivo && (
            <div style={{ background: '#243555', borderRadius: 10, padding: 20, marginBottom: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
              <div style={{ color: '#a0b0c8', fontSize: 13 }}>Lendo o arquivo...</div>
            </div>
          )}

          {aviso && !carregandoArquivo && (
            <div style={{ background: 'rgba(244,180,32,0.15)', border: '1px solid rgba(244,180,32,0.4)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#f0c040', fontWeight: 600, marginBottom: 4 }}>Aviso</div>
                <div style={{ fontSize: 12, color: '#c8a830', lineHeight: 1.5 }}>{aviso}</div>
              </div>
            </div>
          )}

          {!carregandoArquivo && (
            <textarea value={texto} onChange={e => { setTexto(e.target.value); setAviso(null) }}
              placeholder={aba === 'arquivo' && nomeArquivo ? 'Texto extraído. Você pode editar antes de traduzir.' : 'Cole aqui o texto do seu processo...'}
              style={{ width: '100%', background: '#243555', border: 'none', borderRadius: 12, padding: 16, fontSize: 15, color: '#e0e8f0', fontFamily: 'DM Sans,sans-serif', resize: 'none', boxSizing: 'border-box', outline: 'none', minHeight: 180, lineHeight: 1.6 }} />
          )}

          {!carregandoArquivo && (
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0', fontSize: 11, color: '#a0b0c8' }}>
              <span>{!isPro && !isAvulso && texto.length > LIMITE_GRATUITO_CHARS ? `⚠️ Primeiros ${LIMITE_GRATUITO_CHARS.toLocaleString('pt-BR')} serão processados` : 'STATUS'}</span>
              <span style={{ color: (!isPro && !isAvulso && texto.length > LIMITE_GRATUITO_CHARS) ? '#ff6b6b' : '#f47820', fontWeight: 700 }}>
                {texto.length.toLocaleString('pt-BR')} / {(isPro || isAvulso) ? '∞' : LIMITE_GRATUITO_CHARS.toLocaleString('pt-BR')}
              </span>
            </div>
          )}

          {carregando && progressoBloco.total > 1 ? (
            <div style={{ background: '#243555', borderRadius: 14, padding: 16, textAlign: 'center' }}>
              <div style={{ color: '#1aaa8a', fontWeight: 700, fontSize: 14, marginBottom: 10 }}>⚡ Traduzindo bloco {progressoBloco.atual} de {progressoBloco.total}...</div>
              <div style={{ background: '#1a2b4a', borderRadius: 8, height: 8, overflow: 'hidden' }}>
                <div style={{ background: '#1aaa8a', height: '100%', width: `${(progressoBloco.atual / progressoBloco.total) * 100}%`, transition: 'width 0.3s ease', borderRadius: 8 }} />
              </div>
              <div style={{ color: '#a0b0c8', fontSize: 12, marginTop: 8 }}>Traduzindo em {progressoBloco.total} partes para garantir fidelidade total</div>
            </div>
          ) : (
            <button onClick={handleTraduzir} disabled={carregando || carregandoArquivo || !texto.trim()}
              style={{ width: '100%', background: carregando ? '#0d7a5a' : '#1aaa8a', color: '#fff', border: 'none', borderRadius: 14, padding: '18px 0', fontSize: 16, fontWeight: 700, letterSpacing: '1px', cursor: 'pointer', textTransform: 'uppercase', opacity: (!texto.trim() || carregandoArquivo) ? 0.5 : 1, touchAction: 'manipulation' }}>
              {carregando ? '⏳ Traduzindo...' : '⚡ TRADUZIR AGORA'}
            </button>
          )}
        </div>
      </div>

      {/* CARDS PLANOS — mostra para logados sem PLUS */}
      {usuario && !isPlus && (
        <div style={{ margin: '0 16px 16px' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '24px 18px', border: '1px solid #e8e8e8', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#f47820', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
                {isPro ? '✨ Faça upgrade' : 'Planos Exclusivos'}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1a2b4a' }}>
                {isPro ? 'Acesse a Assistente Ana' : 'Desbloqueie todo o potencial'}
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                {isPro ? 'Tire dúvidas sobre seu documento com a Ana' : 'Escolha o plano ideal para você'}
              </div>
            </div>

            {/* Cards lado a lado ou só PLUS para PRO */}
            <div style={{ display: 'flex', gap: 12 }}>
              {/* Só mostra PRO se não tem PRO */}
              {!isPro && (
                <div style={{ flex: 1, background: '#fff7f0', border: '2px solid #f47820', borderRadius: 18, padding: '18px 14px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: '#f47820', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap' }}>⭐ MAIS POPULAR</div>
                  <div style={{ textAlign: 'center', marginBottom: 14 }}>
                    <div style={{ fontSize: 22 }}>🔥</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#f47820', marginTop: 4 }}>PRO</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#1a2b4a', marginTop: 2 }}>R$ 5,00</div>
                    <div style={{ fontSize: 10, color: '#888' }}>/mês</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#555', lineHeight: 1.7, marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ color: '#1aaa8a', fontWeight: 700 }}>✓</span> Tradução ilimitada
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ color: '#1aaa8a', fontWeight: 700 }}>✓</span> Download em PDF
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ color: '#1aaa8a', fontWeight: 700 }}>✓</span> Ouvir em voz
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#1aaa8a', fontWeight: 700 }}>✓</span> Processos ilimitados
                    </div>
                  </div>
                  <button onClick={handleAssinarPRO} style={{ width: '100%', background: '#f47820', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>
                    🔥 ASSINAR
                  </button>
                </div>
              )}

              {/* Card PLUS+ */}
              <div style={{ flex: 1, background: '#f0f4ff', border: '2px solid #1a2b4a', borderRadius: 18, padding: '18px 14px' }}>
                <div style={{ textAlign: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 22 }}>⭐</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#1a2b4a', marginTop: 4 }}>PLUS+</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#1a2b4a', marginTop: 2 }}>R$ 5,00</div>
                  <div style={{ fontSize: 10, color: '#888' }}>/mês</div>
                </div>
                <div style={{ fontSize: 11, color: '#555', lineHeight: 1.7, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ color: '#1aaa8a', fontWeight: 700 }}>✓</span> {isPro ? 'Tudo do PRO' : 'Tudo do plano PRO'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ color: '#1aaa8a', fontWeight: 700 }}>✓</span> Assistente Ana
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ color: '#1aaa8a', fontWeight: 700 }}>✓</span> Tire dúvidas
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#1aaa8a', fontWeight: 700 }}>✓</span> Prioridade suporte
                  </div>
                </div>
                <button onClick={handleAssinarPLUS} style={{ width: '100%', background: '#1a2b4a', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>
                  ⭐ ASSINAR
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 10, color: '#aaa' }}>
              🔒 Pagamento seguro via Mercado Pago • Cancele quando quiser
            </div>
          </div>
        </div>
      )}

      {/* ERRO */}
      {erro && (
        <div style={{ margin: '16px', background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 12, padding: 14, color: '#cc0000', textAlign: 'center', fontSize: 14, lineHeight: 1.6 }}>
          {erro}
          {erro.includes('mesmo processo') && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={handlePagarAvulso} style={{ background: '#1aaa8a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>🔓 Pagar R${PRECO_AVULSO.toFixed(2).replace('.', ',')}</button>
              <button onClick={handleAssinarPRO} style={{ background: '#f47820', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>🔥 Assinar PRO</button>
            </div>
          )}
        </div>
      )}

      {/* RESULTADO */}
      {resultado && (
        <div style={{ margin: '16px' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, border: '1px solid #e8e8e8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ background: '#1aaa8a', color: '#fff', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>02</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1a2b4a', letterSpacing: 1, textTransform: 'uppercase' }}>Resumo do Processo</span>
            </div>
            <div style={{ background: '#1a2b4a', borderRadius: 12, padding: 16 }}>
              <TextoClicavel texto={resultado.resumo} podeOuvir={podeOuvir}
                onClicarParagrafo={(i, pars) => { mudarSecao('resumo'); handleClicarParagrafo(i, pars) }}
                paragrafoAtivo={ttsSecao === 'resumo' ? paragrafoAtual : -1}
                tocando={ttsAtivo && !ttsPausado} />
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, padding: 18, border: '1px solid #e8e8e8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ background: '#f47820', color: '#fff', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>03</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1a2b4a', letterSpacing: 1, textTransform: 'uppercase' }}>Tradução Popular</span>
              {resultado.travado
                ? <span style={{ fontSize: 11, color: '#f47820', fontWeight: 600 }}>🔒 60% — desbloqueie o restante</span>
                : <span style={{ fontSize: 11, color: '#1aaa8a', fontWeight: 600 }}>✅ Tradução completa e fiel</span>
              }
            </div>

            <div style={{ background: '#1a2b4a', borderRadius: 12, padding: 16, overflow: 'hidden', position: 'relative' }}>
              <TextoClicavel texto={resultado.traducao} podeOuvir={podeOuvir}
                onClicarParagrafo={(i, pars) => { mudarSecao('traducao'); handleClicarParagrafo(i, pars) }}
                paragrafoAtivo={ttsSecao === 'traducao' ? paragrafoAtual : -1}
                tocando={ttsAtivo && !ttsPausado} />
              {resultado.travado && <MuroConversao onVerPlanos={() => setMostrarPlanos(true)} onPagarAvulso={handlePagarAvulso} />}
            </div>

            {!resultado.travado && (
              <>
                {/* TTS */}
                <div style={{ marginTop: 14 }}>
                  {podeOuvir ? (
                    <div style={{ background: '#f0fdf8', border: '1px solid #b3edd9', borderRadius: 14, padding: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f7a5a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        🔊 CONTROLES DE LEITURA
                        {ttsAtivo && !ttsPausado && <span style={{ background: '#1aaa8a', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>▶ Reproduzindo</span>}
                        {ttsPausado && <span style={{ background: '#f47820', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>⏸ Pausado</span>}
                      </div>

                      {/* Seletor de seção */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <button onClick={() => mudarSecao('resumo')} style={{ flex: 1, background: ttsSecao === 'resumo' ? '#1aaa8a' : '#e6f9f4', color: ttsSecao === 'resumo' ? '#fff' : '#0f7a5a', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>📋 Resumo</button>
                        <button onClick={() => mudarSecao('traducao')} style={{ flex: 1, background: ttsSecao === 'traducao' ? '#1aaa8a' : '#e6f9f4', color: ttsSecao === 'traducao' ? '#fff' : '#0f7a5a', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>📄 Tradução</button>
                      </div>

                      {/* Play/Pause/Stop */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        {!ttsAtivo ? (
                          <button onClick={() => lerAPartirDe(0, ttsSecao === 'resumo' ? dividirParagrafos(resultado.resumo) : dividirParagrafos(resultado.traducao))}
                            style={{ flex: 1, background: '#1aaa8a', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>▶ OUVIR DO INÍCIO</button>
                        ) : ttsPausado ? (
                          <button onClick={continuarLeitura} style={{ flex: 1, background: '#1aaa8a', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>▶ CONTINUAR</button>
                        ) : (
                          <button onClick={pausarLeitura} style={{ flex: 1, background: '#f47820', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>⏸ PAUSAR</button>
                        )}
                        {ttsAtivo && <button onClick={pararLeitura} style={{ background: '#f5f5f5', color: '#666', border: '1px solid #e0e0e0', borderRadius: 10, padding: '13px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>⏹</button>}
                      </div>

                      {/* ===== VELOCIDADE DE LEITURA ===== */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, color: '#888', marginBottom: 8, fontWeight: 600, letterSpacing: 0.5 }}>VELOCIDADE DE LEITURA</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
  <button onClick={() => mudarVelocidade(1.0)}
    style={{
      flex: 1,
      background: velocidadeTTS === 1.0 ? '#1aaa8a' : '#e6f9f4',
      color: velocidadeTTS === 1.0 ? '#fff' : '#0f7a5a',
      border: velocidadeTTS === 1.0 ? 'none' : '1px solid #b3edd9',
      borderRadius: 8, padding: '7px 0',
      fontSize: 12, fontWeight: 700,
      cursor: 'pointer', touchAction: 'manipulation',
      minWidth: 44
    }}>
    Normal
  </button>
  <button onClick={() => mudarVelocidade(1.5)}
    style={{
      flex: 1,
      background: velocidadeTTS === 1.5 ? '#1aaa8a' : '#e6f9f4',
      color: velocidadeTTS === 1.5 ? '#fff' : '#0f7a5a',
      border: velocidadeTTS === 1.5 ? 'none' : '1px solid #b3edd9',
      borderRadius: 8, padding: '7px 0',
      fontSize: 12, fontWeight: 700,
      cursor: 'pointer', touchAction: 'manipulation',
      minWidth: 44
    }}>
    1.5x
  </button>
  <button onClick={() => mudarVelocidade(2.0)}
    style={{
      flex: 1,
      background: velocidadeTTS === 2.0 ? '#1aaa8a' : '#e6f9f4',
      color: velocidadeTTS === 2.0 ? '#fff' : '#0f7a5a',
      border: velocidadeTTS === 2.0 ? 'none' : '1px solid #b3edd9',
      borderRadius: 8, padding: '7px 0',
      fontSize: 12, fontWeight: 700,
      cursor: 'pointer', touchAction: 'manipulation',
      minWidth: 44
    }}>
    2.0x
  </button>
</div>
                        </div>
                      </div>

                      {ttsAtivo && paragrafoAtual >= 0 && (
                        <div style={{ background: 'rgba(26,170,138,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#0f7a5a' }}>
                          📍 Lendo parágrafo {paragrafoAtual + 1} de {paragrafos.length} — toque num parágrafo para pular
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: '#888', marginTop: 8, textAlign: 'center' }}>
                        Voz pt-BR · Toque num parágrafo para iniciar a partir dele
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setMostrarPlanos(true)} style={{ width: '100%', background: '#f5f5f5', color: '#888', border: '2px dashed #e0e0e0', borderRadius: 12, padding: '15px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>
                      🔒 OUVIR EM VOZ — exclusivo PRO
                    </button>
                  )}
                </div>

                {/* Download PDF */}
                <div style={{ marginTop: 10 }}>
                  {podeBaixarPDF ? (
                    <button onClick={handleBaixarPDF} disabled={baixandoPDF} style={{ width: '100%', background: baixandoPDF ? '#0d7a5a' : '#1a2b4a', color: '#fff', border: 'none', borderRadius: 12, padding: '15px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: baixandoPDF ? 0.7 : 1, touchAction: 'manipulation' }}>
                      {baixandoPDF ? '⏳ Gerando PDF...' : '📥 BAIXAR TRADUÇÃO COMPLETA EM PDF'}
                    </button>
                  ) : (
                    <button onClick={() => setMostrarPlanos(true)} style={{ width: '100%', background: '#f5f5f5', color: '#888', border: '2px dashed #e0e0e0', borderRadius: 12, padding: '15px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>
                      🔒 BAIXAR PDF — exclusivo PRO
                    </button>
                  )}
                </div>

                {/* Assistente Ana - apenas PLUS+ */}
                {isPlus && resultado && (
                  <div style={{ marginTop: 14 }}>
                    <AssistenteAna 
                      textoOriginal={texto} 
                      resumo={resultado.resumo} 
                      traducao={resultado.traducao} 
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* TRIBUNAIS */}
      <div style={{ padding: '24px 16px', background: '#f0f2f5' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ background: '#fff', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e0e0e0', fontSize: 15, flexShrink: 0 }}>🔗</div>
          <strong style={{ fontSize: 12, fontWeight: 700, color: '#1a2b4a', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Acesso Rápido aos Tribunais</strong>
        </div>
        <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', marginLeft: 44, marginBottom: 18 }}>Consulte diretamente na fonte</div>
        <div style={{ background: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, border: '1px solid #e8e8e8' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Justiça Superior</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tribunaisSuperiores.map(t => <a key={t.nome} href={t.url} target="_blank" rel="noreferrer" style={{ background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 20, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#1a2b4a', textDecoration: 'none' }}>{t.nome}</a>)}
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, border: '1px solid #e8e8e8' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Justiça Federal</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tribunaisFederais.map(t => <a key={t.nome} href={t.url} target="_blank" rel="noreferrer" style={{ background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 20, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#1a2b4a', textDecoration: 'none' }}>{t.nome}</a>)}
          </div>
        </div>
        <div style={{ background: '#1a2b4a', borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ background: 'rgba(26,170,138,0.2)', borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 17 }}>📌</div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 14, fontWeight: 700, color: '#fff', display: 'block', marginBottom: 2 }}>Tribunais Estaduais (TJs)</strong>
              <span style={{ fontSize: 12, color: '#a0b0c8' }}>Selecione seu estado</span>
              <select onChange={e => { if (e.target.value && urlsTJ[e.target.value]) window.open(urlsTJ[e.target.value], '_blank') }}
                style={{ width: '100%', background: '#243555', border: 'none', borderRadius: 10, padding: '14px 16px', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', outline: 'none', marginTop: 10, appearance: 'none' }}>
                <option value="">SELECIONAR ESTADO</option>
                {estados.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '18px 16px', fontSize: 10, fontWeight: 600, color: '#aaa', letterSpacing: 1, textTransform: 'uppercase', lineHeight: 1.8 }}>
        Aviso: Tradução feita por inteligência artificial.<br />Não substitui aconselhamento jurídico profissional.
      </div>

      <footer style={{ background: '#fff', padding: '20px 16px', textAlign: 'center', borderTop: '1px solid #e8e8e8' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ background: '#1a2b4a', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#1aaa8a', fontSize: 15 }}>⚖</span>
          </div>
          <div>
            <strong style={{ fontSize: 14, fontWeight: 600, color: '#1a2b4a', display: 'block' }}>Juridiquês Popular</strong>
            <span style={{ fontSize: 11, color: '#888' }}>Tornando o direito acessível a todos</span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: 13, color: '#555', marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ cursor: 'pointer' }}>Termos de Uso</span>
          <span style={{ cursor: 'pointer' }}>Privacidade</span>
          <span style={{ cursor: 'pointer' }}>Contato</span>
        </div>
        <div style={{ fontSize: 12, color: '#888' }}>Feito com ❤️ no Brasil</div>
      </footer>

      {mostrarLogin && <ModalLogin onClose={() => setMostrarLogin(false)} />}
      {mostrarPlanos && <ModalPlanos onClose={() => setMostrarPlanos(false)} usuario={usuario} onAbrirLogin={() => setMostrarLogin(true)} />}
    </div>
  )
}