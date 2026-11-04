
import { ENEM_CONSTANTS } from '../config/enemConstants.js'

export const DEFAULT_READING_SPEED = ENEM_CONSTANTS.VELOCIDADE_LEITURA_CPM

export function formatarPercentual(valor) {
  const numero = Number(valor) || 0
  if (numero === 0) return '0.0'
  if (Math.abs(numero) >= 1) return numero.toFixed(1)

  const casas = Math.min(6, Math.ceil(-Math.log10(Math.abs(numero))) + 1)
  return numero.toFixed(casas)
}

export const MAX_EXAM_DURATION_HOURS = 6

export const ANALYSIS_TYPE_OPTIONS = [
  { value: 'image', label: 'Análise da Presença de Imagens' },
  { value: 'formality', label: 'Análise do Formalismo' },
  { value: 'reading-time', label: 'Análise do Tempo de Prova' },
  { value: 'word-count', label: 'Análise do Tamanho das Questões' },
  { value: 'distractors', label: 'Análise de Distratores' }
]

export const TODOS_TIPOS_ANALISE = ANALYSIS_TYPE_OPTIONS.map(({ value }) => value)
