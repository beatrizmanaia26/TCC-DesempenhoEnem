import ExcelJS from 'exceljs'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { filtrarDia, filtrarPalavras, filtrarTempoLeitura } from './filtrosAnalise.js'
import { obterInfoProva } from '../config/enemConstants.js'
import { TEXTO_RESUMO_TEMPO, TEXTO_TEMPO_LEITURA, TEXTO_PALAVRAS } from '../config/textosAnalises.js'

// Monta as três seções de análise a partir das respostas das rotas de métricas.
// Cada seção tem um id estável (usado pelo menu Filtro) e o texto explicativo da tela.
export function montarSecoes({ resumo, tempo, palavras }) {
  return [
    {
      id: 'resumo',
      titulo: 'Resumo do tempo da prova',
      texto: TEXTO_RESUMO_TEMPO,
      colunas: ['Dia', 'Áreas', 'Tempo total (min)', 'Tempo das questões (min)', 'Tempo dos textos (min)', 'Tempo restante (min)'],
      linhas: (resumo?.dias ?? []).map((dia) => [
        dia.dia,
        dia.areas.join(', '),
        dia.tempo_total_min,
        dia.tempo_questoes_min,
        dia.tempo_textos_min,
        dia.tempo_restante_min
      ])
    },
    {
      id: 'tempo',
      titulo: 'Tempo de leitura por questão',
      texto: TEXTO_TEMPO_LEITURA,
      colunas: ['Dia', 'Posição', 'Área', 'Idioma', 'Caracteres', 'Tempo de leitura (min)', 'Dificuldade'],
      linhas: (tempo?.questoes ?? []).map((questao) => [
        questao.dia,
        questao.posicao,
        questao.area,
        questao.idioma,
        questao.caracteres,
        questao.tempo_leitura_minutos,
        questao.dificuldade ?? ''
      ])
    },
    {
      id: 'palavras',
      titulo: 'Palavras por questão',
      texto: TEXTO_PALAVRAS,
      colunas: ['Dia', 'Posição', 'Área', 'Idioma', 'Palavras do enunciado', 'Palavras das alternativas'],
      linhas: (palavras?.questoes ?? []).map((questao) => [
        questao.dia,
        questao.posicao,
        questao.area,
        questao.idioma,
        questao.palavras,
        questao.palavrasAlternativas
      ])
    }
  ]
}

