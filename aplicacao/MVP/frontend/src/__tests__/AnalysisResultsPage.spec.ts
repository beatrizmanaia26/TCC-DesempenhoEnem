import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AnalysisResultsPage from '../views/AnalysisResultsPage.vue'
import { useAnalysisStore } from '../stores/analysisStore'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('../components/GraficoLeituraQuestoes.vue', () => ({ default: { template: '<div class="leitura-stub" />' } }))
vi.mock('../components/GraficoPalavrasProva.vue', () => ({ default: { template: '<div class="palavras-stub" />' } }))
vi.mock('../components/MapaCalorSpearmanProva.vue', () => ({ default: { template: '<div class="mapa-stub" />' } }))
vi.mock('../components/CorrelacaoMetadesProva.vue', () => ({ default: { template: '<div class="metades-stub" />' } }))
vi.mock('../components/CorrelacaoProvaGrafico.vue', () => ({ default: { template: '<div class="dispersao-stub" />' } }))
vi.mock('../components/AnaliseImagensProva.vue', () => ({ default: { template: '<div class="imagens-stub" />' } }))

const questao = (n: number) => ({
  questao: n,
  texto: 'Texto da questão com algumas palavras para contar',
  quantidade_palavras: 10,
  tem_imagem: n % 2 === 0,
  alternativas: [{ letra: 'A', texto: 'um' }, { letra: 'B', texto: 'dois' }],
  dificuldade: 'facil',
  taxa_acerto_percentual: 50
})

const montar = (analysisTypes: string[]) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useAnalysisStore()
  store.setAnalysisPayload({
    fileName: 'prova.pdf',
    textos_introdutorios: [],
    questions: [questao(1), questao(2)],
    config: { analysisTypes, hours: 1, minutes: 0, readingSpeedMode: 'default' }
  })
  return mount(AnalysisResultsPage, { global: { plugins: [pinia] } })
}

describe('AnalysisResultsPage (paginação da prova)', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  })

  it('mostra um gráfico por vez, com título e contador x/y', async () => {
    const wrapper = montar(['reading-time', 'word-count'])
    await flushPromises()

    const titulo = () => wrapper.find('.titulo-bloco-analise').text()
    const contador = () => wrapper.find('.contador-grafico').text()

    expect(titulo()).toBe('Análise do Tempo de Prova')
    expect(contador()).toBe('1/2')
    expect(wrapper.find('.btn-navegacao').text()).toContain('Avançar')
    expect(wrapper.findAll('.btn-navegacao').some((b) => b.text().includes('Voltar'))).toBe(false)

    await wrapper.find('.btn-avancar').trigger('click')
    expect(titulo()).toBe('Análise do Tempo de Prova')
    expect(contador()).toBe('2/2')
    expect(wrapper.find('.leitura-stub').exists()).toBe(true)

    await wrapper.find('.btn-avancar').trigger('click')
    expect(titulo()).toBe('Análise do Tamanho das Questões')
    expect(contador()).toBe('1/4')
    expect(wrapper.find('.palavras-stub').exists()).toBe(true)
  })

  it('análise sem gráfico mostra aviso e não mostra contador', async () => {
    const wrapper = montar(['distractors'])
    await flushPromises()

    expect(wrapper.find('.titulo-bloco-analise').text()).toBe('Análise de Distratores')
    expect(wrapper.find('.contador-grafico').exists()).toBe(false)
    expect(wrapper.find('.etapa-sem-grafico').exists()).toBe(true)
    expect(wrapper.find('.step-nav').exists()).toBe(false)
  })
})
