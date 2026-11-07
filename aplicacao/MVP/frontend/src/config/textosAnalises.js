// Textos explicativos das análises. Usados na tela (tooltips e subtítulos) e na exportação CSV/Excel,
// para que os dois sempre digam a mesma coisa.

export const TEXTO_RESUMO_TEMPO = {
  titulo: 'Distribuição do Tempo de Prova',
  subtitulo: 'Distribuição do tempo entre leitura e resolução das questões objetivas (por dia ou total).',
  explicacao: [
    'Apresenta a distribuição dos 555 min totais do ENEM (Dia 1: 255 min descontando os 75 min de redação; Dia 2: 300 min) entre tempo de leitura e margem para resolução.',
    '',
    'Cálculos:',
    '• Leitura das questões = caracteres das questões ÷ 1.100 (enunciados e alternativas, sem espaços).',
    '• Leitura introdutória = caracteres das instruções e capas ÷ 1.100.',
    '• Tempo restante = máx(0, tempo disponível − leitura das questões − leitura introdutória) (reservado para análise, cálculos e gabarito).'
  ]
}

export const TEXTO_CORRELACOES_TEMPO = {
  titulo: 'Correlação entre Tamanho da Questão e Percentual de Acertos por Ano e Área',

  explicacao: [
    'Unidade de análise: cada item da prova em um ano e uma área. Cada item aparece nos cadernos de todas as cores, mas conta uma vez só.',
    '',
    'Caracteres: número de caracteres do texto da questão. O texto é igual em todas as cores, então é lido do caderno Azul apenas como referência.',
    '',
    'Acerto do item (%) = total de acertos ÷ total de respondentes de todas as cores × 100.',
    '',
    'r (Spearman): correlação de postos entre caracteres e acerto, dentro de cada ano e área. Vai de −1 a +1.',
    '',
    'p: calculado por sorteio. São 20.000 permutações da ordem dos acertos, com semente 42. O p é a fração das permutações com r tão extremo quanto o observado.',
    '',
    'Holm: ajuste do p sobre os 20 testes (5 anos × 4 áreas). Ordena os p do menor para o maior e multiplica cada um por (20 − posição + 1), sem passar de 1.',
    'Cerca de 1 em cada 20 resultados pareceria significativo por acaso. O Holm mantém em 5% a chance de qualquer falso positivo no conjunto.'
  ],
  // Notas exibidas abaixo do mapa. Os termos de LINKS_TERMOS viram links.
  notas: [
    'Cada célula mostra a correlação de Spearman (r), o valor de p bruto e ajustado (Holm).',
    'O r mostra a força  da relação, de −1 a 1. Quanto mais longe de 0, mais forte',
    'Verde = correlação positiva: quando o número de caracteres sobe, o acerto tende a subir junto.',
    'Azul = correlação negativa: quando o número de caracteres sobe, o acerto tende a cair.',
    'Branco = quase nenhuma relação entre o número de caracteres e o acerto.',
    'p bruto: mede quão raro seria um r tão forte quanto o observado se não houvesse relação nenhuma entre tamanho e acerto.',
    'p baixo: um r seria raro sem relação, há indício de relação.',
    'p alto: um r seria comum sem relação. O resultado é compatível com ausência de relação.',
    'p (Holm) ajusta o p bruto considerando todas as células, para que o risco de pelo menos um falso positivo fique em 5%. Só é tratado como significativo abaixo de 0,05.',
    'p (Holm) alto, como 1.000, mostra que não há evidência suficiente de relação nessa célula. Isso não prova que a relação não existe.'
  ]
}

// Termos das notas que viram link para uma explicação externa (abre em nova aba)
export const LINKS_TERMOS = [
  { termo: 'correlação de Spearman', url: 'https://pt.wikipedia.org/wiki/Coeficiente_de_correlação_de_postos_de_Spearman' },
  { termo: 'Correlação de Pearson', url: 'https://pt.wikipedia.org/wiki/Coeficiente_de_correlação_de_Pearson' },
  { termo: 'valor de p', url: 'https://pt.wikipedia.org/wiki/Valor-p' },
  { termo: 'Holm', url: 'https://en.wikipedia.org/wiki/Holm%E2%80%93Bonferroni_method' }
]

