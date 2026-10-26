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

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024, contentLength: 100 * 1024 * 1024 },
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

    // Executar script Python (use caminho absoluto para garantir funcionamento)
    const pythonScript = path.join(__dirname, '../python/cli_analyzer.py')
    const analysisType = config.analysisType || 'all'

    const pythonProcess = spawn('python3', [
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
