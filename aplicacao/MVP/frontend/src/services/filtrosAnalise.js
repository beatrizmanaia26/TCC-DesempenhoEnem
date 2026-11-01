// Regras de filtro das análises do ENEM. Usadas pelos gráficos da tela e pela exportação,
// para que o arquivo exportado tenha exatamente o que está aplicado na tela.

// Quartil por interpolação linear entre os valores ordenados
export function quartil(valores, p) {
  const ordenados = [...valores].sort((a, b) => a - b)
  const pos = (ordenados.length - 1) * p
  const base = Math.floor(pos)
  const resto = pos - base
  return ordenados[base + 1] !== undefined
    ? ordenados[base] + resto * (ordenados[base + 1] - ordenados[base])
    : ordenados[base]
}

// Filtro de dia: 'todos' ou 1 / 2
export function filtrarDia(questoes, dia) {
  return dia === 'todos' ? questoes : questoes.filter((questao) => questao.dia === dia)
}

// Filtro de área: lista vazia significa todas as áreas
export function filtrarAreas(questoes, areas) {
  return areas.length === 0 ? questoes : questoes.filter((questao) => areas.includes(questao.area))
}

// Filtro de dificuldade do TRI: 'todas' ou 'facil' / 'media' / 'dificil'
export function filtrarDificuldade(questoes, dificuldade) {
  return dificuldade === 'todas' ? questoes : questoes.filter((questao) => questao.dificuldade === dificuldade)
}

// Ordenação e recorte por estatística, igual aos menus de Tempo e Palavras da tela.
// valorDe(questao) devolve o número usado na métrica (tempo de leitura ou palavras)
export function aplicarMetrica(questoes, metrica, valorDe) {
  const valores = questoes.map(valorDe)
  if (valores.length === 0) return questoes

  const media = valores.reduce((soma, v) => soma + v, 0) / valores.length
  const desvio = Math.sqrt(valores.reduce((soma, v) => soma + (v - media) ** 2, 0) / valores.length)
  const [q1, q3] = [quartil(valores, 0.25), quartil(valores, 0.75)]
  const iqr = q3 - q1

  switch (metrica) {
    case 'menor':
      return [...questoes].sort((a, b) => valorDe(a) - valorDe(b))
    case 'maior':
      return [...questoes].sort((a, b) => valorDe(b) - valorDe(a))
    case 'media':
      return questoes.filter((questao) => valorDe(questao) > media)
    case 'abaixo':
      return questoes.filter((questao) => valorDe(questao) < media)
    case 'outlier':
      return questoes.filter((questao) => valorDe(questao) < q1 - 1.5 * iqr || valorDe(questao) > q3 + 1.5 * iqr)
    case 'desvio':
      return questoes.filter((questao) => Math.abs(valorDe(questao) - media) > desvio)
    default:
      return questoes
  }
}

// Filtros de tempo de leitura: dificuldade, área e métrica de tempo (o dia é aplicado à parte)
export function filtrarTempoLeitura(questoes, { dificuldade = 'todas', areas = [], tempo = 'padrao' }) {
  const porDificuldade = filtrarDificuldade(questoes, dificuldade)
  const porArea = filtrarAreas(porDificuldade, areas)
  return aplicarMetrica(porArea, tempo, (questao) => questao.tempo_leitura_minutos)
}

// Filtros de palavras: área e métrica de palavras (o dia é aplicado à parte)
export function filtrarPalavras(questoes, { areas = [], metrica = 'padrao' }) {
  const porArea = filtrarAreas(questoes, areas)
  return aplicarMetrica(porArea, metrica, (questao) => questao.palavras)
}
