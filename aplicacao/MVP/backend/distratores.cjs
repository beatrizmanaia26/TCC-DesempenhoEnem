const { spawn } = require('node:child_process')
const { createInterface } = require('node:readline')
const fs = require('node:fs/promises')
const path = require('node:path')

// CSV com separador ponto e vírgula, campos entre aspas e BOM UTF-8.
function lerCsv(texto, colunas) {
  const linhas = []
  let linha = [], campo = '', aspas = false
  texto = texto.replace(/^\uFEFF/, '')
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (c === '"') {
      if (aspas && texto[i + 1] === '"') { campo += '"'; i++ }
      else aspas = !aspas
    } else if (c === ';' && !aspas) { linha.push(campo); campo = '' }
    else if ((c === '\n' || c === '\r') && !aspas) {
      if (c === '\r' && texto[i + 1] === '\n') i++
      linha.push(campo)
      if (linha.some(v => v.trim())) linhas.push(linha)
      linha = []; campo = ''
    } else campo += c
  }
  if (aspas) throw new Error('Campo CSV com aspas não fechadas')
  linha.push(campo)
  if (linha.some(v => v.trim())) linhas.push(linha)
  const cabecalho = (linhas.shift() || []).map(v => v.trim())
  const obrigatorias = ['ano','cor','area','questao','idioma','codigo_prova','gabarito','distrator','taxa_escolha_distrator','taxa_escolha_correta','similaridade_com_correta', ...['AB','AC','AD','AE','BC','BD','BE','CD','CE','DE'].map(p => `sim_${p}`)]
  if ((colunas ?? obrigatorias).some(c => !cabecalho.includes(c))) throw new Error('Colunas obrigatórias ausentes no CSV de distratores')
  return linhas.map((valores, i) => {
    if (valores.length !== cabecalho.length) throw new Error(`Quantidade de colunas inválida na linha ${i + 2}`)
    return Object.fromEntries(cabecalho.map((nome, j) => [nome, valores[j].trim()]))
  })
}
function numero(valor, minimo, maximo) {
  if (valor === '' || valor == null) throw new Error('Valor numérico ausente no CSV')
  const n = Number(valor)
  // Produtos de embeddings podem exceder 1 por erro numérico (~1e-7).
  const tolerancia = minimo === -1 && maximo === 1 ? 1e-6 : 0
  if (!Number.isFinite(n) || n < minimo - tolerancia || n > maximo + tolerancia) throw new Error(`Valor numérico fora do intervalo: ${valor}`)
  return Math.min(maximo, Math.max(minimo, n))
}
function agruparQuestoes(linhas, ano) {
  const grupos = new Map()
  const letras = ['A','B','C','D','E']
  for (const r of linhas) {
    if (Number(r.ano) !== ano) continue
    const posicao = numero(r.questao, 1, 180)
    if (!Number.isInteger(posicao) || !['LC','CH','CN','MT'].includes(r.area)) throw new Error('Questão ou área inválida')
    if (!letras.includes(r.gabarito) || !letras.includes(r.distrator) || r.distrator === r.gabarito) throw new Error('Gabarito/distrator inválido')
    const id = JSON.stringify([ano,r.codigo_prova,r.cor,r.area,posicao,r.idioma])
    if (!grupos.has(id)) {
      const similaridades = Object.fromEntries(['AB','AC','AD','AE','BC','BD','BE','CD','CE','DE'].map(par => [par, numero(r[`sim_${par}`], -1, 1)]))
      grupos.set(id, { id, ano, cor:r.cor, area:r.area, posicao, idioma:r.idioma, codigo_prova:r.codigo_prova,
        dia:['LC','CH'].includes(r.area) ? 1 : 2, gabarito:r.gabarito,
        taxa_correta:numero(r.taxa_escolha_correta,0,1), similaridades, distratores:[] })
    }
    const q = grupos.get(id)
    if (q.gabarito !== r.gabarito || Math.abs(q.taxa_correta - Number(r.taxa_escolha_correta)) > 1e-9 || q.distratores.some(d => d.letra === r.distrator)) throw new Error('Linhas inconsistentes ou duplicadas para uma questão')
    for (const [par,v] of Object.entries(q.similaridades)) if (Math.abs(v - numero(r[`sim_${par}`],-1,1)) > 1e-9) throw new Error('Similaridades inconsistentes na questão')
    const similaridade = numero(r.similaridade_com_correta,-1,1)
    const par = [r.gabarito,r.distrator].sort().join('')
    if (Math.abs(similaridade-q.similaridades[par]) > 1e-6) throw new Error('Similaridade do distrator diverge da matriz')
    q.distratores.push({letra:r.distrator, taxa:numero(r.taxa_escolha_distrator,0,1), similaridade})
  }
  for (const q of grupos.values()) {
    if (q.distratores.length !== 4) throw new Error('Questão sem os quatro distratores')
    q.distratores.sort((a,b)=>a.letra.localeCompare(b.letra))
    q.similaridade_media = q.distratores.reduce((s,d)=>s+d.similaridade,0)/4
    q.similaridade_maxima = Math.max(...q.distratores.map(d=>d.similaridade))
  }
  return [...grupos.values()].sort((a,b)=>a.cor.localeCompare(b.cor)||a.posicao-b.posicao||a.idioma.localeCompare(b.idioma))
}
function registrarDistratores(app, arquivo) {
  const configurado = arquivo || process.env.DISTRATORES_CSV || '../../../outputs/similaridade_distratores/base_distratores.csv'
  const caminho = path.resolve(__dirname, configurado)
  const caminhoCorrelacoes = path.resolve(__dirname, process.env.DISTRATORES_CORRELACOES_CSV
    || '../../../outputs/metricas/distratores/correlacoes_distratores.csv')
  app.get('/api/metricas/distratores/correlacoes', async (req, res) => {
    const ano = String(req.query.ano || '')
    if (!/^20\d{2}$/.test(ano)) return res.status(400).json({ error: 'Informe um ano válido (ex.: 2020).' })
    try {
      const colunas = ['nivel', 'ano', 'area', 'variavel', 'n', 'spearman_rho', 'spearman_p', 'spearman_p_holm']
      const linhas = lerCsv(await fs.readFile(caminhoCorrelacoes, 'utf8'), colunas)
      const correlacoes = linhas.filter(r => r.nivel === 'ano_area' && Number(r.ano) === Number(ano))
        .map(r => ({
          area: r.area,
          variavel: r.variavel,
          n: numero(r.n, 0, Infinity),
          spearman_rho: r.spearman_rho === '' ? null : numero(r.spearman_rho, -1, 1),
          spearman_p: r.spearman_p === '' ? null : numero(r.spearman_p, 0, 1),
          spearman_p_holm: r.spearman_p_holm === '' ? null : numero(r.spearman_p_holm, 0, 1),
        }))
      res.json({ ano: Number(ano), correlacoes })
    } catch (error) {
      console.error('Erro ao carregar correlações dos distratores:', caminhoCorrelacoes, error)
      res.status(500).json({ error: 'Não foi possível ler o CSV de correlações dos distratores.' })
    }
  })
  app.get('/api/metricas/distratores', async (req,res) => {
    if (!/^20\d{2}$/.test(String(req.query.ano || ''))) return res.status(400).json({error:'Informe um ano válido (ex.: 2020).'})
    try {
      const ano = Number(req.query.ano)
      const questoes = agruparQuestoes(lerCsv(await fs.readFile(caminho,'utf8')), ano)
      if (!questoes.length) return res.status(404).json({error:`Sem dados de distratores para ${ano}.`})
      res.json({ano, total_questoes:questoes.length, total_distratores:questoes.length*4, questoes})
    } catch(error) {
      console.error('Erro ao carregar distratores:', caminho, error)
      res.status(500).json({error:error.code === 'ENOENT' ? 'CSV de distratores não encontrado. Confira DISTRATORES_CSV no .env do backend.' : 'Não foi possível ler os dados de distratores. Consulte o terminal do backend.'})
    }
  })
}

