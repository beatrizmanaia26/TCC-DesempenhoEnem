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
  subtitulo: 'Correlação de Spearman entre os caracteres de cada questão e o percentual de acerto, por ano e área.',

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
    'Cada célula mostra a correlação de Spearman (r), o valor de p bruto e ajustado (Holm).Tanto a correlação quant o Holm tem que ser elvados em consideração para a conclusão do possível impacto do acerto.',
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

// Explicação externa de intervalo de confiança (usada nos subtítulos, legendas e termos linkados)
export const URL_INTERVALO_CONFIANCA = 'https://pt.wikipedia.org/wiki/Intervalo_de_confiança'
// Referência da correção de dispersão (φ), usada nas notas da prova enviada e do ENEM
export const URL_CORRECAO_DISPERSAO = 'https://en.wikipedia.org/wiki/Overdispersion'

// Termos das notas que viram link para uma explicação externa (abre em nova aba)
export const LINKS_TERMOS = [
  { termo: 'correlação de Spearman', url: 'https://pt.wikipedia.org/wiki/Coeficiente_de_correlação_de_postos_de_Spearman' },
  { termo: 'Correlação de Pearson', url: 'https://pt.wikipedia.org/wiki/Coeficiente_de_correlação_de_Pearson' },
  { termo: 'valor de p', url: 'https://pt.wikipedia.org/wiki/Valor-p' },
  { termo: 'Holm', url: 'https://en.wikipedia.org/wiki/Holm%E2%80%93Bonferroni_method' },
  { termo: 't de Student', url: 'https://pt.wikipedia.org/wiki/Distribuição_t_de_Student' },
  { termo: 'intervalo de confiança', url: URL_INTERVALO_CONFIANCA },
  { termo: 'Intervalo de Confiança', url: URL_INTERVALO_CONFIANCA },
  { termo: 'Correção de dispersão', url: URL_CORRECAO_DISPERSAO }
]

