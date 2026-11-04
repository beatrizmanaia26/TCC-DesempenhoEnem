import { describe, it, expect } from 'vitest'
import { montarSecoes, gerarCsv, gerarXlsx, gerarPdf, fatiasDaPizza, aplicarFiltrosExportacao, analisesSelecionadas, montarCabecalhoTabular } from '../services/exportacaoEnem.js'
import { TEXTO_TEMPO_LEITURA } from '../config/textosAnalises.js'

const dados = {
  resumo: {
    dias: [{ dia: 1, areas: ['Linguagens', 'Humanas'], tempo_total_min: 300, tempo_questoes_min: 120, tempo_textos_min: 30, tempo_restante_min: 150 }]
  },
  tempo: {
    questoes: [{ dia: 1, posicao: 1, area: 'Linguagens', idioma: 'ingles', caracteres: 900, tempo_leitura_minutos: 3.5, dificuldade: 'Fácil' }]
  },
  palavras: {
    questoes: [{ dia: 1, posicao: 1, area: 'Linguagens', idioma: 'ingles', palavras: 80, palavrasAlternativas: 20 }]
  }
}

describe('exportacaoEnem', () => {
  it('monta as três seções na ordem do dropdown de análises', () => {
    const secoes = montarSecoes(dados)
    expect(secoes.map((s) => s.titulo)).toEqual([
      'Resumo do tempo da prova',
      'Tempo de leitura por questão',
      'Palavras por questão'
    ])
    expect(secoes[0]?.linhas[0]).toEqual([1, 'Linguagens, Humanas', 300, 120, 30, 150])
  })

  it('gera CSV com ponto e vírgula, BOM e escapa valores com aspas', () => {
    const secoes = [{ titulo: 'T', colunas: ['a', 'b'], linhas: [['x;y', 'diz "oi"']] }]
    const csv = gerarCsv(secoes)
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('a;b\r\n"x;y";"diz ""oi"""')
  })
  it('o CSV traz o cabeçalho da prova e a descrição de cada análise, igual à tela', () => {
    const csv = gerarCsv(montarSecoes(dados), montarCabecalhoTabular(2025))
    expect(csv).toContain('Prova;ENEM 2025')
    expect(csv).toContain('Velocidade de leitura considerada (caracteres/minuto);1100;Referência: Messias et al., 2008')
    expect(csv).toContain(TEXTO_TEMPO_LEITURA.subtitulo)
    expect(csv).toContain('Cálculos:')
    expect(csv).toContain('Tempo de leitura por questão')
  })

  it('cada seção tem um id estável usado pelo menu Filtro', () => {
    expect(montarSecoes(dados).map((s) => s.id)).toEqual(['resumo', 'tempo', 'palavras'])
  })



  it('gera um arquivo Excel não vazio', async () => {
    const conteudo = await gerarXlsx(montarSecoes(dados))
    expect(conteudo.byteLength).toBeGreaterThan(0)
  })

  it('gera o PDF com os gráficos em sequência (sem página forçada entre eles)', () => {
    const documento = gerarPdf(dados, 2025)
    expect(documento.getNumberOfPages()).toBeGreaterThanOrEqual(1)
    expect(documento.getNumberOfPages()).toBeLessThan(3)
    expect(documento.output('arraybuffer').byteLength).toBeGreaterThan(0)
  })

  it('gera o PDF com os cartões de correlação capturados da tela, como imagem', () => {
    // PNG 1x1 válido, só para o jsPDF desenhar a imagem
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    const cartoes = [{ titulo: 'Dispersão: Caracteres da Questão × Acerto', dataUrl: png, larguraTela: 960, alturaTela: 400, larguraCartao: 960 }]
    const bytes = new Uint8Array(gerarPdf(dados, 2025, undefined, cartoes).output('arraybuffer'))
    const conteudo = new TextDecoder('latin1').decode(bytes)
    expect(conteudo).toContain('/Subtype /Image')
  })

  it('gera o PDF com o bloco de informações da prova, igual à tela', () => {
    const bytes = new Uint8Array(gerarPdf(dados, 2025).output('arraybuffer'))
    const conteudo = new TextDecoder('latin1').decode(bytes)
    expect(conteudo).toContain('Velocidade de leitura considerada:')
    expect(conteudo).toContain('1100 caracteres/minuto')
    expect(conteudo).toContain('Messias et al., 2008')
  })

  it('a pizza usa as frações da tela e somam 100%', () => {
    const fatias = fatiasDaPizza(dados.resumo)
    const soma = fatias.reduce((total, fatia) => total + fatia.percentual, 0)
    expect(soma).toBeCloseTo(100, 6)
    expect(fatias.map((fatia) => fatia.rotulo)).toEqual([
      'Leitura das questões',
      'Leitura dos textos introdutórios',
      'Restante'
    ])
    expect(fatias[0]?.valor).toBe(120)
  })

  it('aplica o dia e o filtro de palavras da tela antes de exportar', () => {
    const base = {
      resumo: {
        dias: [
          { dia: 1, areas: ['LC'], tempo_total_min: 300, tempo_questoes_min: 120, tempo_textos_min: 30, tempo_restante_min: 150 },
          { dia: 2, areas: ['MT'], tempo_total_min: 300, tempo_questoes_min: 100, tempo_textos_min: 20, tempo_restante_min: 180 }
        ]
      },
      tempo: {
        questoes: [
          { dia: 1, posicao: 1, area: 'LC', idioma: 'geral', caracteres: 900, tempo_leitura_minutos: 1, dificuldade: 'facil' },
          { dia: 2, posicao: 2, area: 'MT', idioma: 'geral', caracteres: 900, tempo_leitura_minutos: 2, dificuldade: 'media' }
        ]
      },
      palavras: {
        questoes: [
          { dia: 1, posicao: 1, area: 'LC', idioma: 'geral', palavras: 10, palavrasAlternativas: 5 },
          { dia: 2, posicao: 2, area: 'MT', idioma: 'geral', palavras: 40, palavrasAlternativas: 5 }
        ]
      }
    }
    const filtrado = aplicarFiltrosExportacao(base, {
      resumo: { dia: 1 },
      tempo: { dia: 1, areas: [], dificuldade: 'todas', tempo: 'padrao' },
      palavras: { dia: 2, areas: [], metrica: 'padrao' }
    })
    expect(filtrado.resumo.dias.map((d: { dia: number }) => d.dia)).toEqual([1])
    expect(filtrado.tempo.questoes.map((q: { posicao: number }) => q.posicao)).toEqual([1])
    expect(filtrado.palavras.questoes.map((q: { posicao: number }) => q.posicao)).toEqual([2])
  })

  it('escolhe as seções pelo menu Filtro: tempo de prova não inclui palavras', () => {
    const analises = analisesSelecionadas(new Set(['reading-time']))
    expect(analises).toEqual({ resumo: true, tempo: true, palavras: false })
    expect(analisesSelecionadas(new Set(['word-count']))).toEqual({ resumo: false, tempo: false, palavras: true })
  })
})
