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
  titulo: 'Correlação entre Caracteres da Questão e Desempenho',
  subtitulo:
    'Correlação de Spearman entre o número de caracteres da questão e o percentual de acerto. 918 itens das provas de 2020 a 2025 (sem 2021), por ano e área.',
  explicacao: [
    'Cada item entra uma vez. O acerto do item é o total de acertos dividido pelo total de respondentes dos 4 cadernos em que ele aparece. Cada célula é um ano e uma área, com 43 a 50 itens.',
    '',
    'Cada célula mostra r (de −1 a +1) e o p ajustado por Holm sobre os 20 testes.',
    '',
    'Cores: verde = correlação positiva; azul = correlação negativa; branco = próximo de zero.'
  ],
  // Notas exibidas abaixo do mapa. Os termos de LINKS_TERMOS viram links.
  notas: [
    'Cada célula mostra a correlação de Spearman (r) e o valor de p ajustado (Holm).',
    'Cores: verde = correlação positiva; azul = correlação negativa; branco = próximo de zero.',
    'Valores de r próximos de zero indicam pouca associação entre caracteres e acerto. Nenhuma célula é significativa após a correção de Holm.'
  ]
}

// Termos das notas que viram link para uma explicação externa (abre em nova aba)
export const LINKS_TERMOS = [
  { termo: 'correlação de Spearman', url: 'https://pt.wikipedia.org/wiki/Coeficiente_de_correlação_de_postos_de_Spearman' },
  { termo: 'valor de p', url: 'https://pt.wikipedia.org/wiki/Valor-p' }
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
  titulo: 'Caracteres × Acerto por Ano, Área e Dificuldade',
  subtitulo:
    'Correlação de Spearman entre caracteres da questão e percentual de acerto, em cada nível de dificuldade TRI (fácil, média e difícil), por ano e área.',
  explicacao: [
    'Mesma unidade do gráfico de barras acima: cada item entra uma vez, na faixa de dificuldade do seu parâmetro b (TRI). Itens sem parâmetro b ficam fora.',
    '',
    'Cada célula é um ano, uma área e um nível, com 13 a 17 itens. Cada célula mostra r e o p ajustado por Holm sobre os 60 testes.',
    '',
    'Cores: verde = correlação positiva; azul = correlação negativa; branco = próximo de zero.'
  ],
  notas: [
    'Cada célula mostra a correlação de Spearman (r) e o valor de p ajustado (Holm sobre os 60 testes).',
    'Com 13 a 17 itens por célula, cada r tem muita incerteza. Nenhuma das 60 células é significativa após a correção de Holm (menor p ajustado = 0,74).'
  ]
}

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
  facil: `Nas questões fáceis, o r vai de −0,52 a 0,45, e o sinal muda entre anos e áreas. Ou seja, a quantidade de caracteres não define o acerto nesse nível: a dificuldade das questões não necessariamente tem relação com o tamanho do texto. ${FRASE_INCERTEZA_HOLM}`,
  media: `Nas questões médias, o r vai de −0,35 a 0,64. A célula de maior r (2020, MT, r = 0,64) é também a de menor p ajustado (0,74), então não sustenta conclusão. A dificuldade das questões não necessariamente tem relação com a quantidade de caracteres. ${FRASE_INCERTEZA_HOLM}`,
  dificil: `Nas questões difíceis, o r vai de −0,65 a 0,30, com o sinal variando entre anos e áreas. Nem a célula de maior efeito negativo (2022, CN, r = −0,65) é significativa. A dificuldade das questões não necessariamente tem relação com a quantidade de caracteres. ${FRASE_INCERTEZA_HOLM}`
}

