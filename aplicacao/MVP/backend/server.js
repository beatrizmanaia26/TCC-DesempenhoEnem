// backend/server.js
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const multer = require('multer')
const path = require('node:path')
const fs = require('node:fs')
const { spawn } = require('node:child_process')
const { v4: uuidv4 } = require('uuid')

// Framework Express para criar servidor HTTP
const app = express()
const port = process.env.PORT || 3001

// Remover header X-Powered-By para ocultar versao do Express (S5689)
app.disable('x-powered-by')

// Configuração de upload
const uploadDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  }
})

// Limites de seguranca para evitar ataques DoS
// 10MB é um limite razoável para arquivos de prova PDF/JSON
// Reduzido de 100MB para melhor seguranca (S5693)
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const upload = multer({
  storage,
  // NOSONAR: Limite de tamanho é intencionalmente 10MB para segurança
  limits: { 
    fileSize: MAX_FILE_SIZE,
    contentLength: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/json']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Apenas arquivos PDF e JSON sao permitidos'))
    }
  }
})

// Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}))
app.use(express.json())

// Rota de teste
app.get('/api', (req, res) => {
  res.json({ mensagem: 'Backend está funcionando!' })
})

// Extrai questões de um PDF e devolve a lista em JSON
app.post('/api/extract', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo foi enviado' })
  }

  if (path.extname(req.file.originalname).toLowerCase() !== '.pdf') {
    fs.unlink(req.file.path, () => {})
    return res.status(400).json({ error: 'Envie um arquivo PDF' })
  }

  const pythonPath = process.env.PYTHON_PATH || 'python3'
  const pythonScript = path.join(__dirname, '../../../codigo/extract/extracao_enem.py')
  const pythonProcess = spawn(pythonPath, [pythonScript, req.file.path, '--stdout-json'])
  let output = ''
  let errorOutput = ''

  pythonProcess.stdout.on('data', (data) => { output += data.toString() })
  pythonProcess.stderr.on('data', (data) => { errorOutput += data.toString() })
  pythonProcess.on('error', (error) => {
    fs.unlink(req.file.path, () => {})
    res.status(500).json({ error: `Não foi possível iniciar o Python: ${error.message}` })
  })
  pythonProcess.on('close', (code) => {
    fs.unlink(req.file.path, () => {})
    if (res.headersSent) return
    if (code !== 0) {
      return res.status(500).json({ error: 'Falha ao extrair o PDF', details: errorOutput.trim() })
    }
    try {
      const extracted = JSON.parse(output)
      res.json({
        fileName: req.file.originalname,
        questions: extracted.questoes,
        textos_introdutorios: extracted.textos_introdutorios
      })
    } catch (error) {
      res.status(500).json({ error: `Resposta inválida do extrator: ${error.message}` })
    }
  })
})

// Métricas de tempo de leitura por questão
// Velocidade de leitura padrão (caracteres/minuto) - Referência: Messias et al., 2008
const VELOCIDADE_LEITURA_CPM = 1100
// CSV gerado por codigo/analise/metricas_tempo.py: todas as entradas do JSON, sem deduplicar.
// Questões 1-5 aparecem duas vezes (idioma 'inglês' e 'espanhol') quando existem as duas versões.
const QUESTOES_TEMPO_CSV = path.join(__dirname, '../../../outputs/metricas/tempo/tempo_leitura_questoes_grafico.csv')
let questoesTempoCache = null

// Dificuldade (dificuldade_tri) de cada questão, da tabela de desempenho por prova.
// Só o caderno Azul de cada ano. Os co_prova são os mesmos de CODIGOS_AZUIS em codigo/analise/metricas_tempo.py.
const DESEMPENHO_CSV = path.join(__dirname, '../../../outputs/ordem/desempenho_questoes_por_prova.csv')
const CODIGOS_AZUIS_POR_ANO = {
  2020: { CN: 597, CH: 567, LC: 577, MT: 587 },
  2022: { CN: 1085, CH: 1055, LC: 1065, MT: 1075 },
  2023: { CN: 1221, CH: 1191, LC: 1201, MT: 1211 },
  2024: { CN: 1419, CH: 1383, LC: 1395, MT: 1407 },
  2025: { CN: 1483, CH: 1447, LC: 1459, MT: 1471 }
}
let dificuldadesAzulCache = null

