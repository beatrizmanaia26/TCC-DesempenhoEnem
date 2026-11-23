import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import EnemPage from '../views/EnemPage.vue'
import AnaliseDistratores from '../components/AnaliseDistratores.vue'

vi.mock('../services/http.js', () => ({
  default: {
    get: vi.fn((url: string) => {
      if (url === '/metricas/formalidade/correlacoes') {
        return Promise.resolve({ data: { correlacoes: [{
          score: 'formal_score', variavel_alvo: 'taxa_acerto', amostra: 'todos_itens_validos', area: 'LC', pearson_r: 0.2
        }] } })
      }
      if (url.startsWith('/metricas/formalidade')) {
        return Promise.resolve({ data: { questoes: [
          { questao: 1, idioma: 'ingles', formal_score: 0.9986, quantidade_palavras: 120, taxa_acerto: 0.4, parametro_b_tri: -0.5 },
          { questao: 1, idioma: 'espanhol', formal_score: 0.9985, quantidade_palavras: 100, taxa_acerto: 0.5, parametro_b_tri: 0.2 },
          { questao: 6, formal_score: 0.9984, quantidade_palavras: 90, taxa_acerto: 0.6 }
        ] } })
      }
      if (url === '/metricas/distratores') {
        return Promise.resolve({ data: { questoes: [
          { id: '1-en', posicao: 1, dia: 1, area: 'LC', idioma: 'ingles' },
          { id: '1-es', posicao: 1, dia: 1, area: 'LC', idioma: 'espanhol' },
          { id: '91', posicao: 91, dia: 2, area: 'CN', idioma: 'geral' },
        ].map(questao => ({
          ...questao, cor: 'Azul', gabarito: 'A', codigo_prova: 1, taxa_correta: 0.6,
          similaridade_media: 0.4, similaridade_maxima: 0.4,
          distratores: ['B', 'C', 'D', 'E'].map(letra => ({ letra, taxa: 0.1, similaridade: 0.4 })),
          similaridades: Object.fromEntries(['AB','AC','AD','AE','BC','BD','BE','CD','CE','DE'].map(par => [par, 0.4])),
        })) } })
      }
      return Promise.resolve({ data: { questoes: [], dias: [] } })
    })
  }
}))

vi.mock('../components/GraficoTempoLeitura.vue', () => ({ default: { template: '<div class="grafico-tempo-stub" />' } }))
vi.mock('../components/ResumoTempoProva.vue', () => ({ default: { template: '<div class="resumo-stub" />' } }))
vi.mock('../components/CorrelacaoDificuldadeMapa.vue', () => ({ default: { template: '<div class="correlacao-mapa-stub" />' } }))
// ========GRAFICO DISPERSAO_ITENS - mock
vi.mock('../components/CorrelacaoDispersaoItens.vue', () => ({ default: { template: '<div class="dispersao-stub" />' } }))
// =======grafico DISPERSAO_ITENS
vi.mock('../components/PalavrasQuestoesGrafico.vue', () => ({ default: { template: '<div class="palavras-stub" />' } }))
vi.mock('../components/ProvaInfoDisplay.vue', () => ({ default: { template: '<div class="prova-stub" />' } }))

