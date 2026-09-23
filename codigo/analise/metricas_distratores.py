from pathlib import Path

import pandas as pd
from scipy.stats import pearsonr, spearmanr


# ============================================================
# CONFIGURAÇÃO
# ============================================================

RAIZ = Path("TCC-DesempenhoEnem")

PASTA_ENTRADA = RAIZ / "outputs" / "similaridade_distratores"
PASTA_SAIDA = RAIZ / "outputs" / "metricas" / "distratores"

# Cria a pasta caso ela ainda não exista
PASTA_SAIDA.mkdir(parents=True, exist_ok=True)

# Entrada
ARQUIVO_ENTRADA = PASTA_ENTRADA / "base_distratores.csv"

# Saídas
ARQUIVO_CORRELACOES = (
    PASTA_SAIDA / "correlacoes_distratores.csv"
)

ARQUIVO_RANKING = (
    PASTA_SAIDA / "ranking_distratores_por_questao.csv"
)

ARQUIVO_MARKDOWN = (
    PASTA_SAIDA / "resultados_distratores.md"
)


# ============================================================
# CONFIGURAÇÃO DA ANÁLISE
# ============================================================

VARIAVEIS = {
    "similaridade_com_correta":
        "Similaridade com a correta",

    "sim_media_outros_distratores":
        "Similaridade com outros distratores",

    "diferenca_similaridade":
        "Proximidade relativa",
}

DESFECHO = "taxa_escolha_distrator"

CHAVE_QUESTAO = [
    "ano",
    "cor",
    "area",
    "questao",
    "idioma",
]


# ============================================================
# LEITURA
# ============================================================

print("Lendo base de distratores...")

df = pd.read_csv(
    ARQUIVO_ENTRADA,
    sep=";",
    encoding="utf-8-sig",
)

print(f"Distratores encontrados: {len(df)}")


# ============================================================
# VALIDAÇÃO
# ============================================================

colunas_obrigatorias = [
    *CHAVE_QUESTAO,
    "distrator",
    DESFECHO,
    *VARIAVEIS.keys(),
]

faltando = [
    coluna
    for coluna in colunas_obrigatorias
    if coluna not in df.columns
]

if faltando:
    raise ValueError(
        "Colunas obrigatórias ausentes:\n"
        + "\n".join(faltando)
    )


# Converter variáveis numéricas
colunas_numericas = [
    DESFECHO,
    *VARIAVEIS.keys(),
]

for coluna in colunas_numericas:
    df[coluna] = pd.to_numeric(
        df[coluna],
        errors="coerce",
    )


# Verificar valores ausentes
ausentes = df[
    colunas_numericas
].isna().sum()

ausentes = ausentes[
    ausentes > 0
]

if not ausentes.empty:
    print(ausentes)

    raise ValueError(
        "Existem valores ausentes nas variáveis analisadas."
    )


# Taxa precisa estar entre 0 e 1
if not df[DESFECHO].between(0, 1).all():
    raise ValueError(
        "Existem taxas de escolha fora do intervalo [0, 1]."
    )


# Cada questão precisa ter exatamente 4 distratores
contagens = (
    df.groupby(
        CHAVE_QUESTAO,
        dropna=False,
    )
    .size()
)

if not (contagens == 4).all():
    raise ValueError(
        "Existem questões sem exatamente quatro distratores."
    )


N_QUESTOES = len(contagens)
N_DISTRATORES = len(df)

print(f"Questões encontradas: {N_QUESTOES}")


# ============================================================
# PARTE 1
# CORRELAÇÕES
# ============================================================

print("\nCalculando correlações...")


def calcular_correlacao(
    dados,
    variavel,
    nivel,
    ano=None,
    area=None,
):
    x = dados[variavel]
    y = dados[DESFECHO]

    pearson_r, pearson_p = pearsonr(x, y)

    spearman_rho, spearman_p = spearmanr(
        x,
        y,
    )

    return {
        "nivel": nivel,
        "ano": ano,
        "area": area,

        "variavel": variavel,
        "descricao": VARIAVEIS[variavel],

        "n": len(dados),

        "pearson_r": pearson_r,
        "pearson_p": pearson_p,

        "spearman_rho": spearman_rho,
        "spearman_p": spearman_p,
    }


resultados_correlacao = []


