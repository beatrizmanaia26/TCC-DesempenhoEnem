import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AnaliseImagensProva from '../components/AnaliseImagensProva.vue'

const questao = (n: number) => ({
  questao: n,
  texto: 'Texto da questão',
  quantidade_palavras: 10,
  tem_imagem: n % 2 === 0,
  alternativas: [{ letra: 'A', texto: 'um' }],
  dificuldade: 'facil',
  taxa_acerto_percentual: 50
})

const questoes = [questao(1), questao(2), questao(3), questao(4)]

const montar = (secao: string) => mount(AnaliseImagensProva, { props: { titulo: '', questoes, secao } })

describe('AnaliseImagensProva (seções separadas)', () => {
  it('secao presenca mostra só a pizza', () => {
    const wrapper = montar('presenca')
    expect(wrapper.find('.tempo-bloco').text()).toContain('Presença de imagens na prova')
    expect(wrapper.text()).not.toContain('Detalhamento por questão')
    expect(wrapper.text()).not.toContain('Percentual médio de acertos')
  })

  it('secao acertos mostra só o gráfico de acertos', () => {
    const wrapper = montar('acertos')
    expect(wrapper.text()).toContain('Percentual médio de acertos por presença de imagem')
    expect(wrapper.text()).not.toContain('Presença de imagens na prova')
    expect(wrapper.text()).not.toContain('Detalhamento por questão')
  })

  it('secao tabela mostra só o detalhamento', () => {
    const wrapper = montar('tabela')
    expect(wrapper.text()).toContain('Detalhamento por questão')
    expect(wrapper.text()).not.toContain('Presença de imagens na prova')
    expect(wrapper.text()).not.toContain('Percentual médio de acertos')
  })

  it('sem secao (padrão "todas") mostra os três blocos', () => {
    const wrapper = mount(AnaliseImagensProva, { props: { titulo: '', questoes } })
    expect(wrapper.text()).toContain('Presença de imagens na prova')
    expect(wrapper.text()).toContain('Percentual médio de acertos por presença de imagem')
    expect(wrapper.text()).toContain('Detalhamento por questão')
  })
})