// Escapa um valor para CSV: aspas e separador entre aspas, quebra de linha dentro de aspas
function escaparCsv(valor) {
  const texto = String(valor ?? '')
  return /[";\r\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto
}

// Linhas de uma seção: título, descrição e cálculos (quando houver), depois a tabela
export function linhasDaSecao(secao) {
  const texto = secao.texto
    ? [[secao.texto.subtitulo], ...secao.texto.explicacao.map((linha) => [linha]), []]
    : []
  return [[secao.titulo], ...texto, secao.colunas, ...secao.linhas]
}

// Cabeçalho das exportações tabulares: os mesmos dados da prova do bloco do PDF
export function montarCabecalhoTabular(ano) {
  const info = obterInfoProva(ano)
  if (!info) return []
  return [
    ['Prova', `ENEM ${ano}`],
    ['Duração total', info.duracao_total, `Dia 1: ${info.duracao_dia1} | Dia 2: ${info.duracao_dia2}`],
    ['Quantidade total de questões', info.questoes_total, `Dia 1: ${info.questoes_dia1} | Dia 2: ${info.questoes_dia2}`],
    ['Velocidade de leitura considerada (caracteres/minuto)', info.velocidade_leitura, 'Referência: Messias et al., 2008'],
    []
  ]
}

// CSV com ponto e vírgula, que o Excel em português abre direto nas colunas.
// Cabeçalho da prova primeiro, depois cada seção com sua descrição e tabela.
export function gerarCsv(secoes, cabecalho = []) {
  const partes = [cabecalho, ...secoes.map(linhasDaSecao)].filter((linhas) => linhas.length > 0)
  const blocos = partes.map((linhas) => linhas.map((linha) => linha.map(escaparCsv).join(';')).join('\r\n'))
  // BOM no início para o Excel reconhecer acentos
  return '\uFEFF' + blocos.join('\r\n\r\n')
}

// Excel com uma aba por análise. Cada aba leva o cabeçalho da prova, para funcionar sozinha.
export async function gerarXlsx(secoes, cabecalho = []) {
  const livro = new ExcelJS.Workbook()
  secoes.forEach((secao) => {
    const aba = livro.addWorksheet(secao.titulo.slice(0, 31))
    ;[...cabecalho, ...linhasDaSecao(secao)].forEach((linha) => aba.addRow(linha))
  })
  return livro.xlsx.writeBuffer()
}

// PDF: tabela do resumo e os dois gráficos desenhados em vetor, com o visual da tela
const PDF_MARGEM = 14
const PDF_LARGURA_UTIL = 182
const PDF_ALTURA_PAGINA = 297
const PDF_ROTULO_LARGURA = 34
const PDF_VALOR_LARGURA = 22
const PDF_TRILHO_X = PDF_MARGEM + PDF_ROTULO_LARGURA + 3
const PDF_TRILHO_LARGURA = PDF_LARGURA_UTIL - PDF_ROTULO_LARGURA - 3 - PDF_VALOR_LARGURA
const PDF_ALTURA_LINHA = 3.6
const PDF_ALTURA_BARRA = 2.4
const PDF_PASSOS_DEGRADE = 30
const COR_AZUL = [0, 112, 192]
const COR_VERDE = [16, 185, 129]
const COR_TRILHO = [240, 240, 240]
const COR_RESTANTE = [203, 213, 225]
const COR_ALTERNATIVAS = [167, 243, 208]
const COR_VERDE_ESCURO = [16, 185, 129]
const COR_TEXTO = [51, 51, 51]
const COR_VALOR = [102, 102, 102]

// Muda de página quando o próximo bloco não cabe; devolve a nova posição y
function garantirEspaco(doc, y, altura) {
  if (y + altura > PDF_ALTURA_PAGINA - PDF_MARGEM) {
    doc.addPage()
    return PDF_MARGEM
  }
  return y
}

// jsPDF não tem degradê: a barra é desenhada com faixas finas do azul ao verde
function desenharBarraDegrade(doc, x, y, largura, altura) {
  if (largura <= 0) return
  const faixa = largura / PDF_PASSOS_DEGRADE
  for (let i = 0; i < PDF_PASSOS_DEGRADE; i++) {
    const t = i / (PDF_PASSOS_DEGRADE - 1)
    doc.setFillColor(...COR_AZUL.map((cor, k) => Math.round(cor + (COR_VERDE[k] - cor) * t)))
    doc.rect(x + i * faixa, y, faixa + 0.05, altura, 'F')
  }
}

function desenharRetangulo(doc, x, y, largura, altura, cor) {
  if (largura <= 0) return
  doc.setFillColor(...cor)
  doc.rect(x, y, largura, altura, 'F')
}

// Título azul e subtítulo, como nos cabeçalhos da tela. Devolve a posição y depois do cabeçalho
function desenharCabecalhoGrafico(doc, titulo, subtitulo, y) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...COR_AZUL)
  doc.text(titulo, PDF_MARGEM, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COR_VALOR)
  const linhas = doc.splitTextToSize(subtitulo, PDF_LARGURA_UTIL)
  doc.text(linhas, PDF_MARGEM, y + 6)
  return y + 6 + linhas.length * 3.5 + 4
}

// Legenda com a amostra de cada cor ou símbolo do gráfico
function desenharLegenda(doc, itens, y) {
  let cursor = PDF_MARGEM
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COR_TEXTO)
  itens.forEach((item) => {
    if (item.degrade) {
      desenharBarraDegrade(doc, cursor, y - 2.5, 8, 3)
    } else if (item.linha) {
      doc.setDrawColor(...COR_TEXTO)
      doc.setLineWidth(0.5)
      doc.line(cursor + 4, y - 3.5, cursor + 4, y + 0.5)
    } else {
      desenharRetangulo(doc, cursor, y - 2.5, 8, 3, item.cor)
    }
    doc.text(item.rotulo, cursor + 10, y)
    cursor += 10 + doc.getTextWidth(item.rotulo) + 6
  })
  return y + 7
}

// Rótulo da questão à esquerda da barra, como na tela (Q1 (inglês), Q6, etc.)
function rotuloDaQuestao(questao) {
  const rotulo = `Q${questao.posicao}`
  return questao.idioma === 'geral' ? rotulo : `${rotulo} (${questao.idioma})`
}

