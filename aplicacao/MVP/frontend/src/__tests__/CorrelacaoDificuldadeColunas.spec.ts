import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import CorrelacaoDificuldadeColunas from '../components/CorrelacaoDificuldadeColunas.vue'
import http from '../services/http.js'

vi.mock('../services/http.js', () => ({
  default: { get: vi.fn() }
}))

// Mesma resposta de /api/metricas/correlacoes-dificuldade-filtros?ano=2025 (valores reais do CSV)
const linhaNivel = (
  dia: string,
  areas: string[],
  dificuldade: string,
  r: number,
  p: number,
  n: number
) => ({ ano: 2025, dia, areas, dificuldade, r, p, n })
const respostaPadrao = {
  linhas: [
    linhaNivel('todos', ['CH', 'LC', 'CN', 'MT'], 'facil', 0.346990, 0.005750, 61),
    linhaNivel('todos', ['CH', 'LC', 'CN', 'MT'], 'media', 0.490921, 0.000300, 60),
    linhaNivel('todos', ['CH', 'LC', 'CN', 'MT'], 'dificil', 0.455361, 0.000800, 59),
    linhaNivel('1', ['CH', 'LC'], 'facil', 0.075147, 0.682416, 32),
    linhaNivel('1', ['CH', 'LC'], 'media', 0.303152, 0.183791, 32),
    linhaNivel('1', ['CH', 'LC'], 'dificil', 0.431048, 0.044848, 31)
  ]
}

const montar = async () => {
  const wrapper = mount(CorrelacaoDificuldadeColunas, { props: { ano: 2025 } })
  await flushPromises()
  return wrapper
}

const abrirFiltro = async (wrapper: VueWrapper) => {
  await wrapper.find('.filter-btn').trigger('click')
}

describe('CorrelacaoDificuldadeColunas', () => {
  beforeEach(() => {
    vi.mocked(http.get).mockReset()
    vi.mocked(http.get).mockResolvedValue({ data: respostaPadrao })
  })

  it('busca as correlações do ano recebido e desenha uma coluna por nível', async () => {
    const wrapper = await montar()

    expect(http.get).toHaveBeenCalledWith('/metricas/correlacoes-dificuldade-filtros', { params: { ano: 2025 } })
    expect(wrapper.findAll('.grafico-colunas rect')).toHaveLength(3)
  })

  it('mostra r com duas casas e os rótulos dos três níveis no filtro Todos os dias', async () => {
    const wrapper = await montar()

    const textos = wrapper.findAll('.valor-coluna').map((t) => t.text())
    expect(textos).toEqual(['r = 0.35', 'r = 0.49', 'r = 0.46'])
    const rotulos = wrapper.findAll('.rotulo-nivel').map((t) => t.text())
    expect(rotulos).toEqual(['Fácil', 'Média', 'Difícil'])
  })

  it('ao escolher Dia 1, mostra só as áreas do Dia 1 e o recorte correspondente', async () => {
    const wrapper = await montar()
    await abrirFiltro(wrapper)

    await wrapper.find('#correlacao-dia-1').trigger('change')
    const areas = wrapper.findAll('.filter-menu .filter-option input[type="checkbox"]').map((i) => i.attributes('id'))
    expect(areas).toEqual(['correlacao-area-LC', 'correlacao-area-CH'])

    await wrapper.find('.filter-aplicar').trigger('click')
    await flushPromises()
    const textos = wrapper.findAll('.valor-coluna').map((t) => t.text())
    expect(textos).toEqual(['r = 0.08', 'r = 0.30', 'r = 0.43'])
  })

  it('o filtro de área só vale após Aplicar', async () => {
    const wrapper = await montar()
    await abrirFiltro(wrapper)
    await wrapper.find('#correlacao-dia-1').trigger('change')
    await wrapper.find('#correlacao-area-LC').trigger('change')
    await wrapper.find('#correlacao-area-CH').trigger('change')

    expect(wrapper.findAll('.valor-coluna').map((t) => t.text())).toEqual(['r = 0.35', 'r = 0.49', 'r = 0.46'])
    await wrapper.find('.filter-aplicar').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.valor-coluna').map((t) => t.text())).toEqual(['r = 0.08', 'r = 0.30', 'r = 0.43'])
  })

  it('pinta r positivo de verde', async () => {
    const wrapper = await montar()

    wrapper.findAll('.grafico-colunas rect').forEach((rect) => {
      expect(rect.attributes('fill')).toBe('#10B981')
    })
  })

  it('mostra a mensagem de erro quando a API falha', async () => {
    vi.mocked(http.get).mockRejectedValue({ response: { data: { error: 'Arquivo não encontrado' } } })

    const wrapper = await montar()

    expect(wrapper.find('.correlacao-erro').text()).toBe('Arquivo não encontrado')
    expect(wrapper.find('.grafico-colunas').exists()).toBe(false)
  })
})

