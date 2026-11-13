// Modelo da prova enviada: regressão logística binomial entre tamanho da questão (caracteres) e acerto.
// Cada questão tem `acertos` de `total` respostas. O modelo é:
//   logit(p) = b0 + b1 × z, com z = (caracteres − média) / desvio padrão dos caracteres.
// Cada questão pesa pelo número de respostas. A faixa de IC 95% é calculada na escala do logit
// e transformada em porcentagem, então fica sempre entre 0% e 100%.
// Os parâmetros são estimados por máxima verossimilhança (IRLS, Newton-Raphson).
// O p bilateral vem do teste de Wald de b1.

export const MINIMO_QUESTOES = 3

// Quantil 0,975 da normal padrão (IC 95%)
const Z_95 = 1.959963984540054

function media(valores) {
  return valores.reduce((soma, valor) => soma + valor, 0) / valores.length
}

function logistica(eta) {
  return 1 / (1 + Math.exp(-eta))
}

// Função de erro (aproximação de Abramowitz e Stegun 7.1.26, erro máximo ~1,5e-7)
function erf(x) {
  const sinal = x < 0 ? -1 : 1
  const z = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * z)
  const polinomio = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))))
  return sinal * (1 - polinomio * Math.exp(-z * z))
}

// p bilateral de uma estatística z com distribuição normal padrão
function pBilateralNormal(z) {
  return 1 - erf(Math.abs(z) / Math.SQRT2)
}

// Inversa de uma matriz 2×2; null se for singular
function inversa2x2(m) {
  const determinante = m[0][0] * m[1][1] - m[0][1] * m[1][0]
  if (!Number.isFinite(determinante) || Math.abs(determinante) < 1e-12) return null
  return [
    [m[1][1] / determinante, -m[0][1] / determinante],
    [-m[1][0] / determinante, m[0][0] / determinante]
  ]
}

// IRLS (Newton-Raphson) para a logística binomial. pontos: [{ x, acertos, total }]
// Retorna { b0, b1, mediaX, desvio, cov } com cov = inversa da informação de Fisher (escala z), ou null.
function ajustarLogistica(pontos) {
  const xs = pontos.map((ponto) => ponto.x)
  const mediaX = media(xs)
  const desvio = Math.sqrt(media(xs.map((x) => (x - mediaX) ** 2)))
  if (!(desvio > 0)) return null
  const zs = xs.map((x) => (x - mediaX) / desvio)

  let b0 = 0
  let b1 = 0
  for (let iteracao = 0; iteracao < 100; iteracao++) {
    let gradiente0 = 0
    let gradiente1 = 0
    let h00 = 0
    let h01 = 0
    let h11 = 0
    for (let i = 0; i < pontos.length; i++) {
      const { acertos, total } = pontos[i]
      const mu = logistica(b0 + b1 * zs[i])
      const peso = total * mu * (1 - mu)
      const resto = acertos - total * mu
      gradiente0 += resto
      gradiente1 += resto * zs[i]
      h00 += peso
      h01 += peso * zs[i]
      h11 += peso * zs[i] * zs[i]
    }
    const inversa = inversa2x2([[h00, h01], [h01, h11]])
    if (!inversa) return null
    const passo0 = inversa[0][0] * gradiente0 + inversa[0][1] * gradiente1
    const passo1 = inversa[1][0] * gradiente0 + inversa[1][1] * gradiente1
    b0 += passo0
    b1 += passo1
    if (Math.abs(passo0) + Math.abs(passo1) < 1e-10) {
      return { b0, b1, mediaX, desvio, cov: inversa }
    }
  }
  return null
}

/**
 * pontos: [{ x: caracteres, acertos, total }], um por questão com acerto informado.
 * grade: valores de caracteres em que a curva e a faixa são calculadas.
 * Retorna { n, p, razaoChancesPor100, linha: [{ x, previsto, icInferior, icSuperior }] } em porcentagem,
 * ou null se não der para ajustar (poucas questões, dados inválidos ou sem convergência).
 */
export function calcularLogisticaProva(pontos, grade) {
  const n = pontos.length
  if (n < MINIMO_QUESTOES) return null

  const dados = pontos.map((ponto) => ({
    x: Number(ponto.x),
    acertos: Number(ponto.acertos),
    total: Number(ponto.total)
  }))
  if (dados.some((d) => !(d.total > 0) || !(d.acertos >= 0) || d.acertos > d.total)) return null

  const ajuste = ajustarLogistica(dados)
  if (!ajuste) return null
  const { b0, b1, mediaX, desvio, cov } = ajuste

  // Sobredispersão (quasi-binomial): φ = χ² de Pearson / (n − 2), nunca abaixo de 1.
  // Quando os acertos variam mais do que a binomial prevê, φ > 1 e os erros padrão aumentam por √φ.
  const chiQuadrado = dados.reduce((soma, d) => {
    const mu = logistica(b0 + b1 * ((d.x - mediaX) / desvio))
    return soma + ((d.acertos - d.total * mu) ** 2) / (d.total * mu * (1 - mu))
  }, 0)
  const phi = n > 2 ? Math.max(1, chiQuadrado / (n - 2)) : 1

  const linha = grade.map((x) => {
    const z = (x - mediaX) / desvio
    const eta = b0 + b1 * z
    const erroPadrao = Math.sqrt(phi * (cov[0][0] + 2 * z * cov[0][1] + z * z * cov[1][1]))
    return {
      x,
      previsto: 100 * logistica(eta),
      icInferior: 100 * logistica(eta - Z_95 * erroPadrao),
      icSuperior: 100 * logistica(eta + Z_95 * erroPadrao)
    }
  })

  const wald = b1 / Math.sqrt(phi * cov[1][1])
  return {
    n,
    phi,
    p: pBilateralNormal(wald),
    razaoChancesPor100: Math.exp((100 * b1) / desvio),
    linha
  }
}