// Chave "ano-posição" -> 'facil' | 'media' | 'dificil', ou null quando a planilha não tem o parâmetro b
function carregarDificuldadesAzul() {
  if (dificuldadesAzulCache) {
    return dificuldadesAzulCache
  }

  // A planilha tem BOM UTF-8: remover antes de ler o cabeçalho
  const linhas = fs.readFileSync(DESEMPENHO_CSV, 'utf-8').replace(/^\uFEFF/, '').trim().split(/\r?\n/)
  const cabecalho = linhas.shift().split(',')
  const indice = Object.fromEntries(cabecalho.map((nome, i) => [nome, i]))

  dificuldadesAzulCache = new Map()
  linhas.forEach((linha) => {
    const colunas = linha.split(',')
    const ano = Number(colunas[indice.ano])
    const codigosAzuis = Object.values(CODIGOS_AZUIS_POR_ANO[ano] ?? {})
    if (!codigosAzuis.includes(Number(colunas[indice.co_prova]))) return

    const chave = `${ano}-${colunas[indice.posicao_prova]}`
    const dificuldade = colunas[indice.dificuldade_tri] || null
    if (!dificuldadesAzulCache.get(chave)) {
      dificuldadesAzulCache.set(chave, dificuldade)
    }
  })

  return dificuldadesAzulCache
}

// Área do ENEM pela posição da questão (1-45 LC, 46-90 CH, 91-135 CN, 136-180 MT)
function areaDaPosicao(posicao) {
  if (posicao <= 45) return 'LC'
  if (posicao <= 90) return 'CH'
  if (posicao <= 135) return 'CN'
  return 'MT'
}
 
// Carrega o CSV uma única vez. Cada linha vira uma barra do gráfico.
function carregarQuestoesTempo() {
  if (questoesTempoCache) {
    return questoesTempoCache
  }

  const linhas = fs.readFileSync(QUESTOES_TEMPO_CSV, 'utf-8').trim().split(/\r?\n/)
  const cabecalho = linhas.shift().split(',')
  const indice = Object.fromEntries(cabecalho.map((nome, i) => [nome, i]))

  questoesTempoCache = linhas.map((linha) => {
    const colunas = linha.split(',')
    const posicao = Number(colunas[indice.posicao_prova])
    const idioma = colunas[indice.idioma]
    const caracteres = Number(colunas[indice.caracteres])

    return {
      ano: Number(colunas[indice.ano]),
      dia: Number(colunas[indice.dia]),
      posicao,
      idioma,
      area: areaDaPosicao(posicao),
      rotulo: `Q${posicao}`,
      caracteres,
      tempo_leitura_minutos: Math.round((caracteres / VELOCIDADE_LEITURA_CPM) * 100) / 100
    }
  })

  return questoesTempoCache
}

// Cores de caderno por ano e dia, na ordem dos códigos (Azul, Amarelo, Branco/Cinza, Rosa/Verde).
// Os códigos são os de CODIGOS_REGULARES em tabela_base.py. Em 2024 e 2025 a última cor é verde.
const CORES_POR_ANO = {
  2020: ['Azul', 'Amarelo', 'Branco', 'Rosa'],
  2022: ['Azul', 'Amarelo', 'Branco', 'Rosa'],
  2023: ['Azul', 'Amarelo', 'Branco', 'Rosa'],
  2024: ['Azul', 'Amarelo', 'Branco', 'Verde'],
  2025: ['Azul', 'Amarelo', 'Branco', 'Verde']
}

// Nome usado na API para a cor 'Branco' (o frontend envia Branco; aceita também Cinza)
function normalizarCor(cor) {
  return cor === 'Cinza' ? 'Branco' : cor
}

// Primeiro código de cada área (o Azul); as cores seguem na ordem dos códigos seguintes
const CODIGO_AZUL_POR_ANO = {
  2020: { CN: 597, CH: 567, LC: 577, MT: 587 },
  2022: { CN: 1085, CH: 1055, LC: 1065, MT: 1075 },
  2023: { CN: 1221, CH: 1191, LC: 1201, MT: 1211 },
  2024: { CN: 1419, CH: 1383, LC: 1395, MT: 1407 },
  2025: { CN: 1483, CH: 1447, LC: 1459, MT: 1471 }
}

// Código (co_prova) de cada cor, por área, no ano informado
function codigoDaCor(ano, area, cor) {
  const indiceCor = CORES_POR_ANO[ano]?.indexOf(normalizarCor(cor)) ?? -1
  if (indiceCor < 0) return null
  return CODIGO_AZUL_POR_ANO[ano][area] + indiceCor
}

// Tempo de leitura das questões de todas as cores, a partir do tamanho em caracteres de cada item.
// Cada linha de metricas_caracteristicas_questao.csv é um item de um caderno (co_prova).
const CARACTERISTICAS_QUESTAO_CSV = path.join(__dirname, '../../../outputs/metricas/tempo/metricas_caracteristicas_questao.csv')
let caracteristicasQuestaoCache = null

