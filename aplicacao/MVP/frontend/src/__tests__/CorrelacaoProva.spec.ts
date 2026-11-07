import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { calcularCorrelacaoProva, MINIMO_QUESTOES } from '../services/correlacaoProva.js'
import CorrelacaoProvaGrafico from '../components/CorrelacaoProvaGrafico.vue'

const pontos = (xs: number[], ys: number[]) => xs.map((x, indice) => ({ rotulo: `Q${indice + 1}`, x, y: ys[indice] }))

describe('calcularCorrelacaoProva', () => {
  it('retorna null abaixo do mínimo de questões', () => {
    expect(calcularCorrelacaoProva(pontos([1, 2], [10, 20]))).toBeNull()
    expect(MINIMO_QUESTOES).toBe(3)
  })

  it('dá r = 1 para relação crescente perfeita e p pequeno', () => {
    const resultado = calcularCorrelacaoProva(pontos([1, 2, 3, 4, 5, 6, 7, 8], [10, 20, 30, 40, 50, 60, 70, 80]))
    expect(resultado?.r).toBeCloseTo(1, 10)
    expect(resultado?.p).toBeLessThan(0.01)
    expect(resultado?.n).toBe(8)
  })

  it('dá r = -1 para relação decrescente perfeita', () => {
    const resultado = calcularCorrelacaoProva(pontos([1, 2, 3, 4, 5], [90, 70, 50, 30, 10]))
    expect(resultado?.r).toBeCloseTo(-1, 10)
  })

  it('calcula Pearson e p pelo teste t (mesmo que stats.linregress)', () => {
    // scipy.stats.linregress([1..10], [2,4,3,6,5,8,7,9,11,10]): r = 0,9515, p = 2,28e-5
    const resultado = calcularCorrelacaoProva(pontos([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [2, 4, 3, 6, 5, 8, 7, 9, 11, 10]))
    expect(resultado?.r).toBeCloseTo(0.9515151515, 8)
    expect(resultado?.p).toBeCloseTo(2.2798549e-5, 9)
  })

  it('retorna null quando todas as questões têm o mesmo acerto', () => {
    expect(calcularCorrelacaoProva(pontos([1, 2, 3], [50, 50, 50]))).toBeNull()
  })

  it('é determinístico: a mesma entrada dá o mesmo p (semente fixa)', () => {
    const entrada = pontos([10, 40, 20, 50, 30, 60], [70, 40, 65, 30, 55, 20])
    const primeiro = calcularCorrelacaoProva(entrada)
    const segundo = calcularCorrelacaoProva(entrada)
    expect(primeiro?.p).toBe(segundo?.p)
    expect(primeiro?.p).toBeGreaterThan(0)
    expect(primeiro?.p).toBeLessThanOrEqual(1)
  })

  it('calcula a reta de mínimos quadrados (pontos percentuais por caractere)', () => {
    // x = [100, 200, 300], y = [80, 70, 60]: inclinação -0,1 e intercepto 90
    const resultado = calcularCorrelacaoProva(pontos([100, 200, 300], [80, 70, 60]))
    expect(resultado?.inclinacao).toBeCloseTo(-0.1, 10)
    expect(resultado?.intercepto).toBeCloseTo(90, 10)
  })
})

describe('CorrelacaoProvaGrafico', () => {
  const questao = (rotulo: string, caracteres: number, taxa: number | null) => ({
    rotulo,
    caracteres,
    taxa_acerto_percentual: taxa
  })

  it('mostra o aviso de amostra pequena e o resultado quando há questões suficientes', () => {
    const wrapper = mount(CorrelacaoProvaGrafico, {
      props: {
        questoes: [questao('Q1', 100, 90), questao('Q2', 200, 70), questao('Q3', 300, 50), questao('Q4', 400, 30)]
      }
    })

    expect(wrapper.text()).toContain('Dispersão: Caracteres da Questão × Acerto')
    expect(wrapper.text()).toContain('Atenção:')
    expect(wrapper.text()).toContain('r de Pearson = -1,00')
    expect(wrapper.find('.grafico-correlacao').exists()).toBe(true)
    expect(wrapper.findAll('.ponto')).toHaveLength(4)
  })

  it('não desenha o gráfico e explica quando não há acertos informados', () => {
    const wrapper = mount(CorrelacaoProvaGrafico, {
      props: { questoes: [questao('Q1', 100, null), questao('Q2', 200, null)] }
    })

    expect(wrapper.find('.grafico-correlacao').exists()).toBe(false)
    expect(wrapper.text()).toContain('Informe os acertos por questão')
  })

  it('pede mais questões quando há menos que o mínimo com acerto informado', () => {
    const wrapper = mount(CorrelacaoProvaGrafico, {
      props: { questoes: [questao('Q1', 100, 90), questao('Q2', 200, 70)] }
    })

    expect(wrapper.text()).toContain('São necessárias pelo menos 3 questões com acerto informado (há 2)')
  })

  it('filtra por dificuldade no menu Filtro e recalcula só com as questões escolhidas', async () => {
    const wrapper = mount(CorrelacaoProvaGrafico, {
      props: {
        questoes: [
          { rotulo: 'Q1', caracteres: 100, taxa_acerto_percentual: 90, dificuldade: 'facil' },
          { rotulo: 'Q2', caracteres: 200, taxa_acerto_percentual: 70, dificuldade: 'medio' },
          { rotulo: 'Q3', caracteres: 300, taxa_acerto_percentual: 50, dificuldade: 'dificil' },
          { rotulo: 'Q4', caracteres: 400, taxa_acerto_percentual: 40, dificuldade: 'dificil' }
        ]
      }
    })

    await wrapper.find('.filter-btn').trigger('click')
    expect(wrapper.find('label[for="prova-dificuldade-todas"]').text()).toBe('Todas')
    expect(wrapper.find('label[for="prova-dificuldade-facil"]').text()).toBe('Fácil')
    expect(wrapper.find('label[for="prova-dificuldade-medio"]').text()).toBe('Média')
    expect(wrapper.find('label[for="prova-dificuldade-dificil"]').text()).toBe('Difícil')

    await wrapper.find('#prova-dificuldade-dificil').setValue()
    await wrapper.find('.filter-aplicar').trigger('click')

    // Só as duas difíceis: n = 2 fica abaixo do mínimo de 3 questões
    expect(wrapper.text()).toContain('São necessárias pelo menos 3 questões com acerto informado neste filtro (há 2)')
    expect(wrapper.find('.grafico-correlacao').exists()).toBe(false)
  })

  it('mostra "Dificuldade não informada" na legenda só quando algum ponto não tem dificuldade', () => {
    const comSem = mount(CorrelacaoProvaGrafico, {
      props: {
        questoes: [
          { rotulo: 'Q1', caracteres: 100, taxa_acerto_percentual: 90, dificuldade: 'facil' },
          { rotulo: 'Q2', caracteres: 200, taxa_acerto_percentual: 70, dificuldade: null },
          { rotulo: 'Q3', caracteres: 300, taxa_acerto_percentual: 50, dificuldade: 'dificil' }
        ]
      }
    })
    expect(comSem.text()).toContain('Dificuldade não informada')

    const todosComNivel = mount(CorrelacaoProvaGrafico, {
      props: {
        questoes: [
          { rotulo: 'Q1', caracteres: 100, taxa_acerto_percentual: 90, dificuldade: 'facil' },
          { rotulo: 'Q2', caracteres: 200, taxa_acerto_percentual: 70, dificuldade: 'medio' },
          { rotulo: 'Q3', caracteres: 300, taxa_acerto_percentual: 50, dificuldade: 'dificil' }
        ]
      }
    })
    expect(todosComNivel.text()).not.toContain('Dificuldade não informada')
  })
})

describe('retaComIntervalo e cor por dificuldade', () => {
  it('usa t de Student com n-2 graus de liberdade (t(0,975; 8) = 2,306)', async () => {
    const { quantilT } = await import('../services/correlacaoProva.js')
    expect(quantilT(0.975, 8)).toBeCloseTo(2.306, 3)
  })

  it('a faixa de IC contém a reta prevista e é mais larga nas pontas', async () => {
    const { retaComIntervalo } = await import('../services/correlacaoProva.js')
    const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const ys = [2, 4, 3, 6, 5, 8, 7, 9, 11, 10]
    const reta = retaComIntervalo(xs, ys, [1, 5.5, 10])
    expect(reta).not.toBeNull()
    reta?.linha.forEach((linha: { previsto: number; icInferior: number; icSuperior: number }) => {
      expect(linha.icInferior).toBeLessThan(linha.previsto)
      expect(linha.icSuperior).toBeGreaterThan(linha.previsto)
    })
    const larguraPonta = reta!.linha[0].icSuperior - reta!.linha[0].icInferior
    const larguraMeio = reta!.linha[1].icSuperior - reta!.linha[1].icInferior
    expect(larguraPonta).toBeGreaterThan(larguraMeio)
  })

  it('colore cada ponto pelo nível de dificuldade informado', () => {
    const wrapper = mount(CorrelacaoProvaGrafico, {
      props: {
        questoes: [
          { rotulo: 'Q1', caracteres: 100, taxa_acerto_percentual: 90, dificuldade: 'facil' },
          { rotulo: 'Q2', caracteres: 200, taxa_acerto_percentual: 70, dificuldade: 'medio' },
          { rotulo: 'Q3', caracteres: 300, taxa_acerto_percentual: 50, dificuldade: 'dificil' }
        ]
      }
    })
    const cores = wrapper.findAll('.ponto').map((ponto) => ponto.attributes('fill'))
    expect(cores).toEqual(['#0070C0', '#F59E0B', '#C0392B'])
    expect(wrapper.find('.faixa-ic').exists()).toBe(true)
    expect(wrapper.text()).toContain('Reta e faixa de Intervalo de Confiança (IC) 95%')
  })

  it('não achata a faixa de IC em 0% e 100%: ela é cortada pela área do gráfico', () => {
    // Acertos altos nas pontas fazem o IC passar de 100%: o corte deve ser pelo clipPath, não por valores limitados
    const wrapper = mount(CorrelacaoProvaGrafico, {
      props: {
        questoes: [
          { rotulo: 'Q1', caracteres: 100, taxa_acerto_percentual: 99, dificuldade: 'facil' },
          { rotulo: 'Q2', caracteres: 200, taxa_acerto_percentual: 40, dificuldade: 'medio' },
          { rotulo: 'Q3', caracteres: 300, taxa_acerto_percentual: 35, dificuldade: 'dificil' },
          { rotulo: 'Q4', caracteres: 400, taxa_acerto_percentual: 20, dificuldade: 'facil' },
          { rotulo: 'Q5', caracteres: 700, taxa_acerto_percentual: 100, dificuldade: 'medio' }
        ]
      }
    })
    expect(wrapper.find('.grafico-correlacao clipPath').exists()).toBe(true)
    expect(wrapper.find('g[clip-path="url(#area-grafico-prova)"]').exists()).toBe(true)
    const pontosFaixa = wrapper.find('.faixa-ic').attributes('points') ?? ''
    const alturas = pontosFaixa.split(' ').map((par) => Number(par.split(',')[1]))
    const topoDaArea = 20 // MARGEM_TOPO em CorrelacaoProvaGrafico.vue
    // Sem limite no yDe, a faixa passa do topo da área (y < MARGEM_TOPO), e o clipPath é quem corta
    expect(Math.min(...alturas)).toBeLessThan(topoDaArea)
  })

  it('desenha a reta e a faixa da menor à maior questão, com o eixo começando na menor', () => {
    const wrapper = mount(CorrelacaoProvaGrafico, {
      props: {
        questoes: [
          { rotulo: 'Q1', caracteres: 100, taxa_acerto_percentual: 99, dificuldade: 'facil' },
          { rotulo: 'Q2', caracteres: 200, taxa_acerto_percentual: 40, dificuldade: 'medio' },
          { rotulo: 'Q3', caracteres: 300, taxa_acerto_percentual: 35, dificuldade: 'dificil' },
          { rotulo: 'Q4', caracteres: 400, taxa_acerto_percentual: 20, dificuldade: 'facil' },
          { rotulo: 'Q5', caracteres: 700, taxa_acerto_percentual: 100, dificuldade: 'medio' }
        ]
      }
    })
    // Eixo X vai de 100 (menor questão) a 700 (maior); a área útil começa em x = 52 e tem 728 px: 100 caracteres ficam em 52 px e 700 em 780 px
    const pontosReta = wrapper.find('.reta').attributes('points').split(' ')
    expect(Number(pontosReta[0].split(',')[0])).toBeCloseTo(52, 5)
    expect(Number(pontosReta.at(-1).split(',')[0])).toBeCloseTo(780, 5)
  })
})
