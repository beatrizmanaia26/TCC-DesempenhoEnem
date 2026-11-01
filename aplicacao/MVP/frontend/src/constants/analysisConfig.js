
export const DEFAULT_READING_SPEED = 1100

export const MAX_EXAM_DURATION_HOURS = 6

export const ANALYSIS_TYPE_OPTIONS = [
  { value: 'image', label: 'Análise da Presença de Imagens' },
  { value: 'formality', label: 'Análise do Formalismo' },
  { value: 'reading-time', label: 'Análise do Tempo de Prova' },
  { value: 'word-count', label: 'Análise do Tamanho das Questões' },
  { value: 'distractors', label: 'Análise de Distratores' }
]

export const TODOS_TIPOS_ANALISE = ANALYSIS_TYPE_OPTIONS.map(({ value }) => value)