const TEMPO_LIMITE_MS = 15 * 60_000
const TEMPO_OCIOSO_MS = 5 * 60_000
let worker
let fila = Promise.resolve()
let aquecendo = false

function iniciarWorker() {
  const python = process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3')
  const script = path.join(__dirname, '../../../codigo/analise/modelo_similaridade_distratores.py')
  const processo = spawn(python, ['-X', 'utf8', '-X', 'faulthandler', '-B', script, '--worker'])
  const estado = { processo, pedido: null, ocioso: null }
  let diagnostico = ''

  function encerrar(erro) {
    if (worker === estado) worker = undefined
    clearTimeout(estado.ocioso)
    estado.pedido?.rejeitar(erro)
  }

  processo.stderr.setEncoding('utf8').on('data', trecho => {
    diagnostico = (diagnostico + trecho).slice(-4000)
  })
  processo.on('error', encerrar)
  processo.stdin.on('error', erro => {
    encerrar(erro)
    processo.kill()
  })
  processo.on('close', (codigo, sinal) => {
    encerrar(new Error(`Python encerrou com ${sinal ?? codigo}. ${diagnostico.trim()}`))
  })
  createInterface({ input: processo.stdout }).on('line', linha => {
    try {
      estado.pedido?.resolver(JSON.parse(linha))
    } catch (erro) {
      encerrar(erro)
      processo.kill()
    }
  })
  return estado
}

