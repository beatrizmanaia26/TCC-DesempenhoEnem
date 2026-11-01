import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CorrelacaoMetadesCaracteres from '../components/CorrelacaoMetadesCaracteres.vue'
import http from '../services/http.js'

vi.mock('../services/http.js', () => ({
  default: { get: vi.fn() }
}))

// Resposta de /api/metricas/metades-caracteres?ano=2025 (valores reais do CSV, recorte "todos" com as quatro áreas)
const linha = (
  dia: string,
  areas: string[],
  dificuldade: string,
  metade: string,
  mediana: number,
  caracteresMedio: number,
  acertoMedio: number,
  quantidadeItens: number
) => ({
  ano: 2025, dia, areas, dificuldade, metade, mediana, caracteresMedio, acertoMedio, quantidadeItens
})
const respostaPadrao = {
  linhas: [
    linha('todos', ['CH', 'LC', 'CN', 'MT'], 'facil', 'menos', 831, 573.9, 56.06, 31),
    linha('todos', ['CH', 'LC', 'CN', 'MT'], 'facil', 'mais', 831, 1219.43, 63.04, 30),
    linha('todos', ['CH', 'LC', 'CN', 'MT'], 'media', 'menos', 837, 629.26, 35.83, 31),
    linha('todos', ['CH', 'LC', 'CN', 'MT'], 'media', 'mais', 837, 1284.66, 45.3, 29),
    linha('todos', ['CH', 'LC', 'CN', 'MT'], 'dificil', 'menos', 832, 637.1, 23.78, 30),
    linha('todos', ['CH', 'LC', 'CN', 'MT'], 'dificil', 'mais', 832, 1503.2413793103449, 30.049365157394437, 29),
    linha('1', ['CH', 'LC'], 'facil', 'menos', 975, 749.31, 62.49, 16),
    linha('1', ['CH', 'LC'], 'facil', 'mais', 975, 1461.0, 64.53, 16)
  ]
}

const montar = async () => {
  const wrapper = mount(CorrelacaoMetadesCaracteres, { props: { ano: 2025 } })
  await flushPromises()
  return wrapper
}

describe('CorrelacaoMetadesCaracteres', () => {
  beforeEach(() => {
    vi.mocked(http.get).mockReset()
    vi.mocked(http.get).mockResolvedValue({ data: respostaPadrao })
  })

  it('busca as metades do ano recebido e desenha duas barras por nível', async () => {
    const wrapper = await montar()

    expect(http.get).toHaveBeenCalledWith('/metricas/metades-caracteres', { params: { ano: 2025 } })
    expect(wrapper.findAll('.barra-metade')).toHaveLength(6)
  })

  it('mostra o acerto médio de cada barra com uma casa decimal, nos rótulos dos níveis', async () => {
    const wrapper = await montar()

    const valores = wrapper.findAll('.valor-barra').map((t) => t.text())
    expect(valores).toEqual(['56.1%', '63.0%', '35.8%', '45.3%', '23.8%', '30.0%'])
    expect(wrapper.findAll('.rotulo-nivel').map((t) => t.text())).toEqual(['Fácil', 'Média', 'Difícil'])
  })

  it('o tooltip de cada barra mostra caracteres médios, faixa da mediana e n', async () => {
    const wrapper = await montar()

    const tooltips = wrapper.findAll('.barra-metade title').map((t) => t.text())
    expect(tooltips[0]).toContain('Menos caracteres · ≤ 831 caracteres')
    expect(tooltips[0]).toContain('Caracteres médios: 574')
    expect(tooltips[0]).toContain('Itens: 31')
    expect(tooltips[1]).toContain('Mais caracteres · > 831 caracteres')
    expect(tooltips[1]).toContain('Itens: 30')
  })

  it('ao escolher Dia 1, troca para o recorte do dia 1 (CH e LC)', async () => {
    const wrapper = await montar()
    await wrapper.find('.filter-btn').trigger('click')
    await wrapper.find('#metades-dia-1').trigger('change')
    await wrapper.find('.filter-aplicar').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.barra-metade')).toHaveLength(2)
    expect(wrapper.findAll('.valor-barra').map((t) => t.text())).toEqual(['62.5%', '64.5%'])
  })

  it('mostra "Sem dados" quando o recorte não tem linhas', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { linhas: [] } })

    const wrapper = await montar()

    expect(wrapper.text()).toContain('Sem dados para o filtro escolhido.')
    expect(wrapper.find('.grafico-metades').exists()).toBe(false)
  })

  it('mostra a mensagem de erro quando a API falha', async () => {
    vi.mocked(http.get).mockRejectedValue({ response: { data: { error: 'Arquivo não encontrado' } } })

    const wrapper = await montar()

    expect(wrapper.find('.metades-erro').text()).toBe('Arquivo não encontrado')
    expect(wrapper.find('.grafico-metades').exists()).toBe(false)
  })
})