function desenharRotulo(doc, questao, linhaY) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...COR_TEXTO)
  doc.text(rotuloDaQuestao(questao), PDF_MARGEM + PDF_ROTULO_LARGURA, linhaY + PDF_ALTURA_LINHA / 2 + 1.2, {
    align: 'right'
  })
}

function desenharValor(doc, texto, linhaY) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...COR_VALOR)
  doc.text(texto, PDF_TRILHO_X + PDF_TRILHO_LARGURA + 2, linhaY + PDF_ALTURA_LINHA / 2 + 1.2)
}

// Um bloco por dia, com título e uma linha por questão. desenharLinha(questao, linhaY) desenha cada barra
function desenharDias(doc, questoes, y, desenharLinha) {
  let cursor = y
  ;[1, 2].forEach((dia) => {
    const lista = questoes.filter((questao) => questao.dia === dia)
    if (lista.length === 0) return

    cursor = garantirEspaco(doc, cursor, PDF_ALTURA_LINHA * 2)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...COR_TEXTO)
    doc.text(`Dia ${dia} (${lista.length} ${lista.length === 1 ? 'questão' : 'questões'})`, PDF_MARGEM, cursor)
    cursor += 4
    lista.forEach((questao) => {
      cursor = garantirEspaco(doc, cursor, PDF_ALTURA_LINHA)
      desenharLinha(questao, cursor)
      cursor += PDF_ALTURA_LINHA
    })
    cursor += 2
  })
  return cursor
}

// Pizza do resumo: setores a partir do topo, no sentido horário, como no SVG da tela.
// jsPDF não tem setor de círculo, então cada fatia vira um polígono com pontos no arco
function desenharPizza(doc, fatias, cx, cy, raio) {
  let anguloAtual = 0
  fatias.forEach((fatia) => {
    const inicio = anguloAtual
    anguloAtual += (fatia.percentual / 100) * 360
    if (fatia.percentual <= 0) return

    const ponto = (graus) => {
      const radianos = ((graus - 90) * Math.PI) / 180
      return [cx + raio * Math.cos(radianos), cy + raio * Math.sin(radianos)]
    }

    const passos = Math.max(2, Math.ceil((anguloAtual - inicio) / 2))
    const pontos = [[cx, cy]]
    for (let i = 0; i <= passos; i++) {
      pontos.push(ponto(inicio + ((anguloAtual - inicio) * i) / passos))
    }

    doc.setFillColor(...fatia.cor)
    // doc.lines espera deslocamentos a partir do ponto anterior, começando no centro
    const deslocamentos = pontos.slice(1).map(([x, y], i) => [x - pontos[i][0], y - pontos[i][1]])
    doc.lines(deslocamentos, cx, cy, [1, 1], 'F', true)
  })
}

// Legenda da pizza: cor, nome, minutos e percentual, como na tela
function desenharLegendaPizza(doc, fatias, x, y) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  fatias.forEach((fatia, indice) => {
    const linhaY = y + indice * 8
    desenharRetangulo(doc, x, linhaY - 2.5, 4, 3, fatia.cor)
    doc.setTextColor(...COR_TEXTO)
    doc.text(fatia.rotulo, x + 7, linhaY)
    doc.setTextColor(...COR_VALOR)
    doc.text(`${fatia.valor.toFixed(2)} min (${fatia.percentual.toFixed(1)}%)`, x + 7, linhaY + 3.5)
  })
}

