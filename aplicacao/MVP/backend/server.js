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
const port = process.env.PORT || 3000

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

// Rota de upload e análise
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' })
    }

    const config = JSON.parse(req.body.config || '{}')
    const analysisId = uuidv4()
    const filePath = req.file.path

    console.log(`[${analysisId}] Iniciando analise de: ${req.file.originalname}`)

    // Executar script Python com opcoes seguras (S4036)
    const pythonScript = path.join(__dirname, '../python/cli_analyzer.py')
    const analysisType = config.analysisType || 'all'
    
    // Usar caminho fixo de python3 (configuravel via variavel de ambiente)
    // Padrao: /usr/bin/python3 em sistemas Unix/Linux
    const pythonPath = process.env.PYTHON_PATH || '/usr/bin/python3'
    
    // Validar que o caminho eh absoluto e nao contem ".."
    if (!path.isAbsolute(pythonPath) || pythonPath.includes('..')) {
      return res.status(500).json({ 
        error: 'Caminho de Python invalido'
      })
    }
    
    // Verificar se python3 existe antes de usar
    if (!fs.existsSync(pythonPath)) {
      return res.status(500).json({ 
        error: 'Python3 nao esta instalado no caminho configurado: ' + pythonPath
      })
    }

    const pythonProcess = spawn(pythonPath, [
      pythonScript,
      filePath,
      '--type',
      analysisType,
      '--output-format',
      'json'
    ])

    let pythonOutput = ''
    let pythonError = ''

    pythonProcess.stdout.on('data', (data) => {
      pythonOutput += data.toString()
      console.log(`[${analysisId}] Python: ${data.toString().trim()}`)
    })

    pythonProcess.stderr.on('data', (data) => {
      pythonError += data.toString()
      console.error(`[${analysisId}] Python Error: ${data.toString().trim()}`)
    })

    pythonProcess.on('close', (code) => {
      // Limpar arquivo temporário
      fs.unlink(filePath, (err) => {
        if (err) console.error(`Erro ao deletar arquivo: ${err}`)
      })

      if (code !== 0) {
        console.error(`[${analysisId}] Python process exited with code ${code}`)
        return res.status(500).json({
          error: 'Erro na análise',
          details: pythonError
        })
      }

      try {
        const results = JSON.parse(pythonOutput)
        results.id = analysisId
        results.analyzedFile = req.file.originalname
        results.timestamp = new Date().toISOString()

        res.json(results)
      } catch (parseError) {
        console.error(`[${analysisId}] Erro ao parsear resultado: ${parseError}`)
        res.status(500).json({
          error: 'Erro ao processar resultado da análise',
          details: parseError.message
        })
      }
    })
  } catch (error) {
    console.error('Erro no upload:', error)
    res.status(500).json({ error: error.message })
  }
})

// Rota para recuperar histórico de análises
app.get('/api/analyses', (req, res) => {
  res.json({
    analyses: [],
    message: 'Histórico de análises será implementado com banco de dados'
  })
})

// Rota para recuperar resultado específico
app.get('/api/results/:id', (req, res) => {
  res.json({
    error: 'Análise não encontrada',
    id: req.params.id
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

// Retorna o tempo de leitura de cada questão de um ano (ambos os dias)
app.get('/api/metricas/tempo-leitura-questoes', (req, res) => {
  try {
    const ano = Number(req.query.ano)
    if (!Number.isInteger(ano)) {
      return res.status(400).json({ error: 'Parâmetro "ano" é obrigatório' })
    }

    const dificuldades = carregarDificuldadesAzul()
    const questoes = carregarQuestoesTempo()
      .filter((questao) => questao.ano === ano)
      .sort((a, b) => a.dia - b.dia || a.posicao - b.posicao || a.idioma.localeCompare(b.idioma))
      .map((questao) => ({
        ...questao,
        dificuldade: dificuldades.get(`${ano}-${questao.posicao}`) ?? null
      }))

    if (questoes.length === 0) {
      return res.status(404).json({ error: `Sem dados para o ano ${ano}` })
    }

    res.json({
      ano,
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
