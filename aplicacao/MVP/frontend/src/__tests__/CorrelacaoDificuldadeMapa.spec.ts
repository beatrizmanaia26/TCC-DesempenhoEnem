import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CorrelacaoDificuldadeMapa from '../components/CorrelacaoDificuldadeMapa.vue'
import http from '../services/http.js'

vi.mock('../services/http.js', () => ({
  default: { get: vi.fn() }
}))

// Resposta no formato de /api/metricas/correlacoes-dificuldade: células ano × área × nível.
// Uma célula por (nível, ano, área) = 3 × 5 × 4 = 60. Aqui vêm só as usadas nos testes.
const celulasPadrao = [
  { ano: 2020, area: 'CH', dificuldade: 'facil', r: -0.0107, p: 1, n: 14 },
  { ano: 2020, area: 'LC', dificuldade: 'facil', r: -0.0784, p: 1, n: 15 },
  { ano: 2020, area: 'CN', dificuldade: 'facil', r: 0.0786, p: 1, n: 14 },
  { ano: 2020, area: 'MT', dificuldade: 'facil', r: -0.2, p: 1, n: 15 },
  { ano: 2024, area: 'CN', dificuldade: 'media', r: 0.4105, p: 0.9, n: 15 }
]

const respostaPadrao = {
  niveis: [
    { dificuldade: 'facil', r: 0.33, p: 0.00015, n: 308 },
    { dificuldade: 'media', r: 0.5422, p: 0.00015, n: 305 },
    { dificuldade: 'dificil', r: 0.2981, p: 0.00015, n: 295 }
  ],
  celulas: celulasPadrao
}

// Extrai R, G, B de uma string "rgb(r, g, b)". Aceita undefined (atributo ausente).
function canaisRgb(cor: string | undefined): number[] {
  return ((cor ?? '').match(/\d+/g) ?? []).map(Number)
}

describe('CorrelacaoDificuldadeMapa', () => {
  beforeEach(() => {
    vi.mocked(http.get).mockReset()
  })

  it('busca as correlações e desenha uma grade por nível com 20 células cada (ano × área)', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: respostaPadrao })

    const wrapper = mount(CorrelacaoDificuldadeMapa)
    await flushPromises()

    expect(http.get).toHaveBeenCalledWith('/metricas/correlacoes-dificuldade')
    expect(wrapper.findAll('.grade-correlacao')).toHaveLength(3)
    expect(wrapper.findAll('.celula-rect')).toHaveLength(60)
  })

  it('mostra r e p ajustado (Holm) nas células com dado', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: respostaPadrao })

    const wrapper = mount(CorrelacaoDificuldadeMapa)
    await flushPromises()

    // Primeira grade (fácil), 2ª célula da 1ª linha: LC em 2020
    expect(wrapper.findAll('.valor-celula')[1].text()).toBe('-0.08')
    expect(wrapper.findAll('.p-celula')[0].text()).toBe('p (Holm) = 1.000')
  })

  it('usa a escala verde/azul: verde para r positivo e azul para r negativo', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: respostaPadrao })

    const wrapper = mount(CorrelacaoDificuldadeMapa)
    await flushPromises()

    const celulas = wrapper.findAll('.celula-rect')
    // Fácil, CN 2020 (r = 0.08), 3ª célula: verde domina (G > B)
    const [, gCN, bCN] = canaisRgb(celulas[2].attributes('fill'))
    expect(gCN).toBeGreaterThan(bCN)
    // Fácil, LC 2020 (r = -0.08), 2ª célula: azul domina (B > R)
    const [rLC, , bLC] = canaisRgb(celulas[1].attributes('fill'))
    expect(bLC).toBeGreaterThan(rLC)
  })

  it('mostra traço (—) nas células sem dado', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: respostaPadrao })

    const wrapper = mount(CorrelacaoDificuldadeMapa)
    await flushPromises()

    // 60 células, 5 com dado: 55 vazias
    expect(wrapper.findAll('.valor-celula').filter((t) => t.text() === '—')).toHaveLength(55)
  })

  it('mostra o resultado de cada tabela abaixo do título, com a frase de incerteza e Holm', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: respostaPadrao })

    const wrapper = mount(CorrelacaoDificuldadeMapa)
    await flushPromises()

    const resultados = wrapper.findAll('.grade-resultado')
    expect(resultados).toHaveLength(3)
    resultados.forEach((resultado) => {
      expect(resultado.text()).toContain('Nenhuma das 60 células é significativa após a correção de Holm')
    })
    expect(resultados[1].text()).toContain('2020, MT, r = 0,64')
  })

  it('mostra a mensagem de erro quando a API falha', async () => {
    vi.mocked(http.get).mockRejectedValue({ response: { data: { error: 'Arquivo não encontrado' } } })

    const wrapper = mount(CorrelacaoDificuldadeMapa)
    await flushPromises()

    expect(wrapper.find('.correlacoes-erro').text()).toBe('Arquivo não encontrado')
    expect(wrapper.find('.mapa-calor').exists()).toBe(false)
  })
})
