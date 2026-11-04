import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import MapaCalorCorrelacoes from '../components/MapaCalorCorrelacoes.vue'
import http from '../services/http.js'

vi.mock('../services/http.js', () => ({
  default: { get: vi.fn() }
}))

// Resposta no formato devolvido por /api/metricas/correlacoes-tempo: uma célula por ano × área (20).
const respostaPadrao = {
  celulas: [
    { area: 'CH', ano: 2020, r: -0.2529, p: 1, pBruto: 0.0956, n: 45 },
    { area: 'LC', ano: 2020, r: -0.3072, p: 0.551, pBruto: 0.0297, n: 50 },
    { area: 'CN', ano: 2020, r: 0.0474, p: 1, pBruto: 0.7613, n: 44 },
    { area: 'MT', ano: 2020, r: 0.0987, p: 1, pBruto: 0.5206, n: 44 },
    { area: 'CH', ano: 2022, r: -0.0196, p: 1, pBruto: 0.8962, n: 45 },
    { area: 'LC', ano: 2022, r: -0.2264, p: 1, pBruto: 0.1113, n: 50 },
    { area: 'CN', ano: 2022, r: 0.2106, p: 1, pBruto: 0.1642, n: 45 },
    { area: 'MT', ano: 2022, r: -0.2791, p: 1, pBruto: 0.0676, n: 44 },
    { area: 'CH', ano: 2023, r: -0.2483, p: 1, pBruto: 0.1003, n: 45 },
    { area: 'LC', ano: 2023, r: -0.0886, p: 1, pBruto: 0.5415, n: 50 },
    { area: 'CN', ano: 2023, r: -0.0007, p: 1, pBruto: 0.9968, n: 45 },
    { area: 'MT', ano: 2023, r: -0.3164, p: 0.5916, pBruto: 0.0348, n: 45 },
    { area: 'CH', ano: 2024, r: -0.1742, p: 1, pBruto: 0.2502, n: 45 },
    { area: 'LC', ano: 2024, r: -0.1797, p: 1, pBruto: 0.2087, n: 50 },
    { area: 'CN', ano: 2024, r: 0.3695, p: 0.263, pBruto: 0.0131, n: 44 },
    { area: 'MT', ano: 2024, r: -0.0563, p: 1, pBruto: 0.7135, n: 45 },
    { area: 'CH', ano: 2025, r: -0.0202, p: 1, pBruto: 0.8968, n: 45 },
    { area: 'LC', ano: 2025, r: -0.3083, p: 0.551, pBruto: 0.029, n: 50 },
    { area: 'CN', ano: 2025, r: -0.0705, p: 1, pBruto: 0.6529, n: 43 },
    { area: 'MT', ano: 2025, r: 0.0495, p: 1, pBruto: 0.7473, n: 44 },
  ]
}

// Extrai R, G, B de uma string "rgb(r, g, b)". Aceita undefined (atributo ausente).
function canaisRgb(cor: string | undefined): number[] {
  return ((cor ?? '').match(/\d+/g) ?? []).map(Number)
}

describe('MapaCalorCorrelacoes', () => {
  beforeEach(() => {
    vi.mocked(http.get).mockReset()
  })

  it('busca as correlações e desenha uma grade de 20 células (ano × área)', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: respostaPadrao })

    const wrapper = mount(MapaCalorCorrelacoes)
    await flushPromises()

    expect(http.get).toHaveBeenCalledWith('/metricas/correlacoes-tempo')
    expect(wrapper.findAll('.grade-correlacao')).toHaveLength(1)
    expect(wrapper.findAll('.celula-rect')).toHaveLength(20)
    expect(wrapper.findAll('.valor-celula')).toHaveLength(20)
  })

  it('mostra r, p bruto e p ajustado (Holm) em cada célula, sem contorno de impacto', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: respostaPadrao })

    const wrapper = mount(MapaCalorCorrelacoes)
    await flushPromises()

    // 2ª célula da grade de caracteres: LC em 2020. Cada célula tem duas linhas de p: bruto, depois Holm.
    expect(wrapper.findAll('.valor-celula')[1].text()).toBe('-0.31')
    expect(wrapper.findAll('.p-celula')[2].text()).toBe('p bruto = 0.030')
    expect(wrapper.findAll('.p-celula')[3].text()).toBe('p (Holm) = 0.551')

    const contornos = wrapper.findAll('.celula-rect').filter((r) => r.attributes('stroke') === '#000000')
    expect(contornos).toHaveLength(0)
  })

  it('usa a escala verde/azul: verde para r positivo e azul para r negativo', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: respostaPadrao })

    const wrapper = mount(MapaCalorCorrelacoes)
    await flushPromises()

    const celulas = wrapper.findAll('.celula-rect')
    // CN 2020 (r = 0.05), 3ª célula da grade de caracteres: verde domina (G > B)
    const [, gCN, bCN] = canaisRgb(celulas[2].attributes('fill'))
    expect(gCN).toBeGreaterThan(bCN)
    // LC 2020 (r = -0.31), 2ª célula da grade de caracteres: azul domina (B > R)
    const [rLC, , bLC] = canaisRgb(celulas[1].attributes('fill'))
    expect(bLC).toBeGreaterThan(rLC)
  })

  it('mostra célula vazia quando falta dado de uma célula', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { celulas: respostaPadrao.celulas.slice(0, 2) } })

    const wrapper = mount(MapaCalorCorrelacoes)
    await flushPromises()

    expect(wrapper.findAll('.celula-rect')).toHaveLength(20)
    // Duas células com dado: cada uma tem linha de p bruto e linha de p (Holm)
    expect(wrapper.findAll('.p-celula')).toHaveLength(4)
    // As 18 células sem dado mostram o traço (—) e não o valor de r
    expect(wrapper.findAll('.valor-celula').filter((t) => t.text() === '—')).toHaveLength(18)
  })

  it('mostra a mensagem de erro quando a API falha', async () => {
    vi.mocked(http.get).mockRejectedValue({ response: { data: { error: 'Arquivo não encontrado' } } })

    const wrapper = mount(MapaCalorCorrelacoes)
    await flushPromises()

    expect(wrapper.find('.correlacoes-erro').text()).toBe('Arquivo não encontrado')
    expect(wrapper.find('.mapa-calor').exists()).toBe(false)
  })

  it('traz link para a explicação do coeficiente de Spearman em nova aba', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: respostaPadrao })

    const wrapper = mount(MapaCalorCorrelacoes)
    await flushPromises()

    const link = wrapper.find('.correlacoes-link')
    expect(link.text()).toBe('correlação de Spearman')
    expect(link.attributes('href')).toContain('wikipedia.org')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toContain('noopener')
  })

  it('traz link de "valor de p" apontando para a explicação do valor-p', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: respostaPadrao })

    const wrapper = mount(MapaCalorCorrelacoes)
    await flushPromises()

    const links = wrapper.findAll('.correlacoes-link')
    const linkP = links.find((l) => l.text() === 'valor de p')
    expect(linkP).toBeDefined()
    expect(linkP!.attributes('href')).toBe('https://pt.wikipedia.org/wiki/Valor-p')
  })
})