describe('EnemPage', () => {
  it('exibe os dados do ENEM na matriz compartilhada e pagina por questão', async () => {
    const wrapper = mount(AnaliseDistratores, { props: { ano: 2025, grafico: 'matriz' } })
    await flushPromises()

    const matriz = wrapper.get('.grafico-matriz')
    expect(matriz.findAll('g[tabindex] text').map((celula) => celula.text())).toContain('0,400')
    expect(matriz.findAll('text').filter((texto) => texto.text() === 'A ✓')).toHaveLength(2)
    await wrapper.get('.paginacao-questoes input').setValue('Q91')
    expect(wrapper.get('.questao-info strong').text()).toBe('Questão 91')
    wrapper.unmount()
  })

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
    expect(contador()).toBe('1/4')
    await botaoVoltar()!.trigger('click')
    expect(contador()).toBe('2/2')
    expect(wrapper.find('.prova-stub').exists()).toBe(true)
  })

  it('mostra uma visualização de formalidade ou distratores por página', async () => {
    const wrapper = mount(EnemPage)
    await wrapper.get('.analyses-header .filter-btn').trigger('click')
    await wrapper.get('#filter-selecionar-tudo').trigger('change')
    await wrapper.get('#formality').trigger('change')
    await wrapper.get('#distractors').trigger('change')
    await wrapper.get('.analyses-header .filter-aplicar').trigger('click')
    await flushPromises()

    const graficos = [
      ['Formalidade por questão', '.grade-questoes'],
      ['Formalidade × quantidade de palavras', '.dispersao'],
      ['Distribuição dos scores de formalidade', '.histograma'],
      ['Formalidade × taxa de acerto', '.desempenho-svg'],
      ['Formalidade × dificuldade TRI (parâmetro b)', '.desempenho-svg'],
      ['Correlação da formalidade com o desempenho', '.correlacoes-svg'],
    ]
    const seletores = [...new Set(graficos.map(([, seletor]) => seletor))].join(', ')
    for (const [indice, [titulo, seletor]] of graficos.entries()) {
      expect(wrapper.get('.titulo-bloco-analise').text()).toBe('Análise do Formalismo')
      expect(wrapper.get('.contador-grafico').text()).toBe(`${indice + 1}/6`)
      expect(wrapper.findAll('.formalidade')).toHaveLength(1)
      expect(wrapper.get('.formalidade h3').text()).toContain(titulo)
      expect(wrapper.findAll(seletores)).toHaveLength(1)
      expect(wrapper.get('.formalidade').find(seletor).exists()).toBe(true)
      if (indice < 5 && indice !== 2) {
        expect(wrapper.findAll(`${seletor} circle`)).toHaveLength(indice === 4 ? 2 : 3)
        const legenda = wrapper.get('.legenda-questoes')
        expect(legenda.text()).toContain('Formal (> 0,5)')
        expect(legenda.text()).toContain('Informal (≤ 0,5)')
      }
      expect(wrapper.findComponent(AnaliseDistratores).exists()).toBe(false)
      await wrapper.get('.btn-avancar').trigger('click')
    }

    await flushPromises()
    expect(wrapper.get('.titulo-bloco-analise').text()).toBe('Análise de Distratores')
    expect(wrapper.get('.contador-grafico').text()).toBe('1/3')
    expect(wrapper.find('.formalidade').exists()).toBe(false)
    expect(wrapper.findAll('.analise-distratores .cartao')).toHaveLength(1)
    wrapper.getComponent(AnaliseDistratores).vm.$emit('abrir-detalhe-distrator')
    await wrapper.vm.$nextTick()
    expect(wrapper.get('.contador-grafico').text()).toBe('2/3')
    expect(wrapper.get('.analise-distratores h3').text()).toBe('Escolha das alternativas por questão')
    expect(wrapper.get('.paginacao-questoes span').text()).toBe('/ 3')
    await wrapper.get('button[aria-label="Próxima questão"]').trigger('click')
    expect(wrapper.get('.questao-info').text()).toContain('espanhol')
    const paginaQuestao = wrapper.get<HTMLInputElement>('.paginacao-questoes input')
    await paginaQuestao.setValue('Q91')
    expect(wrapper.get('.questao-info').text()).toContain('Q91')
    expect(paginaQuestao.element.value).toBe('3')
    await wrapper.get('.analise-distratores .filter-btn').trigger('click')
    await wrapper.get('.analise-distratores input[name="barras-dia"][value="2"]').setValue(true)
    await wrapper.get('.analise-distratores .aplicar').trigger('click')
    expect(wrapper.get('.paginacao-questoes span').text()).toBe('/ 1')
    expect(paginaQuestao.element.value).toBe('1')
    await wrapper.get('.btn-avancar').trigger('click')
    expect(wrapper.get('.contador-grafico').text()).toBe('3/3')
    expect(wrapper.get('.analise-distratores h3').text()).toBe('Similaridade entre as alternativas')
    wrapper.unmount()
  })
})
