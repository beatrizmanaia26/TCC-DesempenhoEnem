import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MapaCalorSpearmanProva from '../components/MapaCalorSpearmanProva.vue'
import { spearman, ajustarHolm, calcularSpearmanPorNivel } from '../services/spearmanProva.js'

describe('spearman', () => {
  it('retorna 1 para ordem igual e -1 para ordem invertida', () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1, 10)
    expect(spearman([1, 2, 3, 4], [40, 30, 20, 10])).toBeCloseTo(-1, 10)
  })

  it('retorna null quando um dos lados não varia', () => {
    expect(spearman([1, 2, 3], [5, 5, 5])).toBeNull()
  })
})

describe('ajustarHolm', () => {
  it('multiplica pelo número de testes restantes e mantém monotonia', () => {
    // ordenados: 0.01, 0.04, 0.03 -> ajustados: 0.03, 0.06, 0.06 (máximo acumulado)
    expect(ajustarHolm([0.01, 0.04, 0.03])).toEqual([0.03, 0.06, 0.06])
  })

  it('não passa de 1', () => {
    expect(ajustarHolm([0.9, 0.8])).toEqual([1, 1])
  })
})

describe('calcularSpearmanPorNivel', () => {
  const niveis = [{ chave: 'facil' }, { chave: 'dificil' }]
  const questoes = [
    { caracteres: 100, taxa_acerto_percentual: 90, dificuldade: 'facil' },
    { caracteres: 200, taxa_acerto_percentual: 80, dificuldade: 'facil' },
    { caracteres: 300, taxa_acerto_percentual: 70, dificuldade: 'facil' },
    { caracteres: 400, taxa_acerto_percentual: 60, dificuldade: 'facil' },
    { caracteres: 100, taxa_acerto_percentual: 30, dificuldade: 'dificil' },
    { caracteres: 200, taxa_acerto_percentual: 40, dificuldade: 'dificil' }
  ]

  it('calcula r por nível e deixa sem dado quando há menos questões que o mínimo', () => {
    const [facil, dificil] = calcularSpearmanPorNivel(questoes, niveis)
    expect(facil.r).toBeCloseTo(-1, 10)
    expect(facil.n).toBe(4)
    expect(dificil.r).toBeNull()
    expect(dificil.p).toBeNull()
  })
})

describe('MapaCalorSpearmanProva', () => {
  const questoes = [
    { caracteres: 100, taxa_acerto_percentual: 90, dificuldade: 'facil' },
    { caracteres: 200, taxa_acerto_percentual: 80, dificuldade: 'facil' },
    { caracteres: 300, taxa_acerto_percentual: 70, dificuldade: 'facil' },
    { caracteres: 400, taxa_acerto_percentual: 60, dificuldade: 'facil' }
  ]

  it('mostra a linha Todas e as três dificuldades, com células sem dado como —', () => {
    const wrapper = mount(MapaCalorSpearmanProva, { props: { questoes } })
    expect(wrapper.findAll('.celula-rect')).toHaveLength(4)
    // Só Fácil tem dados suficientes, e Todas também (4 questões)
    expect(wrapper.findAll('.p-celula')).toHaveLength(4)
    expect(wrapper.text()).toContain('Todas')
    expect(wrapper.text()).toContain('Difícil')
  })

  it('linka a palavra Spearman do subtítulo para a explicação em nova aba', () => {
    const wrapper = mount(MapaCalorSpearmanProva, { props: { questoes: [] } })
    const link = wrapper.find('.correlacoes-link')
    expect(link.text()).toBe('Spearman')
    expect(link.attributes('href')).toContain('wikipedia.org')
    expect(link.attributes('target')).toBe('_blank')
  })

  it('não mostra mensagem nem legenda quando não há acertos informados', () => {
    const wrapper = mount(MapaCalorSpearmanProva, { props: { questoes: [] } })
    expect(wrapper.find('.mapa-calor').exists()).toBe(false)
    expect(wrapper.find('.correlacoes-legenda').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Informe os acertos')
  })
})