for variavel in VARIAVEIS:

    # Geral
    resultados_correlacao.append(
        calcular_correlacao(
            df,
            variavel,
            nivel="geral",
        )
    )

    # Por ano
    for ano, grupo in df.groupby("ano"):

        resultados_correlacao.append(
            calcular_correlacao(
                grupo,
                variavel,
                nivel="ano",
                ano=ano,
            )
        )

    # Por área
    for area, grupo in df.groupby("area"):

        resultados_correlacao.append(
            calcular_correlacao(
                grupo,
                variavel,
                nivel="area",
                area=area,
            )
        )

    # Por ano × área
    for (ano, area), grupo in df.groupby(
        ["ano", "area"]
    ):

        resultados_correlacao.append(
            calcular_correlacao(
                grupo,
                variavel,
                nivel="ano_area",
                ano=ano,
                area=area,
            )
        )


correlacoes = pd.DataFrame(
    resultados_correlacao
)


# ============================================================
# PARTE 2
# RANKING DENTRO DE CADA QUESTÃO
# ============================================================

print("Calculando rankings dentro das questões...")


def obter_maximos(grupo, coluna):
    """
    Retorna todas as alternativas empatadas
    no maior valor da coluna.
    """

    maximo = grupo[coluna].max()

    letras = sorted(
        grupo.loc[
            grupo[coluna] == maximo,
            "distrator",
        ].tolist()
    )

    return letras, maximo


def letras_para_texto(letras):
    return "/".join(letras)


registros_ranking = []


for chave, grupo in df.groupby(
    CHAVE_QUESTAO,
    dropna=False,
):

    ano, cor, area, questao, idioma = chave

    # Distrator(es) mais escolhido(s)
    mais_escolhidos, maior_taxa = obter_maximos(
        grupo,
        DESFECHO,
    )

    registro = {
        "ano": ano,
        "cor": cor,
        "area": area,
        "questao": questao,
        "idioma": idioma,

        "distrator_mais_escolhido":
            letras_para_texto(
                mais_escolhidos
            ),

        "maior_taxa_escolha":
            maior_taxa,

        "empate_escolha":
            len(mais_escolhidos) > 1,
    }


    # Comparar cada variável com o distrator
    # de maior taxa de escolha
    for variavel in VARIAVEIS:

        mais_similares, maior_valor = obter_maximos(
            grupo,
            variavel,
        )

        intersecao = (
            set(mais_escolhidos)
            & set(mais_similares)
        )

        registro[
            f"max_{variavel}"
        ] = letras_para_texto(
            mais_similares
        )

        registro[
            f"valor_max_{variavel}"
        ] = maior_valor

        registro[
            f"empate_{variavel}"
        ] = len(mais_similares) > 1

        registro[
            f"coincide_{variavel}"
        ] = len(intersecao) > 0


    registros_ranking.append(registro)


ranking = pd.DataFrame(
    registros_ranking
)


if len(ranking) != N_QUESTOES:
    raise ValueError(
        "Número incorreto de questões "
        "na análise de ranking."
    )


# ============================================================
# RESUMO DO RANKING
# ============================================================

def resumir_ranking(
    dados,
    nivel,
    ano=None,
    area=None,
):

    resultados = []

    for variavel, descricao in VARIAVEIS.items():

        coluna_coincide = (
            f"coincide_{variavel}"
        )

        coluna_empate = (
            f"empate_{variavel}"
        )

        n = len(dados)

        coincidencias = int(
            dados[coluna_coincide].sum()
        )

        proporcao = (
            coincidencias / n
            if n > 0
            else float("nan")
        )

        resultados.append({
            "nivel": nivel,
            "ano": ano,
            "area": area,

            "variavel": variavel,
            "descricao": descricao,

            "n_questoes": n,

            "coincidencias":
                coincidencias,

            "proporcao_coincidencia":
                proporcao,

            "baseline_aleatorio":
                0.25,

            "diferenca_baseline":
                proporcao - 0.25,

            "empates_similaridade":
                int(
                    dados[
                        coluna_empate
                    ].sum()
                ),

            "empates_escolha":
                int(
                    dados[
                        "empate_escolha"
                    ].sum()
                ),
        })

    return resultados


resultados_ranking = []


# Geral
resultados_ranking.extend(
    resumir_ranking(
        ranking,
        nivel="geral",
    )
)


# Ano
for ano, grupo in ranking.groupby("ano"):

    resultados_ranking.extend(
        resumir_ranking(
            grupo,
            nivel="ano",
            ano=ano,
        )
    )


# Área
for area, grupo in ranking.groupby("area"):

    resultados_ranking.extend(
        resumir_ranking(
            grupo,
            nivel="area",
            area=area,
        )
    )