function carregarCaracteristicasQuestao() {
  if (caracteristicasQuestaoCache) {
    return caracteristicasQuestaoCache
  }

  const linhas = fs.readFileSync(CARACTERISTICAS_QUESTAO_CSV, 'utf-8').replace(/^\uFEFF/, '').trim().split(/\r?\n/)
  const cabecalho = linhas.shift().split(',')
  const indice = Object.fromEntries(cabecalho.map((nome, i) => [nome, i]))

  caracteristicasQuestaoCache = linhas.map((linha) => {
    const colunas = linha.split(',')
    const posicao = Number(colunas[indice.posicao])
    const caracteres = Number(colunas[indice.caracteres])

    return {
      ano: Number(colunas[indice.ano]),
      dia: Number(colunas[indice.dia]),
      area: colunas[indice.area],
      co_prova: Number(colunas[indice.co_prova]),
      co_item: Number(colunas[indice.co_item]),
      posicao,
      rotulo: `Q${posicao}`,
      caracteres,
      tempo_leitura_minutos: Math.round((caracteres / VELOCIDADE_LEITURA_CPM) * 100) / 100,
      dificuldade_tri: colunas[indice.dificuldade_tri] || null
    }
  })

  return caracteristicasQuestaoCache
}

// Idioma de Q1 a Q5 de cada item (co_item), lido do gráfico Azul. Nas outras questões o idioma é 'geral'.
// O co_item é o mesmo em todas as cores, então o idioma vale para qualquer caderno.
let idiomaPorCoItemCache = null

function carregarIdiomaPorCoItem() {
  if (idiomaPorCoItemCache) {
    return idiomaPorCoItemCache
  }

  const caracteristicas = carregarCaracteristicasQuestao()
  const questoesAzul = caracteristicas.filter((questao) => CODIGO_AZUL_POR_ANO[questao.ano] && questao.co_prova === CODIGO_AZUL_POR_ANO[questao.ano][questao.area])
  const linhasAzulGrafico = carregarQuestoesTempo()

  idiomaPorCoItemCache = new Map()
  questoesAzul.forEach((questao) => {
    if (questao.posicao > 5) return
    const correspondente = linhasAzulGrafico.find(
      (linha) => linha.ano === questao.ano && linha.dia === questao.dia && linha.posicao === questao.posicao && linha.caracteres === questao.caracteres
    )
    if (correspondente && correspondente.idioma !== 'geral') {
      idiomaPorCoItemCache.set(questao.co_item, correspondente.idioma)
    }
  })

  return idiomaPorCoItemCache
}

app.get('/api/metricas/tempo-leitura-questoes', (req, res) => {
  try {
    const ano = Number(req.query.ano)
    if (!Number.isInteger(ano)) {
      return res.status(400).json({ error: 'Parâmetro "ano" é obrigatório' })
    }

    // Sem o parâmetro cor, usa o Azul, como antes
    const cor = req.query.cor ?? 'Azul'
    const areas = Object.keys(CODIGO_AZUL_POR_ANO[ano] ?? {})
    const codigosDaCor = new Set(areas.map((area) => codigoDaCor(ano, area, cor)))
    if (codigosDaCor.size === 0 || codigosDaCor.has(null)) {
      return res.status(400).json({ error: `Cor "${cor}" não existe no ano ${ano}` })
    }

    const dificuldades = carregarDificuldadesAzul()
    const idiomas = carregarIdiomaPorCoItem()
    const questoes = carregarCaracteristicasQuestao()
      .filter((questao) => questao.ano === ano && codigosDaCor.has(questao.co_prova))
      .map((questao) => ({
        ano: questao.ano,
        dia: questao.dia,
        posicao: questao.posicao,
        idioma: idiomas.get(questao.co_item) ?? 'geral',
        co_item: questao.co_item,
        area: questao.area,
        rotulo: questao.rotulo,
        caracteres: questao.caracteres,
        tempo_leitura_minutos: questao.tempo_leitura_minutos
      }))
      .sort((a, b) => a.dia - b.dia || a.posicao - b.posicao || a.co_item - b.co_item)
      .map((questao) => ({
        ...questao,
        dificuldade: dificuldades.get(`${ano}-${questao.posicao}`) ?? null
      }))

    if (questoes.length === 0) {
      return res.status(404).json({ error: `Sem dados para o ano ${ano}` })
    }

    res.json({
      ano,
      cor,
      total_questoes: questoes.length,
      questoes
    })
  } catch (error) {
    console.error('Erro ao carregar métricas de tempo de leitura:', error)
    res.status(500).json({ error: error.message })
  }
})

