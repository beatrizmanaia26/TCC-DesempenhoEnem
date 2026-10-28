import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ResumoTempoProva from '../components/ResumoTempoProva.vue'
import http from '../services/http.js'

vi.mock('../services/http.js', () => ({
  default: { get: vi.fn() }
}))

// Resposta no formato devolvido por /api/metricas/tempo-resumo
const respostaPadrao = {
  ano: 2024,
  dias: [
    {
      dia: 1,
      areas: ['LC', 'CH'],
      tempo_total_min: 255,
      tempo_questoes_min: 100,
      tempo_textos_min: 2,
      tempo_restante_min: 153
    },
    {
      dia: 2,
      areas: ['CN', 'MT'],
      tempo_total_min: 300,
      tempo_questoes_min: 50,
      tempo_textos_min: 1,
      tempo_restante_min: 249
    }
  ]
}

describe('ResumoTempoProva', () => {
  beforeEach(() => {
    vi.mocked(http.get).mockReset()
  })

  it('busca o resumo do ano e mostra as três fatias com os totais de todos os dias', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: respostaPadrao })

    const wrapper = mount(ResumoTempoProva, { props: { ano: 2024 } })
    await flushPromises()

    expect(http.get).toHaveBeenCalledWith('/metricas/tempo-resumo', { params: { ano: 2024 } })
    expect(wrapper.text()).toContain('Tempo total disponível: 555.00 min')
    expect(wrapper.findAll('.pizza path')).toHaveLength(3)
    expect(wrapper.text()).toContain('150.00 min')
    expect(wrapper.text()).toContain('3.00 min')
    expect(wrapper.text()).toContain('402.00 min')
  })

  it('mostra só o dia escolhido ao clicar em Aplicar', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: respostaPadrao })

    const wrapper = mount(ResumoTempoProva, { props: { ano: 2024 } })
    await flushPromises()
    await wrapper.find('.filter-btn').trigger('click')
    await wrapper.find('#resumo-dia-1').trigger('change')
    await wrapper.find('.filter-aplicar').trigger('click')

    expect(wrapper.text()).toContain('Tempo total disponível: 255.00 min')
    expect(wrapper.text()).toContain('100.00 min')
    expect(wrapper.text()).toContain('153.00 min')
    expect(wrapper.text()).not.toContain('555.00')
  })

  it('descarta a escolha do filtro quando o menu é fechado sem aplicar', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: respostaPadrao })

    const wrapper = mount(ResumoTempoProva, { props: { ano: 2024 } })
    await flushPromises()
    await wrapper.find('.filter-btn').trigger('click')
    await wrapper.find('#resumo-dia-2').trigger('change')
    await wrapper.find('.filter-btn').trigger('click')

    expect(wrapper.text()).toContain('Tempo total disponível: 555.00 min')

    await wrapper.find('.filter-btn').trigger('click')
    expect((wrapper.find('#resumo-dia-todos').element as HTMLInputElement).checked).toBe(true)
  })

  it('mostra a mensagem de erro quando a API falha', async () => {
    vi.mocked(http.get).mockRejectedValue({
      response: { data: { error: 'Sem dados para o ano 1999' } }
    })

    const wrapper = mount(ResumoTempoProva, { props: { ano: 1999 } })
    await flushPromises()

    expect(wrapper.text()).toContain('Sem dados para o ano 1999')
    expect(wrapper.findAll('.pizza path')).toHaveLength(0)
  })
})