// Fatias da pizza com o mesmo cálculo de ResumoTempoProva.vue (todos os dias somados)
export function fatiasDaPizza(resumo) {
  const dias = resumo.dias ?? []
  const soma = (campo) => dias.reduce((acumulado, dia) => acumulado + dia[campo], 0)
  const total = soma('tempo_total_min')
  const itens = [
    { rotulo: 'Tempo gasto para leitura das questões', valor: soma('tempo_questoes_min'), cor: [0, 112, 192] },
    { rotulo: 'Tempo gasto para leitura dos textos introdutórios', valor: soma('tempo_textos_min'), cor: [147, 197, 253] },
    { rotulo: 'Tempo disponível para análise e resolução das questões', valor: soma('tempo_restante_min'), cor: [16, 185, 129] }
  ]
  return itens.map((item) => ({ ...item, percentual: total ? (item.valor / total) * 100 : 0 }))
}
function desenharGraficoTempo(doc, questoes, restantePorDia, y) {
  const distintasDoDia = (dia) => new Set(questoes.filter((q) => q.dia === dia).map((q) => q.posicao)).size
  const tempoIgualDia = (dia) => {
    const distintas = distintasDoDia(dia)
    return distintas === 0 ? 0 : (restantePorDia[dia] ?? 0) / distintas
  }
  const maiorTempo = Math.max(0, ...questoes.map((q) => q.tempo_leitura_minutos), tempoIgualDia(1), tempoIgualDia(2))
  const largura = (valor) => (maiorTempo === 0 ? 0 : (valor / maiorTempo) * PDF_TRILHO_LARGURA)

  const topo = garantirEspaco(doc, y, 40)
  let cursor = desenharCabecalhoGrafico(
    doc,
    'Tempo de Leitura e Média de Tempo Disponível para Resolver Cada Questão',
    'Compara o tempo de leitura de cada questão com o tempo médio de resolução por item. A linha preta marca essa média diária e a faixa cinza mostra o tempo restante até ela.',
    topo + 6
  )
  cursor = desenharLegenda(
    doc,
    [
      { degrade: true, rotulo: 'Tempo de leitura' },
      { cor: COR_RESTANTE, rotulo: 'Tempo restante até a média' },
      { linha: true, rotulo: 'Tempo médio por questão' }
    ],
    cursor
  )

  cursor = desenharDias(doc, questoes, cursor, (questao, linhaY) => {
    const barraY = linhaY + (PDF_ALTURA_LINHA - PDF_ALTURA_BARRA) / 2
    const tempo = questao.tempo_leitura_minutos
    const igual = tempoIgualDia(questao.dia)
    const larguraTempo = largura(tempo)

    desenharRotulo(doc, questao, linhaY)
    desenharRetangulo(doc, PDF_TRILHO_X, barraY, PDF_TRILHO_LARGURA, PDF_ALTURA_BARRA, COR_TRILHO)
    desenharBarraDegrade(doc, PDF_TRILHO_X, barraY, larguraTempo, PDF_ALTURA_BARRA)
    desenharRetangulo(
      doc,
      PDF_TRILHO_X + larguraTempo,
      barraY,
      largura(Math.max(0, igual - tempo)),
      PDF_ALTURA_BARRA,
      COR_RESTANTE
    )

    const xMedia = PDF_TRILHO_X + largura(igual)
    doc.setDrawColor(...COR_TEXTO)
    doc.setLineWidth(0.4)
    doc.line(xMedia, barraY - 0.8, xMedia, barraY + PDF_ALTURA_BARRA + 0.8)

    desenharValor(doc, tempo.toFixed(2), linhaY)
  })
  return cursor
}

// Gráfico de palavras: enunciado em verde escuro e alternativas em verde claro logo depois
function desenharGraficoPalavras(doc, questoes, y) {
  const maiorPalavras = Math.max(0, ...questoes.map((q) => q.palavras + q.palavrasAlternativas))
  const largura = (valor) => (maiorPalavras === 0 ? 0 : (valor / maiorPalavras) * PDF_TRILHO_LARGURA)

  const topo = garantirEspaco(doc, y, 40)
  let cursor = desenharCabecalhoGrafico(
    doc,
    'Quantidade de palavras por questão',
    'Mostra quantas palavras tem o enunciado de cada questão e as alternativas. Ajuda a ver se a distribuição dos tamanhos ao longo da prova está equilibrada.',
    topo + 6
  )
  cursor = desenharLegenda(
    doc,
    [
      { cor: COR_VERDE_ESCURO, rotulo: 'Quantidade de palavras do enunciado' },
      { cor: COR_ALTERNATIVAS, rotulo: 'Quantidade de palavras das alternativas' }
    ],
    cursor
  )

  cursor = desenharDias(doc, questoes, cursor, (questao, linhaY) => {
    const barraY = linhaY + (PDF_ALTURA_LINHA - PDF_ALTURA_BARRA) / 2
    const larguraEnunciado = largura(questao.palavras)

    desenharRotulo(doc, questao, linhaY)
    desenharRetangulo(doc, PDF_TRILHO_X, barraY, PDF_TRILHO_LARGURA, PDF_ALTURA_BARRA, COR_TRILHO)
    desenharRetangulo(doc, PDF_TRILHO_X, barraY, larguraEnunciado, PDF_ALTURA_BARRA, COR_VERDE_ESCURO)
    desenharRetangulo(
      doc,
      PDF_TRILHO_X + larguraEnunciado,
      barraY,
      largura(questao.palavrasAlternativas),
      PDF_ALTURA_BARRA,
      COR_ALTERNATIVAS
    )
    desenharValor(doc, `${questao.palavras} - ${questao.palavrasAlternativas}`, linhaY)
  })
  return cursor
}