async function calcular(textos) {
  const estado = worker ??= iniciarWorker()
  clearTimeout(estado.ocioso)
  let limite
  try {
    return await new Promise((resolver, rejeitar) => {
      estado.pedido = { resolver, rejeitar }
      limite = setTimeout(() => {
        if (worker === estado) worker = undefined
        estado.processo.kill()
        rejeitar(Object.assign(new Error('O cálculo de similaridade excedeu o tempo limite.'), { status: 504 }))
      }, TEMPO_LIMITE_MS)
      estado.processo.stdin.write(JSON.stringify(textos) + '\n')
    })
  } finally {
    clearTimeout(limite)
    estado.pedido = null
    if (worker === estado) renovarPrazoOcioso(estado)
  }
}

function renovarPrazoOcioso(estado) {
  clearTimeout(estado.ocioso)
  estado.ocioso = setTimeout(() => {
    worker = undefined
    estado.processo.stdin.end()
  }, TEMPO_OCIOSO_MS)
  estado.ocioso.unref()
}

function aquecerModeloSimilaridade() {
  if (worker) {
    if (!worker.pedido) renovarPrazoOcioso(worker)
    return
  }
  if (aquecendo) return
  aquecendo = true
  fila = fila.then(async () => {
    try {
      if (!worker) await calcular(null)
    } catch (erro) {
      console.warn('Erro ao preparar o modelo de similaridade:', erro.message)
    } finally {
      aquecendo = false
    }
  })
}

// Uma quantidade continua sendo numérica quando vem com unidades ou símbolos.
const UNIDADES = /\b(?:mm|cm|km|m|mg|kg|g|ml|l|ma|a|mv|kv|v|kw|w|wh|kwh|mw|hz|khz|mhz|s|ms|min|h|mol|pa|kpa|mpa|atm|cal|kcal|kj|j|n|kn|c|f|reais|centavos?|(?:quilo|centí|mili)?metros?|(?:quilo|mili)?gramas?|(?:mili)?litros?|segundos?|minutos?|horas?|dias?|meses|anos?|graus)\b/giu
const ALGARISMOS_ROMANOS = /^(?:I|II|III|IV|V|VI|VII|VIII|IX|X)(?:\s*(?:,|;|e|ou)\s*(?:I|II|III|IV|V|VI|VII|VIII|IX|X))*$/u