export const TEXTO_TEMPO_LEITURA = {
  titulo: 'Tempo de Leitura e Média de Tempo Disponível para Resolver Cada Questão',
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
  subtitulo: 'Correlação de Spearman entre os caracteres de cada questão e o percentual de acerto, separado por nível de dificuldade.',
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
    'Cada célula mostra a correlação de Spearman (r), o valor de p bruto e ajustado (Holm). Tanto a correlação quant o Holm tem que ser elvados em consideração para a conclusão do possível impacto do acerto.',
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
    `Em cada nível, as questões são divididas pela mediana da quantidade de caracteres. Cada barra colorida é a média simples das taxas de acerto das questões daquela coluna colorida no ano de ${ano}.`,
  explicacao: [
    'Para cada nível, as questões são divididas pela mediana da quantidade de caracteres do próprio nível e do recorte escolhido.',
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
  titulo: 'Dispersão: Número de Caracteres da Questão × Quantidade de Acertos',
  // Recebe o ano da aba selecionada (ex.: 2025)
  subtitulo: (ano) =>
    `Cada ponto é uma questão, colorido pelo nível de dificuldade. A curva mostra a probabilidade de acerto prevista pelo modelo logístico para cada tamanho de questão, no ano de ${ano}. A faixa em volta da curva é o intervalo de confiança de 95%, calculado na escala logística e sempre entre 0% e 100%.`,
  explicacao: [
    'Apenas questões com nível TRI definido são incluídas. Os itens sem nível TRI ficam de fora dos pontos e da curva.',
    '',
    'Cálculos:',
    '• Unidade: item = ano, área e código do item. Cada item aparece em todos os cadernos, mas conta uma vez só.',
    '• Caracteres: número de caracteres de todo o texto da questão (cabeçalho, enunciado, fonte e alternativas, incluindo as letras), sem espaços, tabs ou quebras de linha. Lido do caderno Azul, pois o texto é igual em todas as cores.',
    '• Acertos e respostas: somados de todas as cores de cada item. Cada item pesa pelo número de respostas.',
    '• Nível TRI: fácil se b < 0; média se 0 ≤ b < 1,5; difícil se b ≥ 1,5 (b = parâmetro de dificuldade da TRI).',
    '',
    'Modelo: regressão logística binomial, com caracteres como variável explicativa e a proporção de acertos como resposta. É o mesmo modelo usado na dispersão da prova enviada.',
    '',
    'Faixa: o IC de 95% é calculado na escala do logit e transformado em porcentagem, então fica sempre entre 0% e 100%.',
    '',
    'p: teste de Wald do coeficiente de caracteres, com correção de dispersão (φ) quando os acertos variam mais do que a binomial prevê. Sem correção para vários testes.'
  ],
  notas: [
    'Curva azul: probabilidade de acerto prevista pelo modelo logístico para cada tamanho de questão. Ela cresce ou decresce conforme o tamanho varia e nunca passa de 0% nem de 100%. Quando a curva é quase plana, o tamanho do texto pouco altera o acerto neste recorte.',
    'Faixa azul: representa a margem de erro da curva média. Quanto mais estreita a faixa, mais certeza temos sobre a curva. Quanto mais larga, menor a confiança, o que acontece quando há poucas questões ou muita variação entre elas.',
    'Pontos: cada ponto é uma questão. Um ponto dentro da faixa azul teve acerto dentro da variação normal para o seu tamanho. Um ponto fora da faixa teve acerto bem diferente do previsto: nesse caso, o tamanho do texto não é o fator principal, e outros fatores pesam mais.',
    'Razão de chances: a cada 100 caracteres a mais, a chance de acerto (acertos ÷ erros) é multiplicada por {razao} (valor do filtro escolhido). Valor abaixo de 1 indica que questões mais longas tendem a ter menos acerto; acima de 1, mais acerto. Quanto mais distante de 1, maior o efeito do tamanho do texto; quanto mais próximo de 1, menor o efeito, ou seja, o tamanho quase não altera o acerto.',
    'Correção de dispersão (φ): mostra se as questões variam mais do que o modelo simples prevê. O valor esperado é 1. Com φ = {phi}, a variação entre as questões é {phi} vezes maior do que a esperada. Para compensar, o modelo aumenta o erro padrão deixando a faixa azul mais larga e o p mais alto. Quanto maior o φ, mais outros fatores, além do tamanho do texto, estão influenciando o acerto.',
    'Valor de p = {p}: indica se o tamanho da questão parece ter relação com o acerto neste recorte, ou se a diferença poderia ser coincidência. Quanto menor o número, mais forte é o indício de relação.',
    'p baixo: um efeito desse tamanho seria raro sem relação, há indício de relação.',
    'p alto: não há evidência suficiente de relação; um efeito desse tamanho seria comum sem relação.',
    'O n = {n} é o número de itens do recorte: com poucos itens, relações fracas podem não ser detectadas. Esses valores mudam conforme o dia e as áreas escolhidos no filtro.',
    'O nível TRI é definido pelo próprio acerto, então itens mais difíceis tendem a ter acerto menor. Por isso, as cores mostram o nível, mas a diferença entre os pontos de cada cor não é um efeito independente do tamanho do texto.',
    'Os itens são a unidade da análise, então o p responde à relação entre caracteres e acerto entre itens.'
  ]
}
// ====fim grafico dispersao itens

export const TEXTO_PALAVRAS = {
  titulo: 'Quantidade de Palavras por Questão',
  subtitulo:
    'Mostra quantas palavras tem no enunciado e nas alternativas de cada questão. Ajuda a ver se a distribuição dos tamanhos ao longo da prova está equilibrada.',
  explicacao: [
    'Cada barra é uma questão. A parte verde escura mostra as palavras do enunciado e a parte verde clara mostra as palavras das alternativas.',
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
  'Mostra as questões com tempo menor que 1º quartil − 1,5 × intervalo interquartil ou maior que 3º quartil + 1,5 × intervalo interquartil. O intervalo interquartil é a diferença entre o 3º e o 1º quartil.'
export const DICA_DESVIO_TEMPO =
  'Mostra as questões cujo tempo de leitura está a mais de 1 desvio padrão da média (|tempo − média| > desvio padrão).'
export const DICA_OUTLIERS_PALAVRAS =
  'Mostra as questões com quantidade de palavras menor que 1º quartil − 1,5 × intervalo interquartil ou maior que 3º quartil + 1,5 × intervalo interquartil. O intervalo interquartil é a diferença entre o 3º e o 1º quartil.'
export const DICA_DESVIO_PALAVRAS =
  'Mostra as questões com quantidade de palavras a mais de 1 desvio padrão da média (|palavras − média| > desvio padrão).'

export const REFERENCIA_VELOCIDADE = 'Referência: Messias et al., 2008'
export const REFERENCIA_VELOCIDADE_URL = 'https://doi.org/10.1590/S0004-27492008000400016'

// O que conta como texto introdutório na legenda "Leitura dos textos introdutórios", conforme a origem da prova
export const DICA_TEXTOS_INTRO_ENEM =
  'Textos introdutórios do caderno oficial do ENEM: capa, instruções gerais e cabeçalhos de seção, como "Questões de 01 a 45". Não incluem enunciados nem alternativas. Esse tempo é contado uma vez por dia de prova.'
export const DICA_TEXTOS_INTRO_PROVA_ENVIADA =
  'Textos introdutórios da prova enviada: todo o texto do PDF que aparece antes da primeira questão, como capa, cabeçalho e instruções gerais. Não incluem enunciados nem alternativas.'