# Ano × área
for (ano, area), grupo in ranking.groupby(
    ["ano", "area"]
):

    resultados_ranking.extend(
        resumir_ranking(
            grupo,
            nivel="ano_area",
            ano=ano,
            area=area,
        )
    )


resumo_ranking = pd.DataFrame(
    resultados_ranking
)


# ============================================================
# PARTE 3
# TABELAS PARA MARKDOWN
# ============================================================

print("Gerando tabelas em Markdown...")


def formatar_numero(valor, casas=3):
    """
    Formata número usando vírgula decimal.
    """

    if pd.isna(valor):
        return "—"

    return f"{valor:.{casas}f}".replace(
        ".",
        ",",
    )


def formatar_correlacao(valor):
    """
    Correlações com sinal explícito.
    """

    if pd.isna(valor):
        return "—"

    texto = f"{valor:+.3f}"

    return texto.replace(".", ",")


def formatar_percentual(valor):
    """
    Recebe proporção entre 0 e 1.
    """

    if pd.isna(valor):
        return "—"

    return (
        f"{valor * 100:.2f}%"
        .replace(".", ",")
    )


def tabela_markdown(df_tabela):
    """
    Converte DataFrame para Markdown sem depender
    do pacote tabulate.
    """

    colunas = list(df_tabela.columns)

    linhas = []

    # Cabeçalho
    linhas.append(
        "| "
        + " | ".join(colunas)
        + " |"
    )

    # Separador
    linhas.append(
        "|"
        + "|".join(
            ["---"] * len(colunas)
        )
        + "|"
    )

    # Dados
    for _, row in df_tabela.iterrows():

        valores = [
            str(row[coluna])
            for coluna in colunas
        ]

        linhas.append(
            "| "
            + " | ".join(valores)
            + " |"
        )

    return "\n".join(linhas)


# ============================================================
# TABELA 1
# RESULTADO PRINCIPAL
# ============================================================

corr_geral = (
    correlacoes[
        correlacoes["nivel"] == "geral"
    ]
    .set_index("variavel")
)

ranking_geral = (
    resumo_ranking[
        resumo_ranking["nivel"] == "geral"
    ]
    .set_index("variavel")
)


linhas = []

for variavel, descricao in VARIAVEIS.items():

    corr = corr_geral.loc[variavel]

    rank = ranking_geral.loc[variavel]

    coincidencias = int(
        rank["coincidencias"]
    )

    n = int(
        rank["n_questoes"]
    )

    linhas.append({
        "Relação analisada":
            descricao,
        "Pearson":
            formatar_correlacao(
                corr["pearson_r"]
            ),
        "Spearman ρ":
            formatar_correlacao(
                corr["spearman_rho"]
            ),

        "Coincidência com o distrator mais escolhido":
            (
                f"{formatar_percentual(rank['proporcao_coincidencia'])} "
                f"({coincidencias}/{n})"
            ),
    })


tabela_principal = pd.DataFrame(linhas)


# ============================================================
# TABELA 2
# TAMANHO DA BASE
# ============================================================

questoes_por_ano = (
    ranking.groupby("ano")
    .size()
)

distratores_por_ano = (
    df.groupby("ano")
    .size()
)


linhas = []

for ano in sorted(
    df["ano"].unique()
):

    linhas.append({
        "Ano":
            str(int(ano)),

        "Questões analisadas":
            f"{questoes_por_ano.loc[ano]:,}"
            .replace(",", "."),

        "Distratores analisados":
            f"{distratores_por_ano.loc[ano]:,}"
            .replace(",", "."),
    })


linhas.append({
    "Ano": "**Total**",

    "Questões analisadas":
        f"**{N_QUESTOES:,}**"
        .replace(",", "."),

    "Distratores analisados":
        f"**{N_DISTRATORES:,}**"
        .replace(",", "."),
})


tabela_amostra = pd.DataFrame(linhas)


# ============================================================
# TABELA 3
# RESULTADOS POR ÁREA
# ============================================================

corr_area = correlacoes[
    correlacoes["nivel"] == "area"
]

rank_area = resumo_ranking[
    resumo_ranking["nivel"] == "area"
]


linhas = []

for area in sorted(
    df["area"].unique()
):

    linha = {
        "Área": area,
    }

    for variavel in VARIAVEIS:

        valor_corr = corr_area[
            (corr_area["area"] == area)
            & (
                corr_area["variavel"]
                == variavel
            )
        ]["spearman_rho"].iloc[0]

        linha[
            VARIAVEIS[variavel]
        ] = formatar_correlacao(
            valor_corr
        )

    proporcao = rank_area[
        (rank_area["area"] == area)
        & (
            rank_area["variavel"]
            == "similaridade_com_correta"
        )
    ][
        "proporcao_coincidencia"
    ].iloc[0]

    linha[
        "Mais similar à correta = mais escolhido"
    ] = formatar_percentual(
        proporcao
    )

    linhas.append(linha)


