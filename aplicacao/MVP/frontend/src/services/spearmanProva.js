import { pValorT } from './correlacaoProva.js'

// Mapa de calor da prova enviada: correlação de Spearman entre caracteres da questão e
// acerto, por nível de dificuldade. Mesmo critério de Holm do mapa do ENEM (metricas_tempo.py).
export const MINIMO_QUESTOES_SPEARMAN = 3

// Postos médios para empates (base de 1)
function postos(valores) {
  const ordem = valores.map((valor, indice) => ({ valor, indice })).sort((a, b) => a.valor - b.valor)
  const resultado = new Array(valores.length)
  let inicio = 0
  while (inicio < ordem.length) {
    let fim = inicio
    while (fim + 1 < ordem.length && ordem[fim + 1].valor === ordem[inicio].valor) fim++
    const posto = (inicio + fim) / 2 + 1
    for (let k = inicio; k <= fim; k++) resultado[ordem[k].indice] = posto
    inicio = fim + 1
  }
  return resultado
}

// Spearman = Pearson sobre os postos. Retorna null quando um dos lados não varia.
export function spearman(xs, ys) {
  const px = postos(xs)
  const py = postos(ys)
  const n = px.length
  const mediaX = px.reduce((soma, v) => soma + v, 0) / n
  const mediaY = py.reduce((soma, v) => soma + v, 0) / n
  let cov = 0
  let varX = 0
  let varY = 0
  for (let i = 0; i < n; i++) {
    cov += (px[i] - mediaX) * (py[i] - mediaY)
    varX += (px[i] - mediaX) ** 2
    varY += (py[i] - mediaY) ** 2
  }
  if (varX === 0 || varY === 0) return null
  return cov / Math.sqrt(varX * varY)
}

// Ajuste de Holm: ordena os p do menor para o maior e multiplica por (m − posição + 1), sem passar de 1,
// mantendo a monotonicidade (cada valor ajustado não fica menor que o anterior).
export function ajustarHolm(pBrutos) {
  const m = pBrutos.length
  const ordem = pBrutos.map((p, indice) => ({ p, indice })).sort((a, b) => a.p - b.p)
  const ajustados = new Array(m)
  let maximoAnterior = 0
  ordem.forEach(({ p, indice }, posicao) => {
    const bruto = Math.min(1, (m - posicao) * p)
    maximoAnterior = Math.max(maximoAnterior, bruto)
    ajustados[indice] = Math.min(1, maximoAnterior)
  })
  return ajustados
}

/**
 * questoes: [{ caracteres, taxa_acerto_percentual, dificuldade }]
 * Retorna uma célula por nível: { nivel, n, r, pBruto, p } ou { nivel, n, r: null } quando não há dados suficientes.
 * O p bruto usa a aproximação t de Student com n − 2 graus de liberdade (pValorT).
 */
export function calcularSpearmanPorNivel(questoes, niveis) {
  const brutos = niveis.map((nivel) => {
    const pontos = questoes.filter((questao) => {
      if (questao.dificuldade !== nivel.chave) return false
      return questao.taxa_acerto_percentual !== null && questao.taxa_acerto_percentual !== undefined
        && Number.isFinite(Number(questao.taxa_acerto_percentual))
    })
    const n = pontos.length
    if (n < MINIMO_QUESTOES_SPEARMAN) return { nivel: nivel.chave, n, r: null, pBruto: null }
    const xs = pontos.map((ponto) => Number(ponto.caracteres) || 0)
    const ys = pontos.map((ponto) => Number(ponto.taxa_acerto_percentual))
    const r = spearman(xs, ys)
    if (r === null) return { nivel: nivel.chave, n, r: null, pBruto: null }
    return { nivel: nivel.chave, n, r, pBruto: pValorT(r, n) }
  })

  const comDado = brutos.filter((celula) => celula.pBruto !== null)
  const ajustados = ajustarHolm(comDado.map((celula) => celula.pBruto))
  let indiceAjustado = 0
  return brutos.map((celula) => {
    if (celula.pBruto === null) return { ...celula, p: null }
    return { ...celula, p: ajustados[indiceAjustado++] }
  })
}
