// Correlação entre tamanho da questão (caracteres) e percentual de acerto de uma prova.
// Mesmo método do gráfico de dispersão do ENEM (codigo/analise/metricas_tempo.py, stats.linregress):
// r de Pearson e p bilateral pelo teste t com n − 2 graus de liberdade.
// A reta e a faixa de IC 95% vêm da mesma regressão de mínimos quadrados.

export const MINIMO_QUESTOES = 3

function media(valores) {
  return valores.reduce((soma, valor) => soma + valor, 0) / valores.length
}

// Correlação de Pearson; null quando um dos lados não varia
function pearson(a, b) {
  const mediaA = media(a)
  const mediaB = media(b)
  let covariancia = 0
  let variancaA = 0
  let variancaB = 0
  for (let i = 0; i < a.length; i++) {
    const desvioA = a[i] - mediaA
    const desvioB = b[i] - mediaB
    covariancia += desvioA * desvioB
    variancaA += desvioA * desvioA
    variancaB += desvioB * desvioB
  }
  if (variancaA === 0 || variancaB === 0) return null
  return covariancia / Math.sqrt(variancaA * variancaB)
}

// Reta de mínimos quadrados: acerto = intercepto + inclinação × caracteres
function regressaoLinear(xs, ys) {
  const mediaX = media(xs)
  const mediaY = media(ys)
  let covariancia = 0
  let variancaX = 0
  for (let i = 0; i < xs.length; i++) {
    covariancia += (xs[i] - mediaX) * (ys[i] - mediaY)
    variancaX += (xs[i] - mediaX) * (xs[i] - mediaX)
  }
  if (variancaX === 0) return null
  const inclinacao = covariancia / variancaX
  return { inclinacao, intercepto: mediaY - inclinacao * mediaX }
}

/**
 * pontos: [{ x: caracteres, y: percentual de acerto }], um por questão.
 * Retorna { n, r, p, inclinacao, intercepto } ou null se não der para calcular.
 * Como o gráfico de dispersão do ENEM (codigo/analise/metricas_tempo.py, stats.linregress):
 * r é o Pearson e p é bilateral pelo teste t com n − 2 graus de liberdade.
 * inclinacao está em pontos percentuais por caractere.
 */
export function calcularCorrelacaoProva(pontos) {
  const n = pontos.length
  if (n < MINIMO_QUESTOES) return null

  const xs = pontos.map((ponto) => Number(ponto.x))
  const ys = pontos.map((ponto) => Number(ponto.y))

  const r = pearson(xs, ys)
  const reta = regressaoLinear(xs, ys)
  if (r === null || reta === null) return null

  return {
    n,
    r,
    p: pValorT(r, n),
    inclinacao: reta.inclinacao,
    intercepto: reta.intercepto
  }
}

// p bilateral do teste t de r, com n − 2 graus de liberdade (mesma estatística do stats.linregress)
export function pValorT(r, n) {
  const graus = n - 2
  if (graus <= 0) return 1
  if (Math.abs(r) >= 1) return 0
  const t2 = (r * r * graus) / (1 - r * r)
  return betaIncompleta(graus / 2, 0.5, graus / (graus + t2))
}

// log da função gama (aproximação de Lanczos)
function logGama(z) {
  const coeficientes = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61503916999385, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]
  if (z < 0.5) {
    return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * z))) - logGama(1 - z)
  }
  const x = z - 1
  let soma = coeficientes[0]
  for (let i = 1; i < coeficientes.length; i++) {
    soma += coeficientes[i] / (x + i)
  }
  const t = x + 7.5
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(soma)
}

// Fração contínua da função beta incompleta (Lentz)
function fracaoContinuaBeta(a, b, x) {
  const minimo = Number.MIN_VALUE
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < minimo) d = minimo
  d = 1 / d
  let h = d
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < minimo) d = minimo
    c = 1 + aa / c
    if (Math.abs(c) < minimo) c = minimo
    d = 1 / d
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < minimo) d = minimo
    c = 1 + aa / c
    if (Math.abs(c) < minimo) c = minimo
    d = 1 / d
    const delta = d * c
    h *= delta
    if (Math.abs(delta - 1) < 3e-14) break
  }
  return h
}

// Função beta incompleta regularizada I_x(a, b)
function betaIncompleta(a, b, x) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const fator = Math.exp(logGama(a + b) - logGama(a) - logGama(b) + a * Math.log(x) + b * Math.log(1 - x))
  if (x < (a + 1) / (a + b + 2)) {
    return (fator * fracaoContinuaBeta(a, b, x)) / a
  }
  return 1 - (fator * fracaoContinuaBeta(b, a, 1 - x)) / b
}

// Quantil da t de Student por bisseção sobre a função de distribuição
export function quantilT(probabilidade, graus) {
  const cdf = (t) => 1 - 0.5 * betaIncompleta(graus / 2, 0.5, graus / (graus + t * t))
  let inferior = 0
  let superior = 1000
  for (let i = 0; i < 200; i++) {
    const meio = (inferior + superior) / 2
    if (cdf(meio) < probabilidade) {
      inferior = meio
    } else {
      superior = meio
    }
  }
  return (inferior + superior) / 2
}

/**
 * Reta de mínimos quadrados com IC 95% da reta prevista, como o gráfico de dispersão do ENEM
 * (codigo/analise/metricas_tempo.py, _reta_mqo_ic): IC pelo t de Student com n − 2 graus de liberdade.
 * grade: valores de x em que a reta e a faixa são calculadas.
 * Retorna { inclinacao, intercepto, linha: [{ x, previsto, icInferior, icSuperior }] } ou null.
 */
export function retaComIntervalo(xs, ys, grade) {
  const n = xs.length
  if (n < 3) return null
  const mediaX = media(xs)
  const mediaY = media(ys)
  let sxx = 0
  let sxy = 0
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mediaX) ** 2
    sxy += (xs[i] - mediaX) * (ys[i] - mediaY)
  }
  if (sxx === 0) return null
  const inclinacao = sxy / sxx
  const intercepto = mediaY - inclinacao * mediaX
  let somaResiduos = 0
  for (let i = 0; i < n; i++) {
    somaResiduos += (ys[i] - (intercepto + inclinacao * xs[i])) ** 2
  }
  const s2 = somaResiduos / (n - 2)
  const tCritico = quantilT(0.975, n - 2)
  const linha = grade.map((x) => {
    const previsto = intercepto + inclinacao * x
    const erroPadrao = Math.sqrt(s2 * (1 / n + ((x - mediaX) ** 2) / sxx))
    return {
      x,
      previsto,
      icInferior: previsto - tCritico * erroPadrao,
      icSuperior: previsto + tCritico * erroPadrao
    }
  })
  return { inclinacao, intercepto, linha }
}
