import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AnalysisResultsPage from '../views/AnalysisResultsPage.vue'
import { useAnalysisStore } from '../stores/analysisStore'
import { calcularSimilaridadesProva, precalcularSimilaridadesProva } from '../services/analysisApi.js'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('../services/analysisApi.js', () => ({
  calcularSimilaridadesProva: vi.fn(),
  precalcularSimilaridadesProva: vi.fn(),
}))
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
    questions: [{ ...questao(1), gabarito: 'B' }, questao(2)],
    config: { analysisTypes, hours: 1, minutes: 0, readingSpeedMode: 'default' }
  })
  return mount(AnalysisResultsPage, { global: { plugins: [pinia] } })
}

describe('AnalysisResultsPage (paginação da prova)', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
    vi.mocked(calcularSimilaridadesProva).mockReset()
    vi.mocked(precalcularSimilaridadesProva).mockReset()
  })

  it('mostra um gráfico por vez, com título e contador x/y', async () => {
    const wrapper = montar(['reading-time', 'word-count', 'distractors'])
    await flushPromises()

    const titulo = () => wrapper.find('.titulo-bloco-analise').text()
    const contador = () => wrapper.find('.contador-grafico').text()

    expect(titulo()).toBe('Análise do Tempo de Prova')
    await vi.waitFor(() => {
      expect(precalcularSimilaridadesProva).toHaveBeenCalledWith(
        [{ ...questao(1), gabarito: 'B' }, questao(2)], expect.any(AbortSignal),
      )
    })
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
    expect(vi.mocked(precalcularSimilaridadesProva).mock.calls[0]?.[1].aborted).toBe(false)
    wrapper.unmount()
    expect(vi.mocked(precalcularSimilaridadesProva).mock.calls[0]?.[1].aborted).toBe(true)
  })

  it('mostra a matriz por questão e destaca a resposta quando há gabarito', async () => {
    vi.mocked(calcularSimilaridadesProva)
      .mockResolvedValueOnce({ matriz: [[null, -0.125], [-0.125, null]] })
      .mockResolvedValueOnce({ matriz: [[null, 0.625], [0.625, null]] })
      .mockResolvedValueOnce({ matriz: [[null, -0.125], [-0.125, null]] })
    const wrapper = montar(['distractors'])
    expect(wrapper.get('[role="status"]').text()).toContain('similaridade semântica')
    await flushPromises()

    expect(calcularSimilaridadesProva).toHaveBeenCalledTimes(1)
    expect(calcularSimilaridadesProva).toHaveBeenCalledWith(
      { ...questao(1), gabarito: 'B' }, expect.any(AbortSignal),
    )
    expect(wrapper.find('.titulo-bloco-analise').text()).toBe('Análise de Distratores')
    expect(wrapper.get('.contador-grafico').text()).toBe('1/1')
    const matriz = wrapper.get('.grafico-matriz')
    expect(matriz.findAll('g[tabindex] text').map((celula) => celula.text())).toEqual(['—', '-0,125', '-0,125', '—'])
    expect(matriz.findAll('text').filter((texto) => texto.text() === 'B ✓')).toHaveLength(2)
    expect(wrapper.get('[aria-label="Questão anterior"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[aria-label="Próxima questão"]').trigger('click')
    await flushPromises()
    expect(calcularSimilaridadesProva).toHaveBeenLastCalledWith(questao(2), expect.any(AbortSignal))
    expect(wrapper.get('.questao-info').text()).toBe('Questão 2')
    expect(wrapper.get('.grafico-matriz').text()).toContain('0,625')
    expect(wrapper.get('.grafico-matriz').text()).not.toContain('✓')
    expect(wrapper.get('[aria-label="Próxima questão"]').attributes('disabled')).toBeDefined()

    await wrapper.get('.paginacao-questoes input').setValue('Q1')
    await flushPromises()
    expect(wrapper.get('.questao-info strong').text()).toBe('Questão 1')
  })

  it('permite repetir o cálculo sem apresentar uma matriz substituta se o modelo falhar', async () => {
    vi.mocked(calcularSimilaridadesProva)
      .mockRejectedValueOnce(new Error('Modelo indisponível'))
      .mockResolvedValueOnce({ matriz: [[null, 0.5], [0.5, null]] })
    const wrapper = montar(['distractors'])
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('Modelo indisponível')
    expect(wrapper.find('.grafico-matriz').exists()).toBe(false)
    await wrapper.findAll('button').find((botao) => botao.text() === 'Tentar novamente')!.trigger('click')
    await flushPromises()
    expect(wrapper.get('.grafico-matriz').text()).toContain('0,500')
  })

  it('mantém a navegação durante o cálculo e informa questões excluídas', async () => {
    let concluirPrimeira!: (resultado: { matriz: (number | null)[][] }) => void
    vi.mocked(calcularSimilaridadesProva)
      .mockImplementationOnce(() => new Promise((resolver) => { concluirPrimeira = resolver }))
      .mockResolvedValueOnce({ exclusao: 'numerica' })
    const wrapper = montar(['distractors'])

    await wrapper.get('[aria-label="Próxima questão"]').trigger('click')
    await flushPromises()
    expect(vi.mocked(calcularSimilaridadesProva).mock.calls[0]?.[1]?.aborted).toBe(true)
    expect(wrapper.get('[role="status"]').text()).toContain('alternativas numéricas')
    concluirPrimeira({ matriz: [[null, 0.5], [0.5, null]] })
    await flushPromises()
    expect(wrapper.find('.grafico-matriz').exists()).toBe(false)
    expect(wrapper.get('[aria-label="Questão anterior"]').exists()).toBe(true)
  })
})
