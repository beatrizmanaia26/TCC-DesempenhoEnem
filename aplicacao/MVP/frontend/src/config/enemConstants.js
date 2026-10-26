// Frontend - Constantes centralizadas do ENEM
// Reutilizadas em múltiplos componentes

export const ENEM_CONSTANTS = {
  // Velocidade de leitura padrão (caracteres por minuto)
  // Referência: Messias et al., 2008
  VELOCIDADE_LEITURA_CPM: 1100,

  // Tempo disponível por dia (em minutos)
  // Dia 1 (CH, LC): 330 min - 75 min redação = 255 min
  // Dia 2 (CN, MT): 300 min completos
  TEMPO_DISPONIVEL_MINUTOS_POR_DIA: {
    1: 255,
    2: 300
  },

  // Dados por ano ENEM
  ENEM_YEARS: {
    2025: {
      ano: 2025,
      questoes_dia1: 90,
      questoes_dia2: 90,
      questoes_total: 180,
      areas_dia1: ['CH', 'LC'], // Ciências Humanas, Linguagens e Códigos
      areas_dia2: ['CN', 'MT']  // Ciências da Natureza, Matemática
    },
    2024: {
      ano: 2024,
      questoes_dia1: 90,
      questoes_dia2: 90,
      questoes_total: 180,
      areas_dia1: ['CH', 'LC'],
      areas_dia2: ['CN', 'MT']
    },
    2023: {
      ano: 2023,
      questoes_dia1: 90,
      questoes_dia2: 90,
      questoes_total: 180,
      areas_dia1: ['CH', 'LC'],
      areas_dia2: ['CN', 'MT']
    },
    2022: {
      ano: 2022,
      questoes_dia1: 90,
      questoes_dia2: 90,
      questoes_total: 180,
      areas_dia1: ['CH', 'LC'],
      areas_dia2: ['CN', 'MT']
    },
    2020: {
      ano: 2020,
      questoes_dia1: 90,
      questoes_dia2: 90,
      questoes_total: 180,
      areas_dia1: ['CH', 'LC'],
      areas_dia2: ['CN', 'MT']
    }
  }
}

/**
 * Formata duração em minutos para string legível (ex: "4h 15min")
 * @param {number} minutos - Quantidade de minutos
 * @returns {string} Duração formatada
 */
export function formatarDuracao(minutos) {
  const horas = Math.floor(minutos / 60)
  const mins = minutos % 60
  return `${horas}h ${mins}min`
}

/**
 * Obtém informações formatadas da prova para um ano específico
 * @param {number} ano - Ano do ENEM (ex: 2025)
 * @returns {object} Objeto com informações formatadas da prova
 */
export function obterInfoProva(ano) {
  const dadosAno = ENEM_CONSTANTS.ENEM_YEARS[ano]
  
  if (!dadosAno) {
    console.warn(`Dados do ENEM ${ano} não encontrados`)
    return null
  }

  const dia1 = ENEM_CONSTANTS.TEMPO_DISPONIVEL_MINUTOS_POR_DIA[1]
  const dia2 = ENEM_CONSTANTS.TEMPO_DISPONIVEL_MINUTOS_POR_DIA[2]
  const duracao_total = dia1 + dia2

  return {
    duracao_total: formatarDuracao(duracao_total),
    duracao_dia1: formatarDuracao(dia1),
    duracao_dia2: formatarDuracao(dia2),
    questoes_total: dadosAno.questoes_total,
    questoes_dia1: dadosAno.questoes_dia1,
    questoes_dia2: dadosAno.questoes_dia2,
    velocidade_leitura: ENEM_CONSTANTS.VELOCIDADE_LEITURA_CPM,
    areas_dia1: dadosAno.areas_dia1.join(', '),
    areas_dia2: dadosAno.areas_dia2.join(', ')
  }
}

/**
 * Valida se um ano é um ENEM válido
 * @param {number} ano - Ano a validar
 * @returns {boolean} True se ano é válido
 */
export function ehAnoValido(ano) {
  return ano in ENEM_CONSTANTS.ENEM_YEARS
}
