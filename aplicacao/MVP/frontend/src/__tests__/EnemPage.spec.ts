import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import EnemPage from '../views/EnemPage.vue'

vi.mock('../services/http.js', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { questoes: [], dias: [] } }) }
}))

vi.mock('../components/GraficoTempoLeitura.vue', () => ({ default: { template: '<div class="grafico-tempo-stub" />' } }))
vi.mock('../components/ResumoTempoProva.vue', () => ({ default: { template: '<div class="resumo-stub" />' } }))
vi.mock('../components/MapaCalorCorrelacoes.vue', () => ({ default: { template: '<div class="mapa-stub" />' } }))
vi.mock('../components/CorrelacaoDificuldadeMapa.vue', () => ({ default: { template: '<div class="correlacao-mapa-stub" />' } }))
vi.mock('../components/CorrelacaoDificuldadeColunas.vue', () => ({ default: { template: '<div class="correlacao-colunas-stub" />' } }))
// ========GRAFICO DISPERSAO_ITENS - mock
vi.mock('../components/CorrelacaoDispersaoItens.vue', () => ({ default: { template: '<div class="dispersao-stub" />' } }))
// =======grafico DISPERSAO_ITENS
vi.mock('../components/PalavrasQuestoesGrafico.vue', () => ({ default: { template: '<div class="palavras-stub" />' } }))
vi.mock('../components/ProvaInfoDisplay.vue', () => ({ default: { template: '<div class="prova-stub" />' } }))

describe('EnemPage', () => {
  it('ao escolher um ano, marca e aplica todas as análises por padrão', async () => {
    const wrapper = mount(EnemPage)
    await flushPromises()

    expect(wrapper.find('.placeholder').exists()).toBe(true)

    await wrapper.findAll('.year-card')[0].trigger('click')
    await flushPromises()

    expect(wrapper.find('.analyses-section').exists()).toBe(true)
    expect(wrapper.find('.grafico-tempo-stub').exists()).toBe(true)
    expect(wrapper.find('.resumo-stub').exists()).toBe(true)
    expect(wrapper.find('.palavras-stub').exists()).toBe(true)

    await wrapper.find('.filter-btn').trigger('click')
    const checkboxes = wrapper.findAll('.filter-option input[type="checkbox"]:not(#filter-selecionar-tudo)')
    expect(checkboxes).toHaveLength(6)
    checkboxes.forEach((checkbox) => expect((checkbox.element as HTMLInputElement).checked).toBe(true))
    expect((wrapper.find('#filter-selecionar-tudo').element as HTMLInputElement).checked).toBe(true)
  })

  it('Selecionar tudo marca ou desmarca todas as análises no rascunho, só valendo após Aplicar', async () => {
    const wrapper = mount(EnemPage)
    await wrapper.findAll('.year-card')[0].trigger('click')
    await flushPromises()

    await wrapper.find('.filter-btn').trigger('click')
    const todos = () => wrapper.find('#filter-selecionar-tudo').element as HTMLInputElement
    const checkboxes = () => wrapper.findAll('.filter-option input[type="checkbox"]:not(#filter-selecionar-tudo)')

    expect(todos().checked).toBe(true)
    await wrapper.find('#filter-selecionar-tudo').trigger('change')
    checkboxes().forEach((checkbox) => expect((checkbox.element as HTMLInputElement).checked).toBe(false))

    await wrapper.find('.filter-aplicar').trigger('click')
    await flushPromises()
    expect(wrapper.find('.grafico-tempo-stub').exists()).toBe(false)
    expect(wrapper.find('.palavras-stub').exists()).toBe(false)

    await wrapper.find('.filter-btn').trigger('click')
    await wrapper.find('#filter-selecionar-tudo').trigger('change')
    checkboxes().forEach((checkbox) => expect((checkbox.element as HTMLInputElement).checked).toBe(true))
  })
})