// Resumo do tempo da prova por dia: leitura das questões, textos introdutórios e restante
// CSV gerado por codigo/analise/metricas_tempo.py: uma linha por área (LC, CH, CN, MT)
const RESUMO_TEMPO_CSV = path.join(__dirname, '../../../outputs/metricas/tempo/resumo_metricas_prova.csv')
// Tempo disponível para resolver a prova em minutos (dia 1: 330 - 75 de redação; dia 2: 300)
// Mesmos valores de TEMPO_DISPONIVEL_MINUTOS_POR_DIA em backend/config/enemConstants.py
const TEMPO_DISPONIVEL_POR_DIA = { 1: 255, 2: 300 }
let resumoTempoCache = null

function arredondar(valor) {
  return Math.round(valor * 100) / 100
}

// Carrega o CSV uma única vez. Cada linha é uma área de uma prova.
function carregarResumoTempo() {
  if (resumoTempoCache) {
    return resumoTempoCache
  }

  const linhas = fs.readFileSync(RESUMO_TEMPO_CSV, 'utf-8').trim().split(/\r?\n/)
  const cabecalho = linhas.shift().split(',')
  const indice = Object.fromEntries(cabecalho.map((nome, i) => [nome, i]))

  resumoTempoCache = linhas.map((linha) => {
    const colunas = linha.split(',')
    return {
      ano: Number(colunas[indice.ano]),
      dia: Number(colunas[indice.dia]),
      area: colunas[indice.area],
      tempo_questoes_min: Number(colunas[indice.tempo_leitura_questoes_min]),
      tempo_textos_min: Number(colunas[indice.diferenca_tempo_leitura_min])
    }
  })

  return resumoTempoCache
}

// Retorna, para cada dia do ano, o tempo de leitura das questões, dos textos e o restante
app.get('/api/metricas/tempo-resumo', (req, res) => {
  try {
    const ano = Number(req.query.ano)
    if (!Number.isInteger(ano)) {
      return res.status(400).json({ error: 'Parâmetro "ano" é obrigatório' })
    }

    const linhasAno = carregarResumoTempo().filter((linha) => linha.ano === ano)
    if (linhasAno.length === 0) {
      return res.status(404).json({ error: `Sem dados para o ano ${ano}` })
    }

    const dias = [1, 2]
      .map((dia) => {
        // O CSV tem uma linha por caderno (4 por área), com o mesmo tempo de leitura.
        // Fica uma linha por área, e não a soma de todos os cadernos.
        const areas = [...new Map(
          linhasAno.filter((linha) => linha.dia === dia).map((linha) => [linha.area, linha])
        ).values()]
        if (areas.length === 0) {
          return null
        }

        // Os textos introdutórios são do caderno do dia: o valor é igual em todas as áreas,
        // então é contado uma vez, e não somado por área
        const tempoQuestoes = areas.reduce((soma, area) => soma + area.tempo_questoes_min, 0)
        const tempoTextos = areas[0].tempo_textos_min
        const tempoTotal = TEMPO_DISPONIVEL_POR_DIA[dia]

        return {
          dia,
          areas: areas.map((area) => area.area),
          tempo_total_min: tempoTotal,
          tempo_questoes_min: arredondar(tempoQuestoes),
          tempo_textos_min: arredondar(tempoTextos),
          tempo_restante_min: arredondar(Math.max(0, tempoTotal - tempoQuestoes - tempoTextos))
        }
      })
      .filter((dia) => dia !== null)

    res.json({ ano, dias })
  } catch (error) {
    console.error('Erro ao carregar resumo de tempo da prova:', error)
    res.status(500).json({ error: error.message })
  }
})

