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

const montar = async (ano = 2020) => {
  const wrapper = mount(CorrelacaoDificuldadeMapa, { props: { ano } })
  await flushPromises()
  return wrapper
}

describe('CorrelacaoDificuldadeMapa', () => {
  beforeEach(() => {
    vi.mocked(http.get).mockReset()
    vi.mocked(http.get).mockResolvedValue({ data: respostaPadrao })
  })

  it('busca as correlações e desenha um único mapa com 12 células (3 níveis × 4 áreas) do ano', async () => {
    const wrapper = await montar(2020)

    expect(http.get).toHaveBeenCalledWith('/metricas/correlacoes-dificuldade')
    expect(wrapper.findAll('.grade-correlacao')).toHaveLength(1)
    expect(wrapper.findAll('.celula-rect')).toHaveLength(12)
  })

  it('não tem paginação: sem setas nem indicador de nível', async () => {
    const wrapper = await montar(2020)

    expect(wrapper.find('[aria-label="Próximo nível"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Nível anterior"]').exists()).toBe(false)
    expect(wrapper.find('.group-indicator').exists()).toBe(false)
  })

  it('mostra as três linhas de dificuldade (fácil, médio e difícil) no mesmo mapa', async () => {
    const wrapper = await montar(2020)
    const texto = wrapper.find('.mapa-calor').text()

    expect(texto).toContain('Fácil')
    expect(texto).toContain('Médio')
    expect(texto).toContain('Difícil')
  })

  it('mostra as áreas com nome completo nas colunas', async () => {
    const wrapper = await montar(2020)
    const texto = wrapper.find('.mapa-calor').text()

    expect(texto).toContain('Ciências da Natureza')
    expect(texto).toContain('Matemática')
  })

  it('não mostra texto de resultado nem título por nível abaixo do mapa', async () => {
    const wrapper = await montar(2020)

    expect(wrapper.find('.grade-titulo').exists()).toBe(false)
    expect(wrapper.find('.grade-resultado').exists()).toBe(false)
  })

  it('mostra só os dados do ano recebido e troca ao mudar o ano', async () => {
    const wrapper = await montar(2020)
    // 2020: 5 células com dado e 7 traços
    expect(wrapper.findAll('.valor-celula').filter((t) => t.text() === '—')).toHaveLength(7)

    await wrapper.setProps({ ano: 2022 })
    await flushPromises()
    // 2022: só CN difícil tem dado (linha difícil = células 8 a 11; CN é a 3ª área, índice 10)
    expect(wrapper.findAll('.valor-celula')[10].text()).toBe('-0.65')
    expect(wrapper.findAll('.valor-celula').filter((t) => t.text() === '—')).toHaveLength(11)
  })

  it('mostra a legenda de cores logo abaixo do subtítulo, fora de "Mais informações"', async () => {
    const wrapper = await montar()
    const legendaCores = wrapper.findAll('.correlacoes-legenda li').map((li) => li.text())

    expect(legendaCores[0]).toContain('Violeta = correlação positiva')
    expect(legendaCores[1]).toContain('Azul = correlação negativa')
    expect(legendaCores[2]).toContain('Branco = quase nenhuma relação')
    expect(wrapper.find('.correlacoes-cores').element.previousElementSibling?.className).toBe('correlacoes-subtitulo')
  })

  it('não repete as cores dentro de "Mais informações"', async () => {
    const wrapper = await montar()
    await wrapper.find('.botao-mais-info').trigger('click')

    const textos = wrapper.findAll('.correlacoes-legenda:not(.correlacoes-cores) li').map((li) => li.text()).join(' ')
    expect(textos).not.toContain('Violeta = correlação positiva')
    expect(textos).toContain('O r mostra a força')
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
    const wrapper = await montar(2020)

    // Fácil, 2020: 2ª célula da 1ª linha é LC. Cada célula tem duas linhas de p: bruto, depois Holm.
    expect(wrapper.findAll('.valor-celula')[1].text()).toBe('-0.08')
    expect(wrapper.findAll('.p-celula')[2].text()).toBe('p bruto = 0.765')
    expect(wrapper.findAll('.p-celula')[3].text()).toBe('p (Holm) = 1.000')
  })

  it('usa a escala violeta/azul: violeta para r positivo e azul para r negativo', async () => {
    const wrapper = await montar(2020)

    const celulas = wrapper.findAll('.celula-rect')
    // Fácil, CN 2020 (r = 0.08), 3ª célula: violeta domina (B > G)
    const [, gCN, bCN] = canaisRgb(celulas[2].attributes('fill'))
    expect(bCN).toBeGreaterThan(gCN)
    // Fácil, LC 2020 (r = -0.08), 2ª célula: azul domina (B > R)
    const [rLC, , bLC] = canaisRgb(celulas[1].attributes('fill'))
    expect(bLC).toBeGreaterThan(rLC)
  })

  it('conta as correlações válidas e diz que nenhuma tem p (Holm) abaixo de 0,05 quando não há', async () => {
    const wrapper = await montar(2020)

    // 2020 tem 5 células com dado (4 fáceis e 1 média), nenhuma com p (Holm) < 0,05
    expect(wrapper.find('.correlacao-leitura').text()).toContain('Resultado: 0 de 5 correlações válidas têm p (Holm) abaixo de 0,05')
    expect(wrapper.find('.significancia-celula').exists()).toBe(false)
  })

  it('marca com círculo escuro e ★ as células com p (Holm) < 0,05 e conta no resultado', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        ...respostaPadrao,
        celulas: [{ ano: 2020, area: 'CH', dificuldade: 'facil', r: -0.5, p: 0.01, pBruto: 0.001, n: 15 }, ...celulasPadrao.slice(1)]
      }
    })
    const wrapper = await montar(2020)

    expect(wrapper.findAll('.significancia-celula')).toHaveLength(1)
    expect(wrapper.find('.significancia-celula text').text()).toBe('★')
    expect(wrapper.find('.correlacao-leitura').text()).toContain('Resultado: 1 de 5 correlações válidas têm p (Holm) abaixo de 0,05')
    expect(wrapper.find('.correlacao-leitura').text()).toContain('não prova que a quantidade de caracteres causou mudança no desempenho')
  })

  it('mostra a legenda do círculo escuro com ★ junto às cores', async () => {
    const wrapper = await montar(2020)
    const textos = wrapper.findAll('.correlacoes-cores li').map((li) => li.text())

    expect(textos[3]).toContain('Círculo escuro com ★ = p (Holm) < 0,05')
  })
})
