import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json'
  }
})

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