// Bloco de informações da prova, igual ao da tela (ProvaInfoDisplay): duração, questões e velocidade
function desenharInfoProva(doc, ano, y) {
  const info = obterInfoProva(ano)
  if (!info) return y
  const linhas = [
    {
      rotulo: 'Duração total da prova:',
      valor: info.duracao_total,
      detalhe: `(Dia 1: ${info.duracao_dia1}(${info.duracao_dia1_min} min) | Dia 2: ${info.duracao_dia2}(${info.duracao_dia2_min} min))`
    },
    {
      rotulo: 'Quantidade total de questões:',
      valor: `${info.questoes_total} questões`,
      detalhe: `(Dia 1: ${info.questoes_dia1} | Dia 2: ${info.questoes_dia2})`
    },
    {
      rotulo: 'Velocidade de leitura considerada:',
      valor: `${info.velocidade_leitura} caracteres/minuto`,
      detalhe: '(Referência: Messias et al., 2008)'
    }
  ]
  const larguraMaxima = PDF_MARGEM + PDF_LARGURA_UTIL
  let linhaY = y
  linhas.forEach((linha) => {
    let x = PDF_MARGEM
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...COR_TEXTO)
    doc.text(linha.rotulo, x, linhaY)
    x += doc.getTextWidth(linha.rotulo) + 3

    doc.setTextColor(...COR_AZUL)
    doc.text(linha.valor, x, linhaY)
    x += doc.getTextWidth(linha.valor) + 3

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COR_VALOR)
    // Se o detalhe não cabe na mesma linha, quebra para a linha de baixo, como a tela faz
    if (x + doc.getTextWidth(linha.detalhe) > larguraMaxima) {
      linhaY += 4.5
      x = PDF_MARGEM + 4
    }
    doc.text(linha.detalhe, x, linhaY)
    linhaY += 6
  })
  return linhaY + 2
}

// Todas as análises ligadas: default de gerarPdf e exportarAnalises (objeto congelado, não é alterado)
const TODAS_AS_ANALISES = Object.freeze({ resumo: true, tempo: true, palavras: true })

// Cartões de correlação capturados da tela (PNG), na ordem da página.
// Cada imagem tem a mesma largura proporcional que o cartão tem na tela, encostada na margem esquerda.
// Se for mais alta que a página, é reduzida para caber.
function desenharCartoesImagem(doc, cartoes, y) {
  const alturaMaxima = PDF_ALTURA_PAGINA - 2 * PDF_MARGEM - 10
  let cursor = y
  for (const cartao of cartoes) {
    const escala = PDF_LARGURA_UTIL / cartao.larguraCartao
    let largura = cartao.larguraTela * escala
    let altura = cartao.alturaTela * escala
    if (altura > alturaMaxima) {
      const reducao = alturaMaxima / altura
      altura = alturaMaxima
      largura = largura * reducao
    }
    cursor = garantirEspaco(doc, cursor, altura + 10)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...COR_AZUL)
    doc.text(cartao.titulo, PDF_MARGEM, cursor)
    doc.addImage(cartao.dataUrl, 'PNG', PDF_MARGEM, cursor + 4, largura, altura)
    cursor += altura + 12
  }
  return cursor
}