// Quantidade de palavras do enunciado e das alternativas de cada questão, lidas dos JSONs de dados/enems_json_md.
// O campo quantidade_palavras é o total da questão. O enunciado é quantidade_palavras menos as palavras das alternativas.
// Cada alternativa conta a palavra da letra mais as palavras do texto, com a mesma regra de palavras da extração (WORD_RE).
const PASTA_JSON_PROVAS = path.join(__dirname, '../../../dados/enems_json_md')
const palavrasQuestoesCache = new Map()
const WORD_RE = /\d+(?:[.,]\d+)*(?:%|[ºª])?|[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[-'][A-Za-zÀ-ÖØ-öø-ÿ]+)?/g

function contarPalavrasAlternativas(alternativas = []) {
  return alternativas.reduce((total, alternativa) => {
    const texto = `${alternativa?.letra ?? ''} ${alternativa?.texto ?? ''}`
    return total + (texto.match(WORD_RE) ?? []).length
  }, 0)
}

function carregarPalavrasQuestoes(ano) {
  if (palavrasQuestoesCache.has(ano)) {
    return palavrasQuestoesCache.get(ano)
  }

  const questoes = [1, 2].flatMap((dia) => {
    const nomePasta = `enem${ano}Dia${dia}RegularAzul`
    const arquivo = path.join(PASTA_JSON_PROVAS, nomePasta, `${nomePasta}.json`)
    if (!fs.existsSync(arquivo)) {
      return []
    }

    const prova = JSON.parse(fs.readFileSync(arquivo, 'utf-8'))
    return (prova.questoes ?? []).map((questao) => {
      const posicao = Number(questao.questao)
      return {
        ano,
        dia,
        posicao,
        idioma: questao.idioma ?? 'geral',
        area: areaDaPosicao(posicao),
        rotulo: `Q${posicao}`,
        palavras: Math.max(0, Number(questao.quantidade_palavras ?? 0) - contarPalavrasAlternativas(questao.alternativas)),
        palavrasAlternativas: contarPalavrasAlternativas(questao.alternativas)
      }
    })
  })

  // Só guarda no cache anos com dados, para não acumular entradas vazias
  if (questoes.length > 0) {
    palavrasQuestoesCache.set(ano, questoes)
  }
  return questoes
}

// Questões de uma cor com o texto do Azul. Cada linha da cor (posição X, co_item K) recebe as palavras
// da questão Azul de mesmo co_item (posição Y). Assim a barra mostra o texto da questão K, na posição da cor.
function questoesDaCorPorCoItem(ano, cor, questoesAzul) {
  const caracteristicas = carregarCaracteristicasQuestao().filter((questao) => questao.ano === ano)
  const codigosDaCor = new Set(['LC', 'CH', 'CN', 'MT'].map((area) => codigoDaCor(ano, area, cor)))

  // Questão Azul de cada co_item (com as palavras da posição Azul). Cada co_item tem uma linha Azul própria,
  // então o texto sai do Azul do mesmo item, sem pegar a primeira questão da mesma posição.
  const idiomas = carregarIdiomaPorCoItem()
  const azulPorCoItem = new Map()
  caracteristicas
    .filter((questao) => CODIGO_AZUL_POR_ANO[ano] && questao.co_prova === CODIGO_AZUL_POR_ANO[ano][questao.area])
    .forEach((questao) => {
      const idioma = idiomas.get(questao.co_item) ?? 'geral'
      const azul = questoesAzul.find((q) => q.dia === questao.dia && q.posicao === questao.posicao && q.idioma === idioma)
      if (azul) azulPorCoItem.set(questao.co_item, azul)
    })

  // Uma barra por linha da cor: palavras do Azul do mesmo co_item, na posição da cor
  return caracteristicas
    .filter((questao) => codigosDaCor.has(questao.co_prova))
    .map((questao) => {
      const azul = azulPorCoItem.get(questao.co_item)
      if (!azul) return null
      return { ...azul, dia: questao.dia, posicao: questao.posicao, rotulo: `Q${questao.posicao}`, area: questao.area }
    })
    .filter((questao) => questao !== null)
}

// Anos incluídos no projeto (2021 excluído por falhas na extração, como em metricas_tempo.py)
const ANOS_PALAVRAS_QUESTOES = new Set([2020, 2022, 2023, 2024, 2025])

// Retorna a quantidade de palavras do enunciado de cada questão de um ano (ambos os dias)
app.get('/api/metricas/palavras-questoes', (req, res) => {
  try {
    const ano = Number(req.query.ano)
    if (!Number.isInteger(ano)) {
      return res.status(400).json({ error: 'Parâmetro "ano" é obrigatório' })
    }

    // Sem o parâmetro cor, usa o Azul, como antes
    const cor = req.query.cor ?? 'Azul'
    const areas = Object.keys(CODIGO_AZUL_POR_ANO[ano] ?? {})
    if (!ANOS_PALAVRAS_QUESTOES.has(ano) || areas.some((area) => codigoDaCor(ano, area, cor) === null)) {
      return res.status(400).json({ error: `Cor "${cor}" não existe no ano ${ano}` })
    }

    // Texto da questão de cada posição da cor: o mesmo co_item existe no Azul em outra posição, então pega as palavras do Azul
    const questoesAzul = carregarPalavrasQuestoes(ano)
    const questoesDaCor = cor === 'Azul' ? questoesAzul : questoesDaCorPorCoItem(ano, cor, questoesAzul)

    const questoes = questoesDaCor
      .slice()
      .sort((a, b) => a.dia - b.dia || a.posicao - b.posicao || a.idioma.localeCompare(b.idioma))

    if (questoes.length === 0) {
      return res.status(404).json({ error: `Sem dados para o ano ${ano}` })
    }

    res.json({
      ano,
      cor,
      total_questoes: questoes.length,
      questoes
    })
  } catch (error) {
    console.error('Erro ao carregar quantidade de palavras das questões:', error)
    res.status(500).json({ error: error.message })
  }
})

// Correlações de Spearman entre caracteres da questão e % de acerto.
// CSV gerado por codigo/analise/metricas_tempo.py. Uma linha por área e ano (20 testes).
const ANALISE_IMPACTO_CSV = path.join(__dirname, '../../../outputs/metricas/tempo/analise_impacto_desempenho.csv')
const TIPO_CORRELACAO_CARACTERES = 'TIPO_1_caracteres_questao_vs_acerto'
let correlacoesTempoCache = null

// Converte campo vazio do CSV em null; senão em número
function numeroOuNulo(valor) {
  return valor === undefined || valor === '' ? null : Number(valor)
}

// Separa uma linha CSV respeitando campos entre aspas (ex.: "r=0.785, p=0.0000, n=20")
function separarLinhaCsv(linha) {
  const colunas = []
  let atual = ''
  let entreAspas = false

  for (const caractere of linha) {
    if (caractere === '"') {
      entreAspas = !entreAspas
    } else if (caractere === ',' && !entreAspas) {
      colunas.push(atual)
      atual = ''
    } else {
      atual += caractere
    }
  }
  colunas.push(atual)
  return colunas
}

// Carrega o CSV uma única vez. Mantém só a análise de caracteres (tipo 1).
function carregarCorrelacoesTempo() {
  if (correlacoesTempoCache) {
    return correlacoesTempoCache
  }

  const linhas = fs.readFileSync(ANALISE_IMPACTO_CSV, 'utf-8').trim().split(/\r?\n/)
  const cabecalho = separarLinhaCsv(linhas.shift())
  const indice = Object.fromEntries(cabecalho.map((nome, i) => [nome, i]))

  correlacoesTempoCache = linhas
    .map(separarLinhaCsv)
    .filter((colunas) => colunas[indice.tipo_analise] === TIPO_CORRELACAO_CARACTERES)
    .map((colunas) => ({
      area: colunas[indice.area],
      ano: numeroOuNulo(colunas[indice.ano]),
      r: Number(colunas[indice.coeficiente_r]),
      p: Number(colunas[indice.p_value]),
      pBruto: Number(colunas[indice.p_value_bruto]),
      n: Number(colunas[indice.quantidade_pares])
    }))

  return correlacoesTempoCache
}

// Retorna as correlações de caracteres da questão com o acerto (uma célula por área e ano)
app.get('/api/metricas/correlacoes-tempo', (req, res) => {
  try {
    res.json({ celulas: carregarCorrelacoesTempo() })
  } catch (error) {
    console.error('Erro ao carregar correlações de tempo:', error)
    res.status(500).json({ error: error.message })
  }
})

// Correlação de caracteres × acerto por nível de dificuldade (fácil, média, difícil)
const ANALISE_DIFICULDADE_CSV = path.join(__dirname, '../../../outputs/metricas/tempo/analise_correlacao_dificuldade.csv')
const TIPO_CORRELACAO_DIFICULDADE = 'TIPO_2_caracteres_questao_vs_acerto_por_dificuldade'
const TIPO_CORRELACAO_DIFICULDADE_ANO_AREA = 'TIPO_3_caracteres_questao_vs_acerto_ano_area_dificuldade'
let correlacoesDificuldadeCache = null

function carregarCorrelacoesDificuldade() {
  if (correlacoesDificuldadeCache) {
    return correlacoesDificuldadeCache
  }

  const linhas = fs.readFileSync(ANALISE_DIFICULDADE_CSV, 'utf-8').trim().split(/\r?\n/)
  const cabecalho = separarLinhaCsv(linhas.shift())
  const indice = Object.fromEntries(cabecalho.map((nome, i) => [nome, i]))
  const registros = linhas.map(separarLinhaCsv)

  // Uma barra por nível (agregado de todos os anos e áreas)
  const niveis = registros
    .filter((colunas) => colunas[indice.tipo_analise] === TIPO_CORRELACAO_DIFICULDADE)
    .map((colunas) => ({
      dificuldade: colunas[indice.dificuldade],
      r: Number(colunas[indice.coeficiente_r]),
      p: Number(colunas[indice.p_value]),
      pBruto: Number(colunas[indice.p_value_bruto]),
      n: Number(colunas[indice.quantidade_pares])
    }))

  // Uma célula por ano × área × nível (mapa de calor)
  const celulas = registros
    .filter((colunas) => colunas[indice.tipo_analise] === TIPO_CORRELACAO_DIFICULDADE_ANO_AREA)
    .map((colunas) => ({
      ano: Number(colunas[indice.ano]),
      area: colunas[indice.area],
      dificuldade: colunas[indice.dificuldade],
      r: Number(colunas[indice.coeficiente_r]),
      p: Number(colunas[indice.p_value]),
      pBruto: Number(colunas[indice.p_value_bruto]),
      n: Number(colunas[indice.quantidade_pares])
    }))

  correlacoesDificuldadeCache = { niveis, celulas }
  return correlacoesDificuldadeCache
}

// Retorna a correlação de caracteres × acerto por dificuldade (barras por nível e células ano × área × nível)
app.get('/api/metricas/correlacoes-dificuldade', (req, res) => {
  try {
    res.json(carregarCorrelacoesDificuldade())
  } catch (error) {
    console.error('Erro ao carregar correlações por dificuldade:', error)
    res.status(500).json({ error: error.message })
  }
})

// Correlação por dificuldade com filtros de dia e área (uma linha por nível e combinação de filtro)
const ANALISE_DIFICULDADE_FILTROS_CSV = path.join(__dirname, '../../../outputs/metricas/tempo/retornoMVP_analise_correlacao_dificuldade_filtros.csv')
const TIPO_CORRELACAO_DIFICULDADE_FILTROS = 'TIPO_4_caracteres_questao_vs_acerto_filtro_dia_area_dificuldade'
let correlacoesDificuldadeFiltrosCache = null

function carregarCorrelacoesDificuldadeFiltros() {
  if (correlacoesDificuldadeFiltrosCache) {
    return correlacoesDificuldadeFiltrosCache
  }

  const linhas = fs.readFileSync(ANALISE_DIFICULDADE_FILTROS_CSV, 'utf-8').trim().split(/\r?\n/)
  const cabecalho = separarLinhaCsv(linhas.shift())
  const indice = Object.fromEntries(cabecalho.map((nome, i) => [nome, i]))

  correlacoesDificuldadeFiltrosCache = linhas
    .map(separarLinhaCsv)
    .filter((colunas) => colunas[indice.tipo_analise] === TIPO_CORRELACAO_DIFICULDADE_FILTROS)
    .map((colunas) => ({
      ano: Number(colunas[indice.ano]),
      dia: colunas[indice.dia],
      areas: colunas[indice.areas].split(';'),
      dificuldade: colunas[indice.dificuldade],
      r: Number(colunas[indice.coeficiente_r]),
      p: Number(colunas[indice.p_value]),
      n: Number(colunas[indice.quantidade_pares])
    }))

  return correlacoesDificuldadeFiltrosCache
}

// Linhas de correlação por dificuldade de um ano (um registro por nível e combinação de dia × áreas)
app.get('/api/metricas/correlacoes-dificuldade-filtros', (req, res) => {
  const ano = Number(req.query.ano)
  if (!Number.isInteger(ano)) {
    return res.status(400).json({ error: 'Informe o ano (parâmetro ano)' })
  }

  try {
    const linhas = carregarCorrelacoesDificuldadeFiltros().filter((linha) => linha.ano === ano)
    res.json({ linhas })
  } catch (error) {
    console.error('Erro ao carregar correlações por dificuldade com filtros:', error)
    res.status(500).json({ error: error.message })
  }
})

// Acerto médio por metade de caracteres (menos = <= mediana do nível; mais = > mediana)
const ANALISE_METADES_CSV = path.join(__dirname, '../../../outputs/metricas/tempo/retornoMVP_analise_metades_caracteres_filtros.csv')
const TIPO_METADES_CARACTERES = 'TIPO_5_acerto_metades_caracteres_filtro_dia_area_dificuldade'
let metadesCaracteresCache = null

function carregarMetadesCaracteres() {
  if (metadesCaracteresCache) {
    return metadesCaracteresCache
  }

  const linhas = fs.readFileSync(ANALISE_METADES_CSV, 'utf-8').trim().split(/\r?\n/)
  const cabecalho = separarLinhaCsv(linhas.shift())
  const indice = Object.fromEntries(cabecalho.map((nome, i) => [nome, i]))

  metadesCaracteresCache = linhas
    .map(separarLinhaCsv)
    .filter((colunas) => colunas[indice.tipo_analise] === TIPO_METADES_CARACTERES)
    .map((colunas) => ({
      ano: Number(colunas[indice.ano]),
      dia: colunas[indice.dia],
      areas: colunas[indice.areas].split(';'),
      dificuldade: colunas[indice.dificuldade],
      metade: colunas[indice.metade],
      mediana: Number(colunas[indice.mediana_caracteres]),
      caracteresMedio: Number(colunas[indice.caracteres_medio]),
      acertoMedio: Number(colunas[indice.acerto_medio]),
      quantidadeItens: Number(colunas[indice.quantidade_itens])
    }))

  return metadesCaracteresCache
}

// Linhas de acerto por metade de caracteres de um ano (um registro por nível, metade e combinação de dia × áreas)
app.get('/api/metricas/metades-caracteres', (req, res) => {
  const ano = Number(req.query.ano)
  if (!Number.isInteger(ano)) {
    return res.status(400).json({ error: 'Informe o ano (parâmetro ano)' })
  }

  try {
    const linhas = carregarMetadesCaracteres().filter((linha) => linha.ano === ano)
    res.json({ linhas })
  } catch (error) {
    console.error('Erro ao carregar acerto por metade de caracteres:', error)
    res.status(500).json({ error: error.message })
  }
})

// ====grafico dispersao itens - rota /api/metricas/dispersao-itens (pontos por item e retas com IC 95%)
const ANALISE_DISPERSAO_PONTOS_CSV = path.join(__dirname, '../../../outputs/metricas/tempo/retornoMVP_dispersao_itens.csv')
const ANALISE_DISPERSAO_RETAS_CSV = path.join(__dirname, '../../../outputs/metricas/tempo/retornoMVP_dispersao_itens_retas.csv')
const TIPO_DISPERSAO_RETA = 'TIPO_6_dispersao_itens_reta_filtro_dia_area'
let dispersaoItensCache = null

// Lê um CSV com cabeçalho e devolve um objeto por linha (valores como texto)
function lerCsvComCabecalho(caminho) {
  const linhas = fs.readFileSync(caminho, 'utf-8').trim().split(/\r?\n/)
  const cabecalho = separarLinhaCsv(linhas.shift())
  return linhas.map((linha) => {
    const colunas = separarLinhaCsv(linha)
    return Object.fromEntries(cabecalho.map((nome, i) => [nome, colunas[i]]))
  })
}

function carregarDispersaoItens() {
  if (dispersaoItensCache) {
    return dispersaoItensCache
  }

  const pontos = lerCsvComCabecalho(ANALISE_DISPERSAO_PONTOS_CSV).map((linha) => ({
    ano: Number(linha.ano),
    area: linha.area,
    coItem: linha.co_item,
    dificuldade: linha.dificuldade,
    caracteres: Number(linha.caracteres),
    acerto: Number(linha.acerto),
    acertos: Number(linha.n_acertos),
    total: Number(linha.n_respostas)
  }))

  const retas = lerCsvComCabecalho(ANALISE_DISPERSAO_RETAS_CSV)
    .filter((linha) => linha.tipo_analise === TIPO_DISPERSAO_RETA)
    .map((linha) => ({
      ano: Number(linha.ano),
      dia: linha.dia,
      areas: linha.areas.split(';'),
      caracteres: Number(linha.caracteres),
      acertoPrevisto: Number(linha.acerto_previsto),
      icInferior: Number(linha.ic_inferior),
      icSuperior: Number(linha.ic_superior),
      razaoChancesPor100: Number(linha.razao_chances_por_100),
      phi: Number(linha.phi),
      p: Number(linha.p_wald),
      quantidadeItens: Number(linha.quantidade_itens)
    }))

  dispersaoItensCache = { pontos, retas }
  return dispersaoItensCache
}

// Pontos (um por item) e linhas da reta com IC 95% de um ano
app.get('/api/metricas/dispersao-itens', (req, res) => {
  const ano = Number(req.query.ano)
  if (!Number.isInteger(ano)) {
    return res.status(400).json({ error: 'Informe o ano (parâmetro ano)' })
  }

  try {
    const { pontos, retas } = carregarDispersaoItens()
    res.json({
      pontos: pontos.filter((ponto) => ponto.ano === ano),
      retas: retas.filter((reta) => reta.ano === ano)
    })
  } catch (error) {
    console.error('Erro ao carregar dispersão de itens:', error)
    res.status(500).json({ error: error.message })
  }
})
// ====fim grafico dispersao itens

// Tratamento de erro 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' })
})

// Tratamento de erros geral
app.use((err, req, res, next) => {
  console.error('Erro:', err)
  res.status(500).json({ error: err.message })
})

// Iniciar servidor
app.listen(port, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${port}`)
  console.log(`📁 Diretório de uploads: ${uploadDir}`)
})