export const TEXTO_TEMPO_LEITURA = {
  titulo: 'Tempo de Leitura e Média Disponível por Questão',
  subtitulo:
    'Comparativo do tempo de leitura individual de cada questão frente ao tempo médio de resolução por item.',
  explicacao: [
    'Compara o tempo de leitura de cada questão com o tempo médio de resolução. A linha preta marca essa média diária e a barra cinza claro até a linha preta mostra o tempo restante para resolver o item.',
    '',
    'Cálculos:',
    '• Leitura da Questão = caracteres da questão ÷ 1.100 (enunciado e opções, sem espaços; Q1 a Q5 exibem os 2 idiomas).',
    '• Tempo Médio (Linha Preta) = tempo restante do dia ÷ 90 questões (desconta leitura total e os 75 min da redação do Dia 1; considera 90 itens pois o aluno escolhe só 1 idioma).',
    '• Margem (Barra Cinza até a Linha Preta) = máx(0, Tempo Médio − Tempo de Leitura) (fatia do tempo restante do dia dividida igualmente entre as 90 questões; zera se a leitura ultrapassar a linha preta).'
  ]
}

export const TEXTO_MAPA_DIFICULDADE = {
  titulo: 'Correlação entre Tamanho da Questão e Acertos por nível de dificuldade',
  explicacao: [
    'Este gráfico considera só as questões de cada nível de dificuldade. A dificuldade vem da Teoria de Resposta ao Item (TRI), que estima quão difícil é cada questão para os candidatos. Questões sem essa estimativa ficam de fora.',
    '',
    'Cada quadrado é um ano e uma área, dentro de um nível, com 13 a 17 questões. O r mostra a relação, de −1 a +1, entre o número de caracteres e o percentual de acerto.',
    '',
    'p bruto: sorteio com 20.000 embaralhamentos da ordem dos acertos (semente 42). p = (sorteios com r tão extremo quanto o observado + 1) ÷ (20.000 + 1).',
    '',
    'Holm: correção para os 60 testes (3 níveis × 5 anos × 4 áreas). Ordena os p brutos do menor para o maior e multiplica o 1º por 60, o 2º por 59, e assim por diante, sem passar de 1. Assim, a chance de pelo menos um falso positivo no conjunto fica em 5%.'
  ],
  notas: [
    'Cada célula mostra a correlação de Spearman (r), o valor de p bruto e ajustado (Holm).',
    'O r mostra a força  da relação, de −1 a 1. Quanto mais longe de 0, mais forte',
    'Verde = correlação positiva: quando o número de caracteres sobe, o acerto tende a subir junto.',
    'Azul = correlação negativa: quando o número de caracteres sobe, o acerto tende a cair.',
    'Branco = quase nenhuma relação entre o número de caracteres e o acerto.',
    'p bruto: mede quão raro seria um r tão forte quanto o observado se não houvesse relação nenhuma entre tamanho e acerto.',
    'p baixo: um r seria raro sem relação, há indício de relação.',
    'p alto: um r seria comum sem relação. O resultado é compatível com ausência de relação.',
    'p (Holm) ajusta o p bruto considerando todas as células, para que o risco de pelo menos um falso positivo fique em 5%. Só é tratado como significativo abaixo de 0,05.',
    'p (Holm) alto, como 1.000, mostra que não há evidência suficiente de relação nessa célula. Isso não prova que a relação não existe.',
  ]
}

// Conclusão geral dos três níveis, sempre visível acima do mapa
export const FRASE_GERAL_DIFICULDADE =
   'Compara o tamanho das questões com o percentual de acerto, separado por nível de dificuldade. Cada nível tem seu próprio mapa.'

