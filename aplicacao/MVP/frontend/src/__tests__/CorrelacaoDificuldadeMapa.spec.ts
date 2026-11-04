import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import CorrelacaoDificuldadeMapa from '../components/CorrelacaoDificuldadeMapa.vue'
import http from '../services/http.js'

vi.mock('../services/http.js', () => ({
  default: { get: vi.fn() }
}))

// Resposta no formato de /api/metricas/correlacoes-dificuldade: células ano × área × nível.
// Uma célula por (nível, ano, área) = 3 × 5 × 4 = 60. Aqui vêm só as usadas nos testes.
const celulasPadrao = [
  { ano: 2020, area: 'CH', dificuldade: 'facil', r: -0.0107, p: 1, pBruto: 0.9735, n: 15 },
  { ano: 2020, area: 'LC', dificuldade: 'facil', r: -0.0784, p: 1, pBruto: 0.7652, n: 17 },
  { ano: 2020, area: 'CN', dificuldade: 'facil', r: 0.0786, p: 1, pBruto: 0.7876, n: 15 },
  { ano: 2020, area: 'MT', dificuldade: 'facil', r: -0.1964, p: 1, pBruto: 0.4847, n: 15 },
  { ano: 2020, area: 'MT', dificuldade: 'media', r: 0.6357, p: 0.744, pBruto: 0.0124, n: 15 },
  { ano: 2022, area: 'CN', dificuldade: 'dificil', r: -0.6538, p: 1, pBruto: 0.0191, n: 13 }
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

const montar = async () => {
  const wrapper = mount(CorrelacaoDificuldadeMapa)
  await flushPromises()
  return wrapper
}

// Vai para o nível indicado clicando nas setas (Fácil → Média → Difícil)
const irParaNivel = async (wrapper: VueWrapper, chave: 'facil' | 'media' | 'dificil') => {
  const ordem = ['facil', 'media', 'dificil']
  const alvo = ordem.indexOf(chave)
  for (let i = 0; i < alvo; i++) {
    await wrapper.find('[aria-label="Próximo nível"]').trigger('click')
  }
  await flushPromises()
}

describe('CorrelacaoDificuldadeMapa', () => {
  beforeEach(() => {
    vi.mocked(http.get).mockReset()
    vi.mocked(http.get).mockResolvedValue({ data: respostaPadrao })
  })

  it('busca as correlações e desenha um único mapa com 20 células (ano × área) do nível fácil', async () => {
    const wrapper = await montar()

    expect(http.get).toHaveBeenCalledWith('/metricas/correlacoes-dificuldade')
    expect(wrapper.findAll('.grade-correlacao')).toHaveLength(1)
    expect(wrapper.findAll('.celula-rect')).toHaveLength(20)
    expect(wrapper.find('.grade-titulo').text()).toContain('Nível de dificuldade: fácil')
  })

  it('mostra as setas com o indicador 1 / 3 e o nível fácil no início', async () => {
    const wrapper = await montar()

    expect(wrapper.find('.group-indicator').text()).toBe('1 / 3')
    expect(wrapper.find('.grade-titulo').text()).toContain('Nível de dificuldade: fácil')
    expect((wrapper.find('[aria-label="Nível anterior"]').element as HTMLButtonElement).disabled).toBe(true)
    expect((wrapper.find('[aria-label="Próximo nível"]').element as HTMLButtonElement).disabled).toBe(false)
  })

  it('a seta próximo troca para médio e depois difícil, com o mapa e o resultado de cada nível', async () => {
    const wrapper = await montar()

    await wrapper.find('[aria-label="Próximo nível"]').trigger('click')
    expect(wrapper.find('.group-indicator').text()).toBe('2 / 3')
    expect(wrapper.find('.grade-titulo').text()).toContain('Nível de dificuldade: médio')
    expect(wrapper.find('.grade-resultado').text()).toContain('2020 (MT)')

    await wrapper.find('[aria-label="Próximo nível"]').trigger('click')
    expect(wrapper.find('.group-indicator').text()).toBe('3 / 3')
    expect(wrapper.find('.grade-titulo').text()).toContain('Nível de dificuldade: difícil')
    expect(wrapper.find('.grade-resultado').text()).toContain('2022 (CN)')
    expect((wrapper.find('[aria-label="Próximo nível"]').element as HTMLButtonElement).disabled).toBe(true)
  })

  it('a seta anterior volta de difícil para médio e depois fácil', async () => {
    const wrapper = await montar()
    await irParaNivel(wrapper, 'dificil')

    await wrapper.find('[aria-label="Nível anterior"]').trigger('click')
    expect(wrapper.find('.grade-titulo').text()).toContain('Nível de dificuldade: médio')

    await wrapper.find('[aria-label="Nível anterior"]').trigger('click')
    expect(wrapper.find('.grade-titulo').text()).toContain('Nível de dificuldade: fácil')
    expect((wrapper.find('[aria-label="Nível anterior"]').element as HTMLButtonElement).disabled).toBe(true)
  })

  it('mostra o subtítulo do mapa e não mostra frase de conclusão separada', async () => {
    const wrapper = await montar()
    expect(wrapper.find('.correlacoes-subtitulo').text()).toContain('separado por nível de dificuldade')
    expect(wrapper.find('.correlacoes-frase').exists()).toBe(false)
  })

  it('mostra a mensagem de erro quando a API falha', async () => {
    vi.mocked(http.get).mockRejectedValue({ response: { data: { error: 'Arquivo não encontrado' } } })

    const wrapper = await montar()

    expect(wrapper.find('.correlacoes-erro').text()).toBe('Arquivo não encontrado')
    expect(wrapper.find('.mapa-calor').exists()).toBe(false)
  })

  it('mostra r, p bruto e p ajustado (Holm) nas células com dado', async () => {
    const wrapper = await montar()

    // Fácil, 2020: 2ª célula da 1ª linha é LC. Cada célula tem duas linhas de p: bruto, depois Holm.
    expect(wrapper.findAll('.valor-celula')[1].text()).toBe('-0.08')
    expect(wrapper.findAll('.p-celula')[2].text()).toBe('p bruto = 0.765')
    expect(wrapper.findAll('.p-celula')[3].text()).toBe('p (Holm) = 1.000')
  })

  it('usa a escala verde/azul: verde para r positivo e azul para r negativo', async () => {
    const wrapper = await montar()

    const celulas = wrapper.findAll('.celula-rect')
    // Fácil, CN 2020 (r = 0.08), 3ª célula: verde domina (G > B)
    const [, gCN, bCN] = canaisRgb(celulas[2].attributes('fill'))
    expect(gCN).toBeGreaterThan(bCN)
    // Fácil, LC 2020 (r = -0.08), 2ª célula: azul domina (B > R)
    const [rLC, , bLC] = canaisRgb(celulas[1].attributes('fill'))
    expect(bLC).toBeGreaterThan(rLC)
  })

  it('mostra traço (—) nas células sem dado do nível escolhido', async () => {
    const wrapper = await montar()

    // Fácil: 20 células, 4 com dado (2020) e 16 vazias
    expect(wrapper.findAll('.valor-celula').filter((t) => t.text() === '—')).toHaveLength(16)
  })
})
