import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TempoIgualPorQuestao from '../components/TempoIgualPorQuestao.vue'
import http from '../services/http.js'

vi.mock('../services/http.js', () => ({
  default: { get: vi.fn() }
}))

const questao = (posicao: number, dia: number, minutos: number, idioma = 'geral') => ({
  ano: 2024,
  dia,
  posicao,
  idioma,
  rotulo: `Q${posicao}`,
  caracteres: minutos * 1100,
  tempo_leitura_minutos: minutos
})

// Q1 aparece em espanhol e inglês: deve virar uma barra só
const respostaQuestoes = {
  ano: 2024,
  total_questoes: 5,
  questoes: [
    questao(1, 1, 1, 'espanhol'),
    questao(1, 1, 2, 'inglês'),
    questao(2, 1, 0.5),
    questao(91, 2, 0.4),
    questao(92, 2, 1)
  ]
}

// Dia 1: restante 10 min / 2 questões = 5 min. Dia 2: restante 30 min / 2 questões = 15 min.
const respostaResumo = {
  ano: 2024,
  dias: [
    { dia: 1, areas: ['LC', 'CH'], tempo_total_min: 255, tempo_questoes_min: 0, tempo_textos_min: 0, tempo_restante_min: 10 },
    { dia: 2, areas: ['CN', 'MT'], tempo_total_min: 300, tempo_questoes_min: 0, tempo_textos_min: 0, tempo_restante_min: 30 }
  ]
}

describe('TempoIgualPorQuestao', () => {
  beforeEach(() => {
    vi.mocked(http.get).mockReset()
    vi.mocked(http.get).mockImplementation(async (url: string) => ({
      data: url.includes('tempo-resumo') ? respostaResumo : respostaQuestoes
    }))
  })

  it('mostra o tempo igual por questão de cada dia a partir do restante', async () => {
    const wrapper = mount(TempoIgualPorQuestao, { props: { ano: 2024 } })
    await flushPromises()

    expect(wrapper.text()).toContain('5.00 min por questão')
    expect(wrapper.text()).toContain('15.00 min por questão')
  })

  it('mostra uma barra por questão, sem repetir Q1 a Q5', async () => {
    const wrapper = mount(TempoIgualPorQuestao, { props: { ano: 2024 } })
    await flushPromises()

    expect(wrapper.findAll('.barra-linha')).toHaveLength(4)
    const q1 = wrapper.findAll('.barra-rotulo').filter((rotulo) => rotulo.text() === 'Q1')
    expect(q1).toHaveLength(1)
  })

  it('mostra só o dia escolhido ao clicar em Aplicar', async () => {
    const wrapper = mount(TempoIgualPorQuestao, { props: { ano: 2024 } })
    await flushPromises()
    await wrapper.find('.filter-btn').trigger('click')
    await wrapper.find('#igual-dia-2').trigger('change')
    await wrapper.find('.filter-aplicar').trigger('click')

    expect(wrapper.findAll('.barra-linha')).toHaveLength(2)
    expect(wrapper.text()).not.toContain('Dia 1')
  })

  it('zera a parte cinza quando a leitura passa do tempo igual', async () => {
    const wrapper = mount(TempoIgualPorQuestao, { props: { ano: 2024 } })
    await flushPromises()

    // Escala comum = 15 min (tempo igual do dia 2).
    // Q1 do dia 1: leitura 1 min, tempo igual 5 min -> cinza de 4 min = 4/15 da escala
    const restantes = wrapper.findAll('.barra-restante')
    expect(restantes).toHaveLength(4)
    expect(restantes[0]?.attributes('style')).toContain('width: 26.66')
  })

  it('mostra a mensagem de erro quando a API falha', async () => {
    vi.mocked(http.get).mockRejectedValue({
      response: { data: { error: 'Sem dados para o ano 1999' } }
    })

    const wrapper = mount(TempoIgualPorQuestao, { props: { ano: 1999 } })
    await flushPromises()

    expect(wrapper.text()).toContain('Sem dados para o ano 1999')
    expect(wrapper.findAll('.barra-linha')).toHaveLength(0)
  })
})