function alternativaNumerica(texto) {
  if (ALGARISMOS_ROMANOS.test(texto)) return true
  if (!/\p{N}/u.test(texto)) return false
  const semUnidades = texto.replace(/[ºª]/gu, '').normalize('NFKC')
    .replace(/R\$/giu, '')
    .replace(/[πΠ]/gu, '')
    .replace(/(?<=\d)e(?=[+-]?\d)/giu, '')
    .replace(/(?<=\d)\s*(?=\p{L})/gu, ' ')
    .replace(UNIDADES, '')
    .replace(/\b(?:vezes|por|de|a|até)\b/giu, '')
  return !/\p{L}/u.test(semUnidades) ||
    (/[=+*/^−×÷]/u.test(semUnidades) && !/\p{L}{2,}/u.test(semUnidades))
}

const REPRESENTACAO_VISUAL = /(?:gr[aá]ficos?|diagramas?|esquemas?|figuras?|imagens?|mapas?|heredogramas?|vetor(?:es)?|circuitos?|projeç(?:ão|ões)\s+ortogona(?:l|is))/.source
const PEDIDO_VISUAL = new RegExp(
  `(?:\\bqu(?:al|ais)\\s+(?:(?:dos|das)\\s+)?${REPRESENTACAO_VISUAL}\\b[^?]*\\?\\s*$|` +
  `(?:^|[,.!?]\\s+|\\n)\\s*[oa]s?\\s+(?:tipo\\s+de\\s+)?${REPRESENTACAO_VISUAL},?\\s+(?:que\\b|correspondente\\b|sobre\\b)[^?]*?\\s(?:é|são|está)\\s*[:.]?\\s*$)`,
  'iu',
)

function inferirAlternativasGraficas(texto, textos) {
  if (typeof texto !== 'string') return false
  // O campo texto pode conter as alternativas depois do comando da questão.
  const primeiroMarcador = [...texto.matchAll(/^\s*A(?:\s*$|\t|[.)]\s+| {2,})/gm)].at(-1)
  const comando = texto.slice(0, primeiroMarcador?.index ?? texto.length).trim().slice(-450)
  if (!PEDIDO_VISUAL.test(comando)) return false

  // Gráficos vetoriais podem deixar só números ou rótulos de eixos no PDF.
  return textos.every(opcao => !opcao || alternativaNumerica(opcao) ||
    /^(?:[xy](?:\s*\([^)]{1,12}\))?|[ft]\s*\([xt]\)|(?:gr[aá]fico|figura|esquema)\s*[1-9ivx]+)\.?$/iu.test(opcao))
}

function registrarSimilaridadeProva(app, json) {
  app.post('/api/similaridade-prova', json, (req, res) => {
    const { alternativas, alternativas_graficas, texto } = req.body ?? {}
    if (!Array.isArray(alternativas) || alternativas.length > 26 ||
        !alternativas.every(item => item && typeof item.texto === 'string')) {
      return res.status(400).json({ error: 'Envie os textos de até 26 alternativas da questão.' })
    }

    const textos = alternativas.map(item => item.texto.trim())
    if (alternativas_graficas === true || alternativas.some(item => item.tem_imagem === true) ||
        (alternativas_graficas == null && inferirAlternativasGraficas(texto, textos))) {
      return res.json({ exclusao: 'grafica' })
    }
    if (textos.length < 2 || textos.some(texto => !texto)) {
      return res.json({ exclusao: 'texto-incompleto' })
    }
    if (textos.some(alternativaNumerica)) {
      return res.json({ exclusao: 'numerica' })
    }

    fila = fila.then(async () => {
      if (res.destroyed) return
      try {
        const matriz = await calcular(textos)
        if (!res.destroyed) res.json({ matriz })
      } catch (erro) {
        console.error('Erro ao calcular similaridade da prova:', erro.message)
        if (!res.destroyed) {
          res.status(erro.status ?? 500).json({
            error: erro.status === 504 ? erro.message : 'Não foi possível calcular a similaridade com o modelo do ENEM.'
          })
        }
      }
    })
  })
}

module.exports = {
  registrarDistratores,
  lerCsv,
  agruparQuestoes,
  aquecerModeloSimilaridade,
  registrarSimilaridadeProva,
}
