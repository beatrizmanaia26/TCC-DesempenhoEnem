import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Parte da extração do pdf
export const extractExamPdf = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  try {
    const response = await apiClient.post('/extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  } catch (error) {
    const erro = new Error(error.response?.data?.error || error.message || 'Erro ao ler o PDF')
    // Sem resposta do servidor (rede indisponível, timeout): a análise pode ser refeita com o mesmo arquivo
    erro.semResposta = !error.response
    throw erro
  }
}

const similaridadesPorQuestao = new WeakMap()
const filaSimilaridades = []
let calculoEmAndamento = false
// A primeira questão pode precisar carregar o modelo.
const TIMEOUT_SIMILARIDADE_MS = 15 * 60_000 + 15_000

async function processarProximaSimilaridade() {
  if (calculoEmAndamento || !filaSimilaridades.length) return
  const { questao, resolver, rejeitar, signal } = filaSimilaridades.shift()
  if (signal?.aborted) {
    similaridadesPorQuestao.delete(questao)
    resolver()
    return processarProximaSimilaridade()
  }
  calculoEmAndamento = true
  try {
    const { alternativas = [], alternativas_graficas, texto } = questao
    const { data } = await apiClient.post('/similaridade-prova', {
      alternativas: alternativas.map(({ texto, tem_imagem }) => ({ texto: texto ?? '', tem_imagem })),
      alternativas_graficas,
      texto
    }, { timeout: TIMEOUT_SIMILARIDADE_MS })
    resolver(data)
  } catch (erro) {
    similaridadesPorQuestao.delete(questao)
    rejeitar(new Error(erro.response?.data?.error || 'Não foi possível calcular a similaridade da questão.'))
  } finally {
    calculoEmAndamento = false
    processarProximaSimilaridade()
  }
}

function enfileirarSimilaridade(questao, prioritaria, signal) {
  const existente = similaridadesPorQuestao.get(questao)
  if (existente) {
    if (prioritaria) {
      existente.signal = undefined
      const posicao = filaSimilaridades.indexOf(existente)
      if (posicao > 0) filaSimilaridades.unshift(...filaSimilaridades.splice(posicao, 1))
    }
    return existente.resultado
  }

  const tarefa = { questao, signal }
  tarefa.resultado = new Promise((resolver, rejeitar) => {
    Object.assign(tarefa, { resolver, rejeitar })
  })
  similaridadesPorQuestao.set(questao, tarefa)
  if (prioritaria) filaSimilaridades.unshift(tarefa)
  else filaSimilaridades.push(tarefa)
  processarProximaSimilaridade()
  return tarefa.resultado
}

export async function calcularSimilaridadesProva(questao, signal) {
  signal?.throwIfAborted()
  return enfileirarSimilaridade(questao, true)
}

export async function precalcularSimilaridadesProva(questoes, signal) {
  for (const questao of questoes) {
    if (signal.aborted) return
    try {
      await enfileirarSimilaridade(questao, false, signal)
    } catch {
      // Uma falha do modelo deve ser tratada pela questão aberta, sem repetir
      // automaticamente a mesma falha em todas as questões da prova.
      return
    }
  }
}

/**
 * Faz upload de arquivo e inicia análise
 */
export const uploadAndAnalyze = async (file, config) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('config', JSON.stringify(config))

  try {
    const response = await apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  } catch (error) {
    console.error('Erro ao fazer upload:', error)
    throw new Error(error.response?.data?.message || 'Erro ao analisar arquivo')
  }
}

/**
 * Recupera resultados de uma análise anterior
 */
export const getAnalysisResults = async (analysisId) => {
  try {
    const response = await apiClient.get(`/results/${analysisId}`)
    return response.data
  } catch (error) {
    console.error('Erro ao recuperar resultados:', error)
    throw new Error('Erro ao recuperar resultados')
  }
}

/**
 * Obtém lista de análises anteriores
 */
export const listAnalyses = async () => {
  try {
    const response = await apiClient.get('/analyses')
    return response.data
  } catch (error) {
    console.error('Erro ao listar análises:', error)
    throw new Error('Erro ao listar análises')
  }
}

export default apiClient