export const TEXTO_MAPA_DIFICULDADE_GRADE = [
  'Correlação de Spearman (r) entre o número de caracteres da questão e o percentual de acerto dos itens deste nível de dificuldade TRI, em cada ano e área.',
  '',
  'Como foi calculado: cada item é um ano, área e código do item. O acerto é o total de acertos dividido pelo total de respondentes dos 4 cadernos em que o item aparece, em percentual. Itens sem dificuldade TRI ficam de fora.',
  '',
  'Cada célula tem de 13 a 17 itens. O p é obtido por sorteio, com 20.000 permutações e semente 42, e ajustado por Holm sobre os 60 testes (3 níveis × 5 anos × 4 áreas).',
  '',
  'Com 13 a 17 itens por célula, cada r tem muita incerteza. Nenhuma das 60 células é significativa após a correção de Holm (menor p ajustado = 0,74).'
]

const FRASE_INCERTEZA_HOLM = 'Com 13 a 17 itens por célula, cada r tem muita incerteza. Nenhuma das 60 células é significativa após a correção de Holm (menor p ajustado = 0,74).'

// Resultado de cada tabela (um por nível TRI), mostrado abaixo do título da grade
export const TEXTO_RESULTADO_DIFICULDADE = {
  facil: `Nas questões fáceis, a maioria dos quadrados (14 de 20) tem r negativo, ou seja, questões mais longas tendem a acertar menos. Mas o sinal muda entre anos e áreas, e nenhum quadrado se sustenta na correção de Holm. Então o gráfico não mostra uma relação consistente nesse nível.`,
  media: `Nas questões médias, o quadrado com a relação positiva mais forte é 2020 (MT). Ele não se sustenta quando todas as células são corrigidas juntas. Como nos outros níveis, o sinal varia entre anos e áreas, então não há uma relação consistente.`,
  dificil: `Nas questões difíceis, o quadrado com a relação negativa mais forte é 2022 (CN). Ele também não se sustenta na correção. O sinal varia entre anos e áreas, então o gráfico não mostra uma relação consistente nesse nível.`
}

export const TEXTO_METADES_CARACTERES = {
  titulo: 'Acerto por Quantidade de Caracteres e Nível de Dificuldade',
  // Recebe o ano da aba selecionada (ex.: 2025)
  subtitulo: (ano) =>
    `Em cada nível, as questões são divididas pela mediana de caracteres. Cada barra mostra o percentual médio de acerto de uma dessas metades no ano de ${ano}.`,
  explicacao: [
    'Para cada nível, as questões são divididas pela mediana de caracteres do próprio nível e do recorte escolhido.',
    '',
    'Cada barra é a média de acerto das questões daquela metade.',
    '',
    'Filtro: a aba é o ano escolhido. Com Todos os dias, agrupa os itens dos dois dias; com Dia 1 ou Dia 2, usa só as áreas daquele dia.'
  ],
  notas: [
    'O nível TRI é definido pelo próprio acerto, por isso as barras de cada nível já são parecidas entre si e a diferença dentro do nível não é um efeito independente do tamanho do texto.',
    'A mediana é recalculada dentro de cada nível e recorte, então a faixa de caracteres muda entre as abas. Compare as barras dentro do mesmo gráfico, não entre anos ou filtros diferentes.'
  ]
}

