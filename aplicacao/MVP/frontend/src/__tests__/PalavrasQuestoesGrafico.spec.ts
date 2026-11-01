import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import PalavrasQuestoesGrafico from '../components/PalavrasQuestoesGrafico.vue'
import http from '../services/http.js'

vi.mock('../services/http.js', () => ({
  default: { get: vi.fn() }
}))

const questao = (posicao: number, dia: number, palavras: number, idioma = 'geral', palavrasAlternativas = 0) => ({
  ano: 2024,
  dia,
  posicao,
  idioma,
  area: posicao <= 45 ? 'LC' : 'CN',
  rotulo: `Q${posicao}`,
  palavras,
  palavrasAlternativas
})

describe('PalavrasQuestoesGrafico', () => {
  beforeEach(() => {
    vi.mocked(http.get).mockReset()
  })

  it('busca a quantidade de palavras do ano e mostra uma barra por questão, separadas por dia', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        ano: 2024,
        questoes: [questao(1, 1, 100), questao(2, 1, 200), questao(91, 2, 50)]
      }
    })

    const wrapper = mount(PalavrasQuestoesGrafico, { props: { ano: 2024 } })
    await flushPromises()

    expect(http.get).toHaveBeenCalledWith('/metricas/palavras-questoes', { params: { ano: 2024, cor: 'Azul' } })
    expect(wrapper.text()).toContain('Quantidade de Palavras por Questão')
    expect(wrapper.text()).toContain('Dia 1 (2 questões)')
    expect(wrapper.text()).toContain('Dia 2 (1 questão)')
    expect(wrapper.findAll('.barra-linha')).toHaveLength(3)
  })

  it('usa a questão mais longa (enunciado + alternativas) como 100% e mostra enunciado - alternativas', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        ano: 2024,
        questoes: [
          questao(1, 1, 50, 'geral', 50),
          questao(2, 1, 100, 'geral', 100),
          questao(91, 2, 25, 'geral', 25)
        ]
      }
    })

    const wrapper = mount(PalavrasQuestoesGrafico, { props: { ano: 2024 } })
    await flushPromises()

    const enunciados = wrapper.findAll('.barra:not(.barra-alternativas)')
    const alternativas = wrapper.findAll('.barra-alternativas')
    expect(enunciados[0].attributes('style')).toContain('width: 25%')
    expect(enunciados[1].attributes('style')).toContain('width: 50%')
    expect(enunciados[2].attributes('style')).toContain('width: 12.5%')

    // A barra das alternativas começa onde a do enunciado termina
    expect(alternativas[0].attributes('style')).toContain('left: 25%')
    expect(alternativas[0].attributes('style')).toContain('width: 25%')
    expect(alternativas[1].attributes('style')).toContain('left: 50%')
    expect(alternativas[1].attributes('style')).toContain('width: 50%')

    expect(wrapper.findAll('.barra-valor')[1].text()).toBe('100 - 100')
    expect(wrapper.findAll('.barra-valor')[0].text()).toBe('50 - 50')
  })

  it('filtra as barras pelo dia escolhido só ao clicar em Aplicar', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        ano: 2024,
        questoes: [questao(1, 1, 100), questao(2, 1, 200), questao(91, 2, 50)]
      }
    })

    const wrapper = mount(PalavrasQuestoesGrafico, { props: { ano: 2024 } })
    await flushPromises()
    await wrapper.find('.filter-btn').trigger('click')
    await wrapper.find('#palavras-dia-1').trigger('change')

    expect(wrapper.findAll('.barra-linha')).toHaveLength(3)

    await wrapper.find('.filter-aplicar').trigger('click')
    expect(wrapper.findAll('.barra-linha')).toHaveLength(2)
    expect(wrapper.text()).not.toContain('Dia 2')
  })

  it('filtra por área usando a área de cada questão', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        ano: 2024,
        questoes: [questao(1, 1, 100), questao(2, 1, 200), questao(91, 2, 50)]
      }
    })

    const wrapper = mount(PalavrasQuestoesGrafico, { props: { ano: 2024 } })
    await flushPromises()
    await wrapper.find('.filter-btn').trigger('click')
    await wrapper.find('#palavras-area-CN').trigger('change')
    await wrapper.find('.filter-aplicar').trigger('click')

    expect(wrapper.findAll('.barra-linha')).toHaveLength(1)
    expect(wrapper.find('.barra-rotulo').text()).toBe('Q91')
  })

  it('descarta as mudanças do filtro quando o menu é fechado sem aplicar', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        ano: 2024,
        questoes: [questao(1, 1, 100), questao(91, 2, 50)]
      }
    })

    const wrapper = mount(PalavrasQuestoesGrafico, { props: { ano: 2024 } })
    await flushPromises()
    await wrapper.find('.filter-btn').trigger('click')
    await wrapper.find('#palavras-dia-1').trigger('change')
    await wrapper.find('.filter-btn').trigger('click')

    expect(wrapper.findAll('.barra-linha')).toHaveLength(2)

    await wrapper.find('.filter-btn').trigger('click')
    expect((wrapper.find('#palavras-dia-todos').element as HTMLInputElement).checked).toBe(true)
  })

  it('ordena as barras pela quantidade de palavras quando escolhido no filtro', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        ano: 2024,
        questoes: [questao(1, 1, 100), questao(2, 1, 200), questao(91, 2, 50)]
      }
    })

    const wrapper = mount(PalavrasQuestoesGrafico, { props: { ano: 2024 } })
    await flushPromises()
    await wrapper.find('.filter-btn').trigger('click')
    await wrapper.find('#palavras-metrica-maior').trigger('change')
    await wrapper.find('.filter-aplicar').trigger('click')

    const rotulos = () => wrapper.findAll('.barra-rotulo').map((item) => item.text())
    expect(rotulos()).toEqual(['Q2', 'Q1', 'Q91'])

    await wrapper.find('.filter-btn').trigger('click')
    await wrapper.find('#palavras-metrica-menor').trigger('change')
    await wrapper.find('.filter-aplicar').trigger('click')
    expect(rotulos()).toEqual(['Q1', 'Q2', 'Q91'])
  })

  it('mostra só as questões acima da média quando escolhido', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        ano: 2024,
        questoes: [questao(1, 1, 100), questao(2, 1, 200), questao(91, 2, 50)]
      }
    })

    const wrapper = mount(PalavrasQuestoesGrafico, { props: { ano: 2024 } })
    await flushPromises()
    await wrapper.find('.filter-btn').trigger('click')
    await wrapper.find('#palavras-metrica-media').trigger('change')
    await wrapper.find('.filter-aplicar').trigger('click')

    // Média = 116,7 palavras: só a Q2 (200) fica acima
    expect(wrapper.findAll('.barra-rotulo').map((item) => item.text())).toEqual(['Q2'])
  })

  it('mostra só as questões abaixo da média quando escolhido', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        ano: 2024,
        questoes: [questao(1, 1, 100), questao(2, 1, 200), questao(91, 2, 50)]
      }
    })

    const wrapper = mount(PalavrasQuestoesGrafico, { props: { ano: 2024 } })
    await flushPromises()
    await wrapper.find('.filter-btn').trigger('click')
    await wrapper.find('#palavras-metrica-abaixo').trigger('change')
    await wrapper.find('.filter-aplicar').trigger('click')

    // Média = 116,7 palavras: Q1 (100) e Q91 (50) ficam abaixo
    expect(wrapper.findAll('.barra-rotulo').map((item) => item.text())).toEqual(['Q1', 'Q91'])
  })

  it('mostra só as questões fora do intervalo do IQR quando escolhido em Outliers', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        ano: 2024,
        questoes: [questao(1, 1, 100), questao(2, 1, 101), questao(3, 1, 102), questao(4, 1, 103), questao(5, 1, 500)]
      }
    })

    const wrapper = mount(PalavrasQuestoesGrafico, { props: { ano: 2024 } })
    await flushPromises()
    await wrapper.find('.filter-btn').trigger('click')
    await wrapper.find('#palavras-metrica-outlier').trigger('change')
    await wrapper.find('.filter-aplicar').trigger('click')

    // Q1 = 101, Q3 = 103, IQR = 2: limite superior = 106, então só a Q5 (500) é outlier
    expect(wrapper.findAll('.barra-rotulo').map((item) => item.text())).toEqual(['Q5'])
  })

  it('mostra só as questões fora de 1 desvio padrão da média quando escolhido', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        ano: 2024,
        questoes: [questao(1, 1, 100), questao(2, 1, 101), questao(3, 1, 102), questao(4, 1, 103), questao(5, 1, 500)]
      }
    })

    const wrapper = mount(PalavrasQuestoesGrafico, { props: { ano: 2024 } })
    await flushPromises()
    await wrapper.find('.filter-btn').trigger('click')
    await wrapper.find('#palavras-metrica-desvio').trigger('change')
    await wrapper.find('.filter-aplicar').trigger('click')

    // Média = 181,2 e desvio padrão ≈ 158,8: só a Q5 (500) fica a mais de 1 desvio da média
    expect(wrapper.findAll('.barra-rotulo').map((item) => item.text())).toEqual(['Q5'])
  })

  it('não mostra linha de média nas barras', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        ano: 2024,
        questoes: [questao(1, 1, 100), questao(2, 1, 200), questao(91, 2, 50)]
      }
    })

    const wrapper = mount(PalavrasQuestoesGrafico, { props: { ano: 2024 } })
    await flushPromises()

    expect(wrapper.findAll('.barra-media')).toHaveLength(0)
    expect(wrapper.text()).toContain('Palavras do enunciado - palavras das alternativas')
  })

  it('mostra o idioma nas questões de Q1 a Q5 que existem em inglês e espanhol', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        ano: 2024,
        questoes: [questao(1, 1, 100, 'inglês'), questao(1, 1, 120, 'espanhol'), questao(2, 1, 80)]
      }
    })

    const wrapper = mount(PalavrasQuestoesGrafico, { props: { ano: 2024 } })
    await flushPromises()

    const rotulos = wrapper.findAll('.barra-rotulo').map((r) => r.text())
    expect(rotulos).toEqual(['Q1 (inglês)', 'Q1 (espanhol)', 'Q2'])
  })

  it('mostra o que cada parte da barra representa ao passar o mouse', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        ano: 2024,
        questoes: [questao(1, 1, 100, 'geral', 40)]
      }
    })

    const wrapper = mount(PalavrasQuestoesGrafico, { props: { ano: 2024 } })
    await flushPromises()

    await wrapper.find('.barra:not(.barra-alternativas)').trigger('mouseenter', { clientX: 10, clientY: 20 })
    expect(wrapper.find('.dica-flutuante').text()).toBe('Quantidade de palavras do enunciado')

    await wrapper.find('.barra-alternativas').trigger('mouseenter', { clientX: 10, clientY: 20 })
    expect(wrapper.find('.dica-flutuante').text()).toBe('Quantidade de palavras das alternativas')

    await wrapper.find('.barra-alternativas').trigger('mouseleave')
    expect(wrapper.find('.dica-flutuante').exists()).toBe(false)
  })

  it('mostra a mensagem de erro quando a API falha', async () => {
    vi.mocked(http.get).mockRejectedValue({
      response: { data: { error: 'Sem dados para o ano 2021' } }
    })

    const wrapper = mount(PalavrasQuestoesGrafico, { props: { ano: 2021 } })
    await flushPromises()

    expect(wrapper.text()).toContain('Sem dados para o ano 2021')
    expect(wrapper.findAll('.barra-linha')).toHaveLength(0)
  })

  it('mostra as cores do ano por dia, sem repetir a cor que existe nos dois dias', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { questoes: [questao(1, 1, 100)] } })

    const wrapper = mount(PalavrasQuestoesGrafico, { props: { ano: 2024 } })
    await flushPromises()
    await wrapper.find('.filter-btn').trigger('click')

    // Todos os dias: Azul aparece uma vez só
    const todas = wrapper.findAll('input[name="filtro-cor-palavras"]').map((input) => input.attributes('id'))
    expect(todas).toEqual(['palavras-cor-Amarelo', 'palavras-cor-Azul', 'palavras-cor-Branco', 'palavras-cor-Verde', 'palavras-cor-Cinza'])
    expect(wrapper.find('label[for="palavras-cor-Azul"]').text()).toBe('Azul')
  })

  it('no Dia 1 mostra Branco e no Dia 2 mostra Cinza, com a cor do ano', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { questoes: [questao(1, 1, 100)] } })

    const wrapper = mount(PalavrasQuestoesGrafico, { props: { ano: 2024 } })
    await flushPromises()
    await wrapper.find('.filter-btn').trigger('click')

    await wrapper.find('#palavras-dia-1').setValue(true)
    expect(wrapper.find('#palavras-cor-Branco').exists()).toBe(true)
    expect(wrapper.find('#palavras-cor-Cinza').exists()).toBe(false)

    await wrapper.find('#palavras-dia-2').setValue(true)
    expect(wrapper.find('#palavras-cor-Cinza').exists()).toBe(true)
    expect(wrapper.find('#palavras-cor-Branco').exists()).toBe(false)
    expect(wrapper.find('#palavras-cor-Verde').exists()).toBe(true)
  })

  it('busca a cor escolhida ao clicar em Aplicar', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { questoes: [questao(1, 1, 100)] } })

    const wrapper = mount(PalavrasQuestoesGrafico, { props: { ano: 2024 } })
    await flushPromises()
    await wrapper.find('.filter-btn').trigger('click')

    await wrapper.find('#palavras-cor-Amarelo').setValue(true)
    expect(http.get).toHaveBeenCalledTimes(1)

    await wrapper.find('.filter-aplicar').trigger('click')
    await flushPromises()

    expect(http.get).toHaveBeenLastCalledWith('/metricas/palavras-questoes', { params: { ano: 2024, cor: 'Amarelo' } })
  })
})