tabela_area = pd.DataFrame(linhas)


# ============================================================
# TABELA 4
# RESULTADOS POR ANO
# ============================================================

corr_ano = correlacoes[
    correlacoes["nivel"] == "ano"
]

rank_ano = resumo_ranking[
    resumo_ranking["nivel"] == "ano"
]


linhas = []

for ano in sorted(
    df["ano"].unique()
):

    linha = {
        "Ano": str(int(ano)),
    }

    for variavel in VARIAVEIS:

        valor_corr = corr_ano[
            (corr_ano["ano"] == ano)
            & (
                corr_ano["variavel"]
                == variavel
            )
        ]["spearman_rho"].iloc[0]

        linha[
            VARIAVEIS[variavel]
        ] = formatar_correlacao(
            valor_corr
        )

    proporcao = rank_ano[
        (rank_ano["ano"] == ano)
        & (
            rank_ano["variavel"]
            == "similaridade_com_correta"
        )
    ][
        "proporcao_coincidencia"
    ].iloc[0]

    linha[
        "Mais similar à correta = mais escolhido"
    ] = formatar_percentual(
        proporcao
    )

    linhas.append(linha)


tabela_ano = pd.DataFrame(linhas)


# ============================================================
# CONSTRUIR ARQUIVO MARKDOWN
# ============================================================

conteudo_md = f"""# Resultados da análise dos distratores

Foram analisadas **{N_QUESTOES:,} questões** e **{N_DISTRATORES:,} distratores**.
""".replace(",", ".")


conteudo_md += """

## Resultados gerais

"""

conteudo_md += tabela_markdown(
    tabela_principal
)


conteudo_md += """

### Referência para interpretação

Como cada questão possui quatro distratores, a coincidência esperada por uma escolha aleatória é de aproximadamente **25%**.

A **proximidade relativa** corresponde à similaridade média do distrator com os outros distratores menos sua similaridade com a alternativa correta:

`proximidade relativa = similaridade média com outros distratores - similaridade com a correta`

Valores positivos indicam que o distrator é relativamente mais próximo dos demais distratores do que da alternativa correta.


## Quantidade de questões e distratores analisados

"""

conteudo_md += tabela_markdown(
    tabela_amostra
)


conteudo_md += """

## Resultados por área

Os valores das três colunas de similaridade correspondem ao coeficiente de correlação de Spearman (ρ).

"""

conteudo_md += tabela_markdown(
    tabela_area
)


conteudo_md += """

## Resultados por ano

Os valores das três colunas de similaridade correspondem ao coeficiente de correlação de Spearman (ρ).

"""

conteudo_md += tabela_markdown(
    tabela_ano
)


# ============================================================
# SALVAR RESULTADOS
# ============================================================

correlacoes.to_csv(
    ARQUIVO_CORRELACOES,
    sep=";",
    index=False,
    encoding="utf-8-sig",
)

ranking.to_csv(
    ARQUIVO_RANKING,
    sep=";",
    index=False,
    encoding="utf-8-sig",
)


ARQUIVO_MARKDOWN.write_text(
    conteudo_md,
    encoding="utf-8",
)


# ============================================================
# RESUMO NO TERMINAL
# ============================================================

print("\n========================================")
print("ANÁLISE CONCLUÍDA")
print("========================================")

print(
    f"\nQuestões analisadas: {N_QUESTOES}"
)

print(
    f"Distratores analisados: {N_DISTRATORES}"
)


print("\nRESULTADOS GERAIS:")

for variavel, descricao in VARIAVEIS.items():

    corr = corr_geral.loc[variavel]
    rank = ranking_geral.loc[variavel]

    print(f"\n{descricao}")

    print(
        "  Spearman rho: "
        f"{corr['spearman_rho']:.6f}"
    )

    print(
        "  Coincidência: "
        f"{rank['proporcao_coincidencia'] * 100:.2f}%"
    )


print("\nArquivos gerados:")

print(
    f"- {ARQUIVO_CORRELACOES.name}"
)

print(
    f"- {ARQUIVO_RANKING.name}"
)



print(
    f"- {ARQUIVO_MARKDOWN.name}"
)

print("\nSUCESSO.")