// PDF: página 1 com o resumo (tabela e pizza), página 2 com o tempo de leitura, página 3 com as palavras.
// 'analises' (de analisesSelecionadas) escolhe quais blocos entram
export function gerarPdf(dados, ano, analises = TODAS_AS_ANALISES, cartoes = []) {
  const doc = new jsPDF()
  const resumo = montarSecoes(dados)[0]
  const restantePorDia = Object.fromEntries((dados.resumo?.dias ?? []).map((dia) => [dia.dia, dia.tempo_restante_min]))
  // O bloco da prova abre o PDF, sempre, como na tela; as seções seguem abaixo dele
  let cursor = desenharInfoProva(doc, ano, PDF_MARGEM + 4)

  if (analises.resumo) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...COR_AZUL)
    doc.text(`${resumo.titulo} - ENEM ${ano}`, PDF_MARGEM, cursor)
    autoTable(doc, {
      head: [resumo.colunas],
      body: resumo.linhas,
      startY: cursor + 6,
      margin: { left: PDF_MARGEM, right: PDF_MARGEM },
      styles: { fontSize: 8 }
    })

    // Pizza logo abaixo da tabela, com a legenda ao lado, como na tela
    const fatias = fatiasDaPizza(dados.resumo ?? {})
    const yPizza = garantirEspaco(doc, doc.lastAutoTable.finalY + 12, 70)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...COR_AZUL)
    doc.text(`Distribuição do tempo de prova - ENEM ${ano}`, PDF_MARGEM, yPizza)
    desenharPizza(doc, fatias, PDF_MARGEM + 25, yPizza + 37, 24)
    desenharLegendaPizza(doc, fatias, PDF_MARGEM + 60, yPizza + 24)
    cursor = yPizza + 66
  }

  // Os gráficos seguem um após o outro, sem forçar nova página
  if (analises.tempo) {
    cursor = desenharGraficoTempo(doc, dados.tempo?.questoes ?? [], restantePorDia, cursor)
    cursor += 8
  }
  if (analises.palavras) {
    cursor = desenharGraficoPalavras(doc, dados.palavras?.questoes ?? [], cursor)
    cursor += 8
  }
  // Cartões de correlação capturados da tela, na ordem da página
  if (cartoes.length) {
    desenharCartoesImagem(doc, cartoes, cursor)
  }
  return doc
}

// Baixa um Blob no navegador
function baixar(conteudo, nomeArquivo, tipo) {
  const blob = new Blob([conteudo], { type: tipo })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// Aplica os filtros da tela aos dados brutos. Sem filtros, exporta tudo como antes.
// filtros: { tempo: { dia, areas, dificuldade, tempo }, palavras: { dia, areas, metrica }, resumo: { dia } }
export function aplicarFiltrosExportacao(dados, filtros = {}) {
  const tempoFiltro = filtros.tempo ?? {}
  const palavrasFiltro = filtros.palavras ?? {}
  const resumoFiltro = filtros.resumo ?? {}
  const questoesTempo = filtrarDia(
    filtrarTempoLeitura(dados.tempo?.questoes ?? [], tempoFiltro),
    tempoFiltro.dia ?? 'todos'
  )
  const questoesPalavras = filtrarDia(
    filtrarPalavras(dados.palavras?.questoes ?? [], palavrasFiltro),
    palavrasFiltro.dia ?? 'todos'
  )
  const diasResumo = filtrarDia(dados.resumo?.dias ?? [], resumoFiltro.dia ?? 'todos')
  return {
    resumo: { ...dados.resumo, dias: diasResumo },
    tempo: { ...dados.tempo, questoes: questoesTempo },
    palavras: { ...dados.palavras, questoes: questoesPalavras }
  }
}

// Quais análises exportar, conforme o menu Filtro da tela.
// 'reading-time' = tempo de prova (resumo + tempo de leitura); 'word-count' = tamanho das questões
export function analisesSelecionadas(selecionadas) {
  return {
    resumo: selecionadas.has('reading-time'),
    tempo: selecionadas.has('reading-time'),
    palavras: selecionadas.has('word-count')
  }
}

// Exporta as análises de um ano no formato escolhido: 'csv', 'xlsx' ou 'pdf'.
// analises (de analisesSelecionadas) define quais seções entram no arquivo
export async function exportarAnalises(formato, ano, dados, filtros, analises = TODAS_AS_ANALISES, cartoes = []) {
  const dadosFiltrados = aplicarFiltrosExportacao(dados, filtros)
  const secoes = montarSecoes(dadosFiltrados).filter((secao) => analises[secao.id])
  const cabecalho = montarCabecalhoTabular(ano)
  const base = `enem-${ano}-analises`

  if (formato === 'csv') {
    baixar(gerarCsv(secoes, cabecalho), `${base}.csv`, 'text/csv;charset=utf-8')
  } else if (formato === 'xlsx') {
    await baixar(
      await gerarXlsx(secoes, cabecalho),
      `${base}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  } else if (formato === 'pdf') {
    gerarPdf(dadosFiltrados, ano, analises, cartoes).save(`${base}.pdf`)
  } else {
    throw new Error(`Formato de exportação desconhecido: ${formato}`)
  }
}