// ====grafico dispersao itens - textos da dispersão caracteres × acerto por item
export const TEXTO_DISPERSAO_ITENS = {
  titulo: 'Dispersão: Caracteres da Questão × Acerto',
  // Recebe o ano da aba selecionada (ex.: 2025)
  subtitulo: (ano) =>
    `Cada ponto é uma questão, colorido pelo nível de dificuldade. A reta mostra a tendência geral entre o tamanho do texto e o acerto, no ano de ${ano}. A faixa em volta da reta é o intervalo de confiança de 95%.`,
  explicacao: [
    'Apenas questões com nível TRI definido são incluídos, os 10 itens sem nível TRI ficam de fora dos pontos e da reta.',
    '',
    'Cálculos:',
    '• Unidade: item = ano, área e código do item. Cada item aparece em todos os cadernos, mas conta uma vez só.',
    '• Caracteres: número de caracteres de todo o texto da questão (cabeçalho, enunciado, fonte e alternativas, incluindo as letras), sem espaços, tabs ou quebras de linha. Lido do caderno Azul, pois o texto é igual em todas as cores.',
    '• Acerto (%) = total de acertos ÷ total de respondentes de todas as cores × 100.',
    '• Nível TRI: fácil se b < 0; média se 0 ≤ b < 1,5; difícil se b ≥ 1,5 (b = parâmetro de dificuldade da TRI).',
    '',
    'Reta: regressão linear simples por mínimos quadrados, com caracteres como variável explicativa e acerto como variável resposta.',
    '',
    'Faixa: o IC de 95% usa a distribuição t de Student com n − 2 graus de liberdade.',
    '',
    'p da reta: teste t paramétrico, sem correção para vários testes.',
  ],
  notas: [
    'Reta azul: ela cresce ou decresce conforme o tamanho da questão varia. A inclinação indica a variação média, em pontos percentuais, do acerto a cada 100 caracteres adicionais. Quando a reta é praticamente horizontal, a variação do tamanho do texto pouco altera o acerto neste recorte.',
    'Correlação de Pearson (r) mostra a força e o sentido da relação linear. Quanto mais perto de +1 ou −1 mais forte é a relação.',
    'O valor de p (p): mede quão raro seria um r tão forte quanto o observado se não houvesse relação nenhuma entre tamanho e acerto.',
    'p baixo: um r seria raro sem relação, há indício de relação.',
    'p alto: um r seria comum sem relação. O resultado é compatível com ausência de relação.',
    'O n é o número de itens do recorte: com poucos itens, relações fracas podem não ser detectadas. Esses valores mudam conforme o dia e as áreas escolhidos no filtro.',
    'O nível TRI é definido pelo próprio acerto, então itens mais difíceis tendem a ter acerto menor. Por isso, as cores mostram o nível, mas a diferença entre os pontos de cada cor não é um efeito independente do tamanho do texto.'
  ]
}
// ====fim grafico dispersao itens

export const TEXTO_PALAVRAS = {
  titulo: 'Quantidade de Palavras por Questão',
  subtitulo:
    'Mostra quantas palavras tem o enunciado de cada questão. Ajuda a ver se a distribuição dos tamanhos ao longo da prova está equilibrada.',
  explicacao: [
    'Cada barra é uma questão. A parte em degradê azul-verde mostra as palavras do enunciado e a parte azul claro mostra as palavras das alternativas.',
    '',
    'Valor: enunciado - alternativas (ex.: 128 - 45).',
    '',
    'Cálculos:',
    '• Barra = palavras do enunciado + alternativas da questão, em proporção à questão mais longa da prova.',
    '',
    'Q1 a Q5 aparecem em inglês e espanhol, cada uma com a sua contagem.'
  ]
}

// Dicas dos filtros de métrica (aparecem ao lado da opção no menu Filtro)
export const DICA_OUTLIERS_TEMPO =
  'Mostra as questões com tempo menor que Q1 − 1,5 × IQR ou maior que Q3 + 1,5 × IQR, onde Q1 e Q3 são o 1º e o 3º quartil e IQR = Q3 − Q1.'
export const DICA_DESVIO_TEMPO =
  'Mostra as questões cujo tempo de leitura está a mais de 1 desvio padrão da média (|tempo − média| > desvio padrão).'
export const DICA_OUTLIERS_PALAVRAS =
  'Mostra as questões com quantidade de palavras menor que Q1 − 1,5 × IQR ou maior que Q3 + 1,5 × IQR, onde Q1 e Q3 são o 1º e o 3º quartil e IQR = Q3 − Q1.'
export const DICA_DESVIO_PALAVRAS =
  'Mostra as questões com quantidade de palavras a mais de 1 desvio padrão da média (|palavras − média| > desvio padrão).'

export const REFERENCIA_VELOCIDADE = 'Referência: Messias et al., 2008'
