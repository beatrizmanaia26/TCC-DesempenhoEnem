import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import GraficoTempoLeitura from '../components/GraficoTempoLeitura.vue'
import http from '../services/http.js'

vi.mock('../services/http.js', () => ({
  default: { get: vi.fn() }
}))

const questao = (
  posicao: number,
  dia: number,
  caracteres: number,
  idioma = 'geral',
  dificuldade: string | null = 'media'
) => ({
  ano: 2024,
  dia,
  posicao,
  idioma,
  rotulo: `Q${posicao}`,
  caracteres,
  tempo_leitura_minutos: Math.round((caracteres / 1100) * 100) / 100,
  dificuldade
})

describe('GraficoTempoLeitura', () => {
  beforeEach(() => {
    vi.mocked(http.get).mockReset()
  })

  it('busca as questões do ano e mostra uma barra por questão, separadas por dia', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        questoes: [questao(1, 1, 1100), questao(2, 1, 2200), questao(91, 2, 550)]
      }
    })

    const wrapper = mount(GraficoTempoLeitura, { props: { ano: 2024 } })
    await flushPromises()

    expect(http.get).toHaveBeenCalledWith('/metricas/tempo-leitura-questoes', { params: { ano: 2024 } })
    expect(wrapper.text()).toContain('Tempo gasto para ler cada questão da prova')
    expect(wrapper.text()).toContain('Dia 1 (2 questões)')
    expect(wrapper.text()).toContain('Dia 2 (1 questão)')
    expect(wrapper.findAll('.barra-linha')).toHaveLength(3)
  })

  it('usa a maior questão como escala de 100% da barra', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        questoes: [questao(1, 1, 1100), questao(2, 1, 2200)]
      }
    })

    const wrapper = mount(GraficoTempoLeitura, { props: { ano: 2024 } })
    await flushPromises()

    const barras = wrapper.findAll('.barra')
    expect(barras[0].attributes('style')).toContain('width: 50%')
    expect(barras[1].attributes('style')).toContain('width: 100%')
  })

  it('filtra as barras pelo dia selecionado só ao clicar em Aplicar', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        questoes: [questao(1, 1, 1100), questao(2, 1, 2200), questao(91, 2, 550)]
      }
    })

    const wrapper = mount(GraficoTempoLeitura, { props: { ano: 2024 } })
    await flushPromises()
    await wrapper.find('.filter-btn').trigger('click')

    expect(wrapper.findAll('.barra-linha')).toHaveLength(3)

    await wrapper.find('#dia-1').trigger('change')
    expect(wrapper.findAll('.barra-linha')).toHaveLength(3)

    await wrapper.find('.filter-aplicar').trigger('click')
    expect(wrapper.findAll('.barra-linha')).toHaveLength(2)
    expect(wrapper.text()).not.toContain('Dia 2 (1 questão)')

    await wrapper.find('.filter-btn').trigger('click')
    await wrapper.find('#dia-2').trigger('change')
    await wrapper.find('.filter-aplicar').trigger('click')
    expect(wrapper.findAll('.barra-linha')).toHaveLength(1)

    await wrapper.find('.filter-btn').trigger('click')
    await wrapper.find('#dia-todos').trigger('change')
    await wrapper.find('.filter-aplicar').trigger('click')
    expect(wrapper.findAll('.barra-linha')).toHaveLength(3)
  })

  it('descarta as mudanças do filtro quando o menu é fechado sem aplicar', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        questoes: [questao(1, 1, 1100), questao(91, 2, 550)]
      }
    })

    const wrapper = mount(GraficoTempoLeitura, { props: { ano: 2024 } })
    await flushPromises()
    await wrapper.find('.filter-btn').trigger('click')
    await wrapper.find('#dia-1').trigger('change')

    await wrapper.find('.filter-btn').trigger('click')
    await wrapper.find('.filter-btn').trigger('click')

    expect(wrapper.findAll('.barra-linha')).toHaveLength(2)
    expect((wrapper.find('#dia-todos').element as HTMLInputElement).checked).toBe(true)
  })

  it('filtra por área usando a posição da questão', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        questoes: [
          { ...questao(1, 1, 1100), area: 'LC' },
          { ...questao(50, 1, 2200), area: 'CH' },
          { ...questao(91, 2, 550), area: 'CN' }
        ]
      }
    })

    const wrapper = mount(GraficoTempoLeitura, { props: { ano: 2024 } })
    await flushPromises()
    await wrapper.find('.filter-btn').trigger('click')

    await wrapper.find('#area-LC').trigger('change')
    await wrapper.find('.filter-aplicar').trigger('click')
    expect(wrapper.findAll('.barra-linha')).toHaveLength(1)

    await wrapper.find('.filter-btn').trigger('click')
    await wrapper.find('#area-CH').trigger('change')
    await wrapper.find('.filter-aplicar').trigger('click')
    expect(wrapper.findAll('.barra-linha')).toHaveLength(2)
  })

  it('mostra só as áreas do dia escolhido', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        questoes: [questao(1, 1, 1100), questao(91, 2, 550)]
      }
    })

    const wrapper = mount(GraficoTempoLeitura, { props: { ano: 2024 } })
    await flushPromises()
    await wrapper.find('.filter-btn').trigger('click')

    const areas = () =>
      wrapper.findAll('input[type="checkbox"]').map((input) => wrapper.find(`label[for="${input.attributes('id')}"]`).text())
    expect(areas()).toContain('Matemática')
    expect(areas()).toContain('Linguagens e Códigos')

    await wrapper.find('#dia-1').trigger('change')
    expect(areas()).toEqual(['Linguagens e Códigos', 'Ciências Humanas'])

    await wrapper.find('#dia-2').trigger('change')
    expect(areas()).toEqual(['Ciências da Natureza', 'Matemática'])
  })

  it('mostra um ícone de aviso com o cálculo nas opções de tempo que usam estatística', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        questoes: [questao(1, 1, 1100), questao(2, 1, 550)]
      }
    })

    const wrapper = mount(GraficoTempoLeitura, { props: { ano: 2024 } })
    await flushPromises()
    await wrapper.find('.filter-btn').trigger('click')

    const icones = wrapper.findAll('.filter-menu .info-icon-wrapper')
    expect(icones).toHaveLength(3)
    expect(icones.map((icone) => icone.find('.tooltip').text())).toEqual([
      expect.stringContaining('maior que a média'),
      expect.stringContaining('Q1 − 1,5 × IQR'),
      expect.stringContaining('1 desvio padrão')
    ])
  })

  it('ordena do menor para o maior tempo quando o filtro de tempo é escolhido', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        questoes: [questao(1, 1, 2200), questao(2, 1, 550), questao(3, 1, 1100)]
      }
    })

    const wrapper = mount(GraficoTempoLeitura, { props: { ano: 2024 } })
    await flushPromises()
    await wrapper.find('.filter-btn').trigger('click')

    await wrapper.find('#tempo-menor').trigger('change')
    await wrapper.find('.filter-aplicar').trigger('click')
    const rotulos = wrapper.findAll('.barra-rotulo').map((el) => el.text())
    expect(rotulos).toEqual(['Q2', 'Q3', 'Q1'])
  })

  it('mostra a mensagem de erro quando a API falha', async () => {
    vi.mocked(http.get).mockRejectedValue({
      response: { data: { error: 'Sem dados para o ano 1999' } }
    })

    const wrapper = mount(GraficoTempoLeitura, { props: { ano: 1999 } })
    await flushPromises()

    expect(wrapper.text()).toContain('Sem dados para o ano 1999')
    expect(wrapper.findAll('.barra-linha')).toHaveLength(0)
  })

  it('desenha a parte cinza e a linha de tempo igual a partir do tempo restante do dia', async () => {
    vi.mocked(http.get).mockImplementation(async (url: string) => {
      if (url === '/metricas/tempo-resumo') {
        return { data: { dias: [{ dia: 1, tempo_restante_min: 10 }] } }
      }
      return { data: { questoes: [questao(1, 1, 1100), questao(2, 1, 550)] } }
    })

    const wrapper = mount(GraficoTempoLeitura, { props: { ano: 2024 } })
    await flushPromises()

    // 10 min de restante ÷ 2 questões = 5 min de tempo igual por questão
    const marcas = wrapper.findAll('.barra-marca')
    expect(marcas).toHaveLength(2)
    expect(marcas[0].attributes('style')).toContain('left: 100%')
    expect(wrapper.findAll('.barra-restante')).toHaveLength(2)
  })

  it('mostra a tooltip com o tempo igual por questão ao passar o mouse na barra', async () => {
    vi.mocked(http.get).mockImplementation(async (url: string) => {
      if (url === '/metricas/tempo-resumo') {
        return { data: { dias: [{ dia: 1, tempo_restante_min: 10 }] } }
      }
      return { data: { questoes: [questao(1, 1, 1100), questao(2, 1, 550)] } }
    })

    const wrapper = mount(GraficoTempoLeitura, { props: { ano: 2024 } })
    await flushPromises()
    await wrapper.find('.barra-trilho').trigger('mouseenter', { clientX: 10, clientY: 10 })

    expect(wrapper.find('.dica-flutuante').text()).toContain('5.00 min (restante do dia ÷ 2 questões)')
  })

  it('filtra por dificuldade Fácil só ao clicar em Aplicar e esconde as demais', async () => {
    vi.mocked(http.get).mockImplementation(async (url: string) => {
      if (url === '/metricas/tempo-resumo') return { data: { dias: [] } }
      return {
        data: {
          questoes: [questao(1, 1, 1100, 'geral', 'facil'), questao(2, 1, 550, 'geral', 'dificil')]
        }
      }
    })

    const wrapper = mount(GraficoTempoLeitura, { props: { ano: 2024 } })
    await flushPromises()
    await wrapper.find('.filter-btn').trigger('click')
    await wrapper.find('#dificuldade-facil').setValue(true)

    expect(wrapper.findAll('.barra-linha')).toHaveLength(2)

    await wrapper.find('.filter-aplicar').trigger('click')

    expect(wrapper.findAll('.barra-linha')).toHaveLength(1)
    expect(wrapper.find('.barra-rotulo').text()).toBe('Q1')
  })

  it('mostra o aviso de itens sem parâmetro b na dificuldade', async () => {
    vi.mocked(http.get).mockImplementation(async (url: string) => {
      if (url === '/metricas/tempo-resumo') return { data: { dias: [] } }
      return { data: { questoes: [questao(1, 1, 1100, 'geral', null)] } }
    })

    const wrapper = mount(GraficoTempoLeitura, { props: { ano: 2024 } })
    await flushPromises()
    await wrapper.find('.filter-btn').trigger('click')

    const aviso = wrapper.find('.filter-titulo-com-aviso .info-icon-wrapper .tooltip')
    expect(aviso.text()).toContain('1 item foi excluído')
  })
})