export const TEXTO_COLUNAS_DIFICULDADE = {
  titulo: 'Correlação por Nível de Dificuldade',
  subtitulo:
    'Coeficiente de Spearman entre caracteres da questão e percentual de acerto, para cada nível de dificuldade TRI, no ano escolhido.',
  explicacao: [
    'Cada aba mostra um ano. Cada coluna é o r dos itens de um nível de dificuldade TRI. O filtro de dia e área recalcula as três colunas só com os itens do recorte escolhido.',
    '',
    'Itens sem parâmetro b (dificuldade TRI) ficam de fora. O p de cada coluna é ajustado por Holm sobre os 3 níveis do mesmo recorte. A escala vai de −1 a 1, a mesma do mapa de calor.'
  ],
  notas: [
    'Cada coluna é o coeficiente de Spearman (r) dos itens de um nível, no recorte escolhido (ano, dia e áreas). O n abaixo de cada coluna mostra quantos itens entraram.',
    'Cor: verde = correlação positiva (r ≥ 0), ou seja, itens com mais caracteres tendem a ter mais acerto. Azul = correlação negativa (r < 0), ou seja, itens com mais caracteres tendem a ter menos acerto. A altura da barra mostra a força.',
    'Quanto menos itens no recorte, mais instável o r. Por isso um dia ou uma área isolada tem r com muito mais incerteza que o ano inteiro.',
    'Leitura com cuidado: a dificuldade TRI é quase o próprio acerto (Spearman ≈ −0,89). Por isso a correlação dentro de cada nível não é independente do desfecho e não deve ser lida como efeito do tamanho do texto.'
  ]
}

export const TEXTO_METADES_CARACTERES = {
  titulo: 'Acerto por Quantidade de Caracteres e Nível de Dificuldade',
  subtitulo:
    'Porcentagem média de acerto das questões com menos caracteres e das com mais caracteres, em cada nível de dificuldade TRI, no ano escolhido.',
  explicacao: [
    'Para cada nível, as questões são divididas pela mediana de caracteres do próprio nível e do recorte escolhido: menos caracteres = até a mediana; mais caracteres = acima dela.',
    'Cada barra é a média de acerto das questões daquela metade. Passe o mouse sobre a barra para ver os caracteres médios, a faixa e o número de itens.',
    'Filtro: a aba é o ano escolhido. Com Todos os dias, agrupa os itens dos dois dias; com Dia 1 ou Dia 2, usa só as áreas daquele dia.'
  ],
  notas: [
    'Como ler: a diferença entre as duas barras de cada nível é a diferença de acerto (em pontos percentuais) entre questões mais curtas e mais longas. O mapa de calor mostra só a ordem (r); este gráfico mostra o tamanho da diferença.',
    'Amostra: cada barra usa a metade dos itens do recorte. Em um ano só, com um dia ou uma área, sobram poucos itens por barra (a contagem aparece no tooltip). Diferenças pequenas nesses recortes podem ser ruído.',
    'Leitura com cuidado: o nível TRI é definido pelo próprio acerto. Por isso as barras de cada nível já são parecidas entre si e a diferença dentro do nível não é um efeito independente do tamanho do texto.',
    'A mediana é recalculada dentro de cada nível e recorte, então a faixa de caracteres muda entre as abas. Compare as barras dentro do mesmo gráfico, não entre anos ou filtros diferentes.'
  ]
}

// ====grafico dispersao itens - textos da dispersão caracteres × acerto por item
export const TEXTO_DISPERSAO_ITENS = {
  titulo: 'Dispersão: Caracteres da Questão × Acerto',
  subtitulo:
    'Cada ponto é uma questão. A reta mostra a tendência geral entre o tamanho do texto e o acerto, no ano escolhido.',
  explicacao: [
    'Para que serve: mostra a relação entre caracteres e acerto questão por questão, com uma reta que resume a tendência do recorte.',
    'Cada ponto é um item. A cor mostra o nível de dificuldade TRI. Passe o mouse sobre o ponto para ver o item, os caracteres e o acerto.',
    'A reta é a tendência geral do recorte, com todos os níveis juntos. A faixa azul é o intervalo de confiança de 95% da reta.',
    'A reta dá a inclinação geral, mas não dá a diferença por nível. Para comparar níveis, veja o gráfico Acerto por Quantidade de Caracteres e Nível de Dificuldade.'
  ],
  notas: [
    'Como ler: a inclinação mostra quantos pontos percentuais o acerto muda, em média, a cada 100 caracteres a mais. Uma reta quase horizontal indica que o tamanho do texto pouco muda o acerto no recorte.',
    'Teste: o p da reta vem do teste t de um modelo linear simples. Não há correção para vários testes, diferente do mapa de calor, que usa sorteio e correção de Holm. Leia o p com cuidado.',
    'Amostra: com um dia ou uma área, o número de itens cai e a faixa de IC fica mais larga. Os 10 itens sem nível TRI ficam de fora deste gráfico.',
    'Leitura com cuidado: o nível TRI é definido pelo próprio acerto (Spearman ≈ −0,89). As cores mostram o nível, mas os pontos de cada cor não são um efeito independente do tamanho do texto.'
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
