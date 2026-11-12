import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { calcularLogisticaProva, MINIMO_QUESTOES } from '../services/logisticaProva.js'
import CorrelacaoProvaGrafico from '../components/CorrelacaoProvaGrafico.vue'

// Referência (scipy: otimização direta da log-verossimilhança binomial, mesma parametrização)
const XS = [150, 280, 420, 530, 690, 760, 900]
const ACERTOS = [80, 35, 60, 20, 45, 30, 70]
const pontosRef = XS.map((x, i) => ({ x, acertos: ACERTOS[i], total: 100 }))

describe('calcularLogisticaProva', () => {
  it('retorna null abaixo do mínimo de questões', () => {
    expect(calcularLogisticaProva(pontosRef.slice(0, 2), [100, 200])).toBeNull()
    expect(MINIMO_QUESTOES).toBe(3)
  })

  it('mantém a razão de chances da logística binomial e corrige o p pela dispersão estimada', () => {
    const resultado = calcularLogisticaProva(pontosRef, [150, 400, 760])
    expect(resultado?.n).toBe(7)
    expect(resultado?.razaoChancesPor100).toBeCloseTo(0.93974, 3)
    // Dispersão estimada (φ > 1): o p fica acima do valor do modelo binomial sem correção (0,04165)
    expect(resultado?.phi).toBeGreaterThan(1)
    expect(resultado?.p).toBeCloseTo(0.6699, 3)
  })

  it('mantém a curva prevista e recalcula a faixa de IC 95% com a dispersão estimada', () => {
    const [inicio, fim] = calcularLogisticaProva(pontosRef, [150, 760])!.linha
    expect(inicio.previsto).toBeCloseTo(54.5, 1)
    expect(inicio.icInferior).toBeCloseTo(24.57, 1)
    expect(inicio.icSuperior).toBeCloseTo(81.5, 1)
    expect(fim.previsto).toBeCloseTo(45.05, 1)
    expect(fim.icInferior).toBeCloseTo(23.82, 1)
    expect(fim.icSuperior).toBeCloseTo(68.26, 1)
  })

  it('mantém a faixa de IC entre 0% e 100% mesmo com acertos extremos', () => {
    const extremos = [
      { x: 100, acertos: 99, total: 100 },
      { x: 200, acertos: 40, total: 100 },
      { x: 300, acertos: 35, total: 100 },
      { x: 400, acertos: 20, total: 100 },
      { x: 700, acertos: 100, total: 100 }
    ]
    const grade = Array.from({ length: 21 }, (_, i) => 100 + (600 / 20) * i)
    calcularLogisticaProva(extremos, grade)!.linha.forEach((linha) => {
      expect(linha.icInferior).toBeGreaterThanOrEqual(0)
      expect(linha.icSuperior).toBeLessThanOrEqual(100)
      expect(linha.icInferior).toBeLessThanOrEqual(linha.previsto)
      expect(linha.icSuperior).toBeGreaterThanOrEqual(linha.previsto)
    })
  })

  it('usa φ ≥ 1 e p entre 0 e 1 com poucas ou muitas respostas por questão', () => {
    const poucas = pontosRef.map((p) => ({ ...p, acertos: Math.round(p.acertos / 10), total: 10 }))
    const muitas = pontosRef.map((p) => ({ ...p, acertos: p.acertos * 10, total: 1000 }))
    ;[poucas, muitas].forEach((dados) => {
      const resultado = calcularLogisticaProva(dados, [100])!
      expect(resultado.phi).toBeGreaterThanOrEqual(1)
      expect(resultado.p).toBeGreaterThanOrEqual(0)
      expect(resultado.p).toBeLessThanOrEqual(1)
    })
  })

  it('retorna null quando acertos passam do total', () => {
    expect(calcularLogisticaProva([...pontosRef.slice(0, 5), { x: 900, acertos: 150, total: 100 }], [100])).toBeNull()
  })
})

describe('CorrelacaoProvaGrafico (logística)', () => {
  const questao = (rotulo: string, caracteres: number, acertos: number, dificuldade: string | null = null) => ({
    rotulo,
    caracteres,
    taxa_acerto_percentual: acertos,
    acertos,
    total_estudantes: 100,
    dificuldade
  })

  it('mostra o aviso de amostra pequena e o resultado do modelo logístico', () => {
    const wrapper = mount(CorrelacaoProvaGrafico, {
      props: { questoes: [questao('Q1', 100, 90), questao('Q2', 200, 70), questao('Q3', 300, 50), questao('Q4', 400, 30)] }
    })
    expect(wrapper.text()).toContain('Atenção:')
    expect(wrapper.text()).toContain('razão de chances')
    expect(wrapper.find('.grafico-correlacao').exists()).toBe(true)
    expect(wrapper.findAll('.ponto')).toHaveLength(4)
  })

  it('não desenha o gráfico quando não há acertos informados', () => {
    const wrapper = mount(CorrelacaoProvaGrafico, {
      props: { questoes: [{ rotulo: 'Q1', caracteres: 100, taxa_acerto_percentual: null }, { rotulo: 'Q2', caracteres: 200, taxa_acerto_percentual: null }] }
    })
    expect(wrapper.find('.grafico-correlacao').exists()).toBe(false)
    expect(wrapper.text()).toContain('Informe os acertos por questão')
  })

  it('desenha a curva e a faixa dentro da área do gráfico (0% a 100%)', () => {
    const wrapper = mount(CorrelacaoProvaGrafico, {
      props: {
        questoes: [
          questao('Q1', 100, 99, 'facil'),
          questao('Q2', 200, 40, 'medio'),
          questao('Q3', 300, 35, 'dificil'),
          questao('Q4', 400, 20, 'facil'),
          questao('Q5', 700, 100, 'medio')
        ]
      }
    })
    const alturas = (wrapper.find('.faixa-ic').attributes('points') ?? '').split(' ').map((par) => Number(par.split(',')[1]))
    const topoDaArea = 20 // MARGEM_TOPO (100%)
    const baseDaArea = 414 // MARGEM_TOPO + ALTURA_UTIL (0%)
    alturas.forEach((altura) => {
      expect(altura).toBeGreaterThanOrEqual(topoDaArea - 1e-6)
      expect(altura).toBeLessThanOrEqual(baseDaArea + 1e-6)
    })
  })
})
