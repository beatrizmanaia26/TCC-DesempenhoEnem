import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CorrelacaoMetadesProva from '../components/CorrelacaoMetadesProva.vue'

const questao = (rotulo: string, caracteres: number, taxa: number | null, dificuldade: string | null) => ({
  rotulo,
  caracteres,
  taxa_acerto_percentual: taxa,
  dificuldade
})

// Fácil: caracteres 100, 200, 300, 400 -> mediana 250; menos = 100 e 200 (acerto média 70); mais = 300 e 400 (acerto média 30)
const questoesFacil = [
  questao('Q1', 100, 80, 'facil'),
  questao('Q2', 200, 60, 'facil'),
  questao('Q3', 300, 40, 'facil'),
  questao('Q4', 400, 20, 'facil')
]

describe('CorrelacaoMetadesProva', () => {
  it('calcula a média de acerto de cada metade pela mediana do nível', () => {
    const wrapper = mount(CorrelacaoMetadesProva, { props: { questoes: questoesFacil } })
    const valores = wrapper.findAll('.valor-barra').map((texto) => texto.text())
    expect(valores).toEqual(['70.0%', '30.0%'])
  })

  it('mostra só as barras do nível escolhido no filtro', async () => {
    const questoes = [
      ...questoesFacil,
      questao('Q5', 100, 50, 'dificil'),
      questao('Q6', 200, 50, 'dificil'),
      questao('Q7', 300, 10, 'dificil'),
      questao('Q8', 400, 10, 'dificil')
    ]
    const wrapper = mount(CorrelacaoMetadesProva, { props: { questoes } })
    expect(wrapper.findAll('.rotulo-nivel').map((texto) => texto.text())).toEqual(['Fácil', 'Difícil'])

    await wrapper.find('.filter-btn').trigger('click')
    await wrapper.find('#metades-prova-dificuldade-dificil').setValue(true)
    await wrapper.find('.filter-aplicar').trigger('click')

    expect(wrapper.findAll('.rotulo-nivel').map((texto) => texto.text())).toEqual(['Difícil'])
  })

  it('não desenha o gráfico quando o nível tem só uma questão', () => {
    const wrapper = mount(CorrelacaoMetadesProva, {
      props: { questoes: [questao('Q1', 100, 80, 'medio')] }
    })
    expect(wrapper.find('.grafico-metades').exists()).toBe(false)
    expect(wrapper.text()).toContain('Informe os acertos por questão')
  })

  it('ignora questões sem acerto informado ou sem dificuldade', () => {
    // Só Q3 e Q4 contam (nível fácil com acerto); Q1 sem acerto e Q2 sem dificuldade ficam de fora
    const wrapper = mount(CorrelacaoMetadesProva, {
      props: {
        questoes: [
          questao('Q1', 100, null, 'facil'),
          questao('Q2', 200, 60, null),
          questao('Q3', 300, 40, 'facil')
        ]
      }
    })
    expect(wrapper.find('.grafico-metades').exists()).toBe(false)
  })
})
