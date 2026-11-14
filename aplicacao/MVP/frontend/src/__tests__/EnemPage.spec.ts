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
// ========GRAFICO DISPERSAO_ITENS - mock
vi.mock('../components/CorrelacaoDispersaoItens.vue', () => ({ default: { template: '<div class="dispersao-stub" />' } }))
// =======grafico DISPERSAO_ITENS
vi.mock('../components/PalavrasQuestoesGrafico.vue', () => ({ default: { template: '<div class="palavras-stub" />' } }))
vi.mock('../components/ProvaInfoDisplay.vue', () => ({ default: { template: '<div class="prova-stub" />' } }))

describe('EnemPage', () => {
  it('ao abrir a tela, o ENEM 2025 já vem aberto com todas as análises aplicadas', async () => {
    const wrapper = mount(EnemPage)
    await flushPromises()

    expect(wrapper.find('.placeholder').exists()).toBe(false)
    expect(wrapper.find('.year-card.active').text()).toContain('2025')
    expect(wrapper.find('.analyses-section').exists()).toBe(true)
    // As informações da prova ficam sempre visíveis; o primeiro passo é a Distribuição do Tempo de Prova
    expect(wrapper.find('.prova-stub').exists()).toBe(true)
    expect(wrapper.find('.resumo-stub').exists()).toBe(true)
    expect(wrapper.find('.grafico-tempo-stub').exists()).toBe(false)

    // Passo 2/2 da análise de tempo: Tempo de Leitura e Média de Tempo Disponível para Resolver Cada Questão
    await wrapper.find('.btn-avancar').trigger('click')
    expect(wrapper.find('.grafico-tempo-stub').exists()).toBe(true)
    expect(wrapper.find('.resumo-stub').exists()).toBe(false)

    // Próximo passo: primeiro gráfico do tamanho das questões
    await wrapper.find('.btn-avancar').trigger('click')
    expect(wrapper.find('.palavras-stub').exists()).toBe(true)
    expect(wrapper.find('.grafico-tempo-stub').exists()).toBe(false)

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
    // Sem análises marcadas, só as informações da prova aparecem
    expect(wrapper.find('.grafico-tempo-stub').exists()).toBe(false)
    expect(wrapper.find('.palavras-stub').exists()).toBe(false)
    expect(wrapper.find('.btn-avancar').exists()).toBe(false)

    await wrapper.find('.filter-btn').trigger('click')
    await wrapper.find('#filter-selecionar-tudo').trigger('change')
    checkboxes().forEach((checkbox) => expect((checkbox.element as HTMLInputElement).checked).toBe(true))
  })

  it('navega pelos gráficos com Voltar e Avançar, com contador x/y ao lado do título', async () => {
    const wrapper = mount(EnemPage)
    await wrapper.findAll('.year-card')[0].trigger('click')
    await flushPromises()

    const titulo = () => wrapper.find('.titulo-bloco-analise').text()
    const contador = () => wrapper.find('.contador-grafico').text()
    const botaoVoltar = () => wrapper.findAll('.btn-navegacao').find((b) => b.text().includes('Voltar'))

    expect(titulo()).toBe('Análise do Tempo de Prova')
    expect(contador()).toBe('1/2')
    expect(botaoVoltar()).toBeUndefined()
    await wrapper.find('.btn-avancar').trigger('click')
    expect(titulo()).toBe('Análise do Tempo de Prova')
    expect(contador()).toBe('2/2')
    await wrapper.find('.btn-avancar').trigger('click')
    expect(titulo()).toBe('Análise do Tamanho das Questões')
    expect(contador()).toBe('1/5')
    await botaoVoltar()!.trigger('click')
    expect(contador()).toBe('2/2')
    expect(wrapper.find('.prova-stub').exists()).toBe(true)
  })
})
