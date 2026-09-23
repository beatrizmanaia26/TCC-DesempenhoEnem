from pathlib import Path
from itertools import combinations

import pandas as pd


# ============================================================
# CONFIGURAÇÃO
# ============================================================

RAIZ = Path(r"C:\Users\Nuno\Downloads\TCCDistratores")

ARQUIVO_METRICAS = RAIZ / "metricas_com_taxas_escolha.csv"
ARQUIVO_SIMILARIDADES = RAIZ / "similaridades_com_gabarito.csv"
ARQUIVO_SAIDA = RAIZ / "base_distratores.csv"

LETRAS = ["A", "B", "C", "D", "E"]

COLUNAS_SIMILARIDADE = [
    "sim_AB",
    "sim_AC",
    "sim_AD",
    "sim_AE",
    "sim_BC",
    "sim_BD",
    "sim_BE",
    "sim_CD",
    "sim_CE",
    "sim_DE",
]

CHAVE_SIMILARIDADE = [
    "ano",
    "codigo_prova",
    "area",
    "questao",
    "idioma",
]


# ============================================================
# FUNÇÕES AUXILIARES
# ============================================================

def coluna_similaridade(letra1, letra2):
    """
    Retorna o nome da coluna correspondente ao par de alternativas.

    Exemplos:
        A, C -> sim_AC
        D, B -> sim_BD
    """

    a, b = sorted([letra1, letra2])

    return f"sim_{a}{b}"


def obter_similaridade(row, letra1, letra2):
    """
    Obtém a similaridade entre duas alternativas da questão.
    """

    coluna = coluna_similaridade(letra1, letra2)

    if coluna not in row.index:
        raise ValueError(
            f"Coluna de similaridade inexistente: {coluna}"
        )

    return row[coluna]


# ============================================================
# LEITURA
# ============================================================

print("Lendo métricas e taxas de escolha...")

metricas = pd.read_csv(
    ARQUIVO_METRICAS,
    sep=";",
    encoding="utf-8-sig",
)

print(f"Questões encontradas nas métricas: {len(metricas)}")


print("\nLendo similaridades completas...")

similaridades = pd.read_csv(
    ARQUIVO_SIMILARIDADES,
    sep=";",
    encoding="utf-8-sig",
)

print(similaridades.columns.tolist())
print(
    f"Questões encontradas nas similaridades: "
    f"{len(similaridades)}"
)


# ============================================================
# VALIDAÇÃO DAS COLUNAS
# ============================================================

colunas_metricas = [
    "ano",
    "cor",
    "area",
    "questao",
    "idioma",
    "codigo_prova",
    "gabarito",

    "distrator_1",
    "distrator_2",
    "distrator_3",
    "distrator_4",

    "sim_distrator_1_correta",
    "sim_distrator_2_correta",
    "sim_distrator_3_correta",
    "sim_distrator_4_correta",

    "sim_media_cor_distratores",
    "sim_max_cor_distrator",
    "distrator_mais_similar",

    "sim_media_entre_distratores",
    "sim_max_entre_distratores",
    "par_distratores_mais_similar",

    "pct_A",
    "pct_B",
    "pct_C",
    "pct_D",
    "pct_E",
]

faltando_metricas = [
    coluna
    for coluna in colunas_metricas
    if coluna not in metricas.columns
]

if faltando_metricas:
    raise ValueError(
        "Colunas ausentes em metricas_com_taxas_escolha.csv:\n"
        + "\n".join(faltando_metricas)
    )


colunas_sim = CHAVE_SIMILARIDADE + COLUNAS_SIMILARIDADE

faltando_sim = [
    coluna
    for coluna in colunas_sim
    if coluna not in similaridades.columns
]

if faltando_sim:
    raise ValueError(
        "Colunas ausentes em similaridades_com_gabarito.csv:\n"
        + "\n".join(faltando_sim)
    )


# ============================================================
# NORMALIZAÇÃO
# ============================================================

metricas["gabarito"] = (
    metricas["gabarito"]
    .astype(str)
    .str.strip()
    .str.upper()
)

for coluna in [
    "distrator_1",
    "distrator_2",
    "distrator_3",
    "distrator_4",
]:
    metricas[coluna] = (
        metricas[coluna]
        .astype(str)
        .str.strip()
        .str.upper()
    )


# ============================================================
# INCORPORAR AS 10 SIMILARIDADES
# ============================================================

print("\nIncorporando as 10 similaridades de cada questão...")


# Mantemos apenas o necessário da segunda base.
sim_para_merge = similaridades[
    CHAVE_SIMILARIDADE + COLUNAS_SIMILARIDADE
].copy()

duplicadas = sim_para_merge.duplicated(
    subset=CHAVE_SIMILARIDADE,
    keep=False,
)

if duplicadas.any():
    print(
        sim_para_merge.loc[
            duplicadas,
            CHAVE_SIMILARIDADE,
        ].to_string(index=False)
    )

    raise ValueError(
        "Existem questões duplicadas na base de similaridades."
    )

df = metricas.merge(
    sim_para_merge,
    on=CHAVE_SIMILARIDADE,
    how="left",
    validate="one_to_one",
)

print(
    f"Questões após incorporar similaridades: {len(df)}"
)

if len(df) != len(metricas):
    raise ValueError(
        "O número de questões mudou durante o merge."
    )


# ============================================================
# CONVERSÃO NUMÉRICA DAS 10 SIMILARIDADES
# ============================================================

for coluna in COLUNAS_SIMILARIDADE:
    df[coluna] = pd.to_numeric(
        df[coluna],
        errors="coerce",
    )


sem_similaridades = df[
    COLUNAS_SIMILARIDADE
].isna().any(axis=1)

if sem_similaridades.any():
    print(
        df.loc[
            sem_similaridades,
            CHAVE_SIMILARIDADE,
        ].to_string(index=False)
    )

    raise ValueError(
        f"{sem_similaridades.sum()} questões ficaram "
        "sem alguma das 10 similaridades."
    )


# ============================================================
# VALIDAÇÃO DAS QUESTÕES
# ============================================================

print("\nValidando base de questões...")

gabaritos_invalidos = df[
    ~df["gabarito"].isin(LETRAS)
]

if not gabaritos_invalidos.empty:
    raise ValueError(
        f"{len(gabaritos_invalidos)} questões possuem "
        "gabarito diferente de A-E."
    )


for indice, row in df.iterrows():

    correta = row["gabarito"]

    distratores = [
        row["distrator_1"],
        row["distrator_2"],
        row["distrator_3"],
        row["distrator_4"],
    ]

    esperados = sorted(
        letra
        for letra in LETRAS
        if letra != correta
    )

    encontrados = sorted(distratores)

    if encontrados != esperados:
        raise ValueError(
            "\nDistratores inconsistentes.\n"
            f"Índice: {indice}\n"
            f"Ano: {row['ano']}\n"
            f"Cor: {row['cor']}\n"
            f"Área: {row['area']}\n"
            f"Questão: {row['questao']}\n"
            f"Gabarito: {correta}\n"
            f"Esperados: {esperados}\n"
            f"Encontrados: {encontrados}"
        )


# ============================================================
# TRANSFORMAÇÃO
#
# UMA QUESTÃO -> QUATRO LINHAS
#
# Cada linha representa um distrator e contém:
#
# - taxa de escolha
# - similaridade com a correta
# - similaridade com cada um dos outros 3 distratores
# - média/máximo/mínimo dessas três relações
# - diferença entre proximidade com os distratores
#   e proximidade com a correta
# - TODAS as 10 similaridades originais da questão
# ============================================================

print("\nGerando base completa em nível de distrator...")

registros = []

for _, row in df.iterrows():

    correta = row["gabarito"]

    distratores = [
        row["distrator_1"],
        row["distrator_2"],
        row["distrator_3"],
        row["distrator_4"],
    ]

    taxa_correta = row[f"pct_{correta}"]

    for distrator in distratores:

        # ----------------------------------------------------
        # SIMILARIDADE DO DISTRATOR COM A CORRETA
        # ----------------------------------------------------

        sim_correta = obter_similaridade(
            row,
            distrator,
            correta,
        )


        # ----------------------------------------------------
        # OUTROS TRÊS DISTRAtores
        # ----------------------------------------------------

        outros = [
            letra
            for letra in distratores
            if letra != distrator
        ]

        if len(outros) != 3:
            raise ValueError(
                f"O distrator {distrator} não possui "
                "exatamente três outros distratores."
            )


        # Mantemos os outros distratores em ordem alfabética.
        outros = sorted(outros)

        outro_1, outro_2, outro_3 = outros


        sim_outro_1 = obter_similaridade(
            row,
            distrator,
            outro_1,
        )

        sim_outro_2 = obter_similaridade(
            row,
            distrator,
            outro_2,
        )

        sim_outro_3 = obter_similaridade(
            row,
            distrator,
            outro_3,
        )


        sims_outros = [
            sim_outro_1,
            sim_outro_2,
            sim_outro_3,
        ]


        # ----------------------------------------------------
        # RESUMOS DO DISTRATOR
        # ----------------------------------------------------

        sim_media_outros = sum(sims_outros) / 3

        sim_max_outros = max(sims_outros)

        sim_min_outros = min(sims_outros)


        # Positivo:
        # distrator é, em média, mais próximo dos outros
        # distratores do que da alternativa correta.
        diferenca_similaridade = (
            sim_media_outros
            - sim_correta
        )


        # ----------------------------------------------------
        # QUAL OUTRO DISTRATOR É O MAIS PRÓXIMO?
        # ----------------------------------------------------

        pares_outros = [
            (outro_1, sim_outro_1),
            (outro_2, sim_outro_2),
            (outro_3, sim_outro_3),
        ]

        outro_mais_similar, valor_mais_similar = max(
            pares_outros,
            key=lambda x: x[1],
        )


        # ----------------------------------------------------
        # REGISTRO
        # ----------------------------------------------------

        registro = {
            # Identificação da questão
            "ano": row["ano"],
            "cor": row["cor"],
            "area": row["area"],
            "questao": row["questao"],
            "idioma": row["idioma"],
            "codigo_prova": row["codigo_prova"],

            # Alternativa correta e distrator observado
            "gabarito": correta,
            "distrator": distrator,

            # Taxas de escolha
            "taxa_escolha_distrator":
                row[f"pct_{distrator}"],

            "taxa_escolha_correta":
                taxa_correta,

            # =================================================
            # RELAÇÃO DISTRATOR ↔ CORRETA
            # =================================================

            "similaridade_com_correta":
                sim_correta,

            # =================================================
            # RELAÇÃO DISTRATOR ↔ OUTROS DISTRAtores
            # =================================================

            "outro_distrator_1":
                outro_1,

            "sim_outro_distrator_1":
                sim_outro_1,

            "outro_distrator_2":
                outro_2,

            "sim_outro_distrator_2":
                sim_outro_2,

            "outro_distrator_3":
                outro_3,

            "sim_outro_distrator_3":
                sim_outro_3,

            "sim_media_outros_distratores":
                sim_media_outros,

            "sim_max_outros_distratores":
                sim_max_outros,

            "sim_min_outros_distratores":
                sim_min_outros,

            "outro_distrator_mais_similar":
                outro_mais_similar,

            "sim_outro_mais_similar":
                valor_mais_similar,

            # =================================================
            # COMPARAÇÃO:
            #
            # outros distratores - correta
            # =================================================

            "diferenca_similaridade":
                diferenca_similaridade,

            # =================================================
            # MÉTRICAS GERAIS DA QUESTÃO
            # =================================================

            "sim_media_cor_distratores":
                row["sim_media_cor_distratores"],

            "sim_max_cor_distrator":
                row["sim_max_cor_distrator"],

            "distrator_mais_similar":
                row["distrator_mais_similar"],

            "sim_media_entre_distratores":
                row["sim_media_entre_distratores"],

            "sim_max_entre_distratores":
                row["sim_max_entre_distratores"],

            "par_distratores_mais_similar":
                row["par_distratores_mais_similar"],
        }


        # =====================================================
        # TODAS AS 10 SIMILARIDADES ORIGINAIS
        # =====================================================

        for coluna in COLUNAS_SIMILARIDADE:
            registro[coluna] = row[coluna]


        registros.append(registro)


base = pd.DataFrame(registros)


# ============================================================
# CONVERSÃO NUMÉRICA
# ============================================================

colunas_numericas = [
    "taxa_escolha_distrator",
    "taxa_escolha_correta",

    "similaridade_com_correta",

    "sim_outro_distrator_1",
    "sim_outro_distrator_2",
    "sim_outro_distrator_3",

    "sim_media_outros_distratores",
    "sim_max_outros_distratores",
    "sim_min_outros_distratores",
    "sim_outro_mais_similar",

    "diferenca_similaridade",

    "sim_media_cor_distratores",
    "sim_max_cor_distrator",

    "sim_media_entre_distratores",
    "sim_max_entre_distratores",

    *COLUNAS_SIMILARIDADE,
]

for coluna in colunas_numericas:
    base[coluna] = pd.to_numeric(
        base[coluna],
        errors="coerce",
    )


# ============================================================
# VALIDAÇÕES DA BASE FINAL
# ============================================================

print("Validando base final...")

esperado = len(df) * 4

if len(base) != esperado:
    raise ValueError(
        f"Número incorreto de linhas. "
        f"Esperado: {esperado}; "
        f"encontrado: {len(base)}."
    )


# ------------------------------------------------------------
# DISTRATOR != GABARITO
# ------------------------------------------------------------

iguais = base[
    base["distrator"] == base["gabarito"]
]

if not iguais.empty:
    raise ValueError(
        f"{len(iguais)} linhas possuem distrator "
        "igual ao gabarito."
    )


# ------------------------------------------------------------
# AUSÊNCIA DE VALORES
# ------------------------------------------------------------

colunas_essenciais = [
    "similaridade_com_correta",
    "taxa_escolha_distrator",

    "sim_outro_distrator_1",
    "sim_outro_distrator_2",
    "sim_outro_distrator_3",

    "sim_media_outros_distratores",
    "diferenca_similaridade",

    *COLUNAS_SIMILARIDADE,
]

ausentes = base[
    colunas_essenciais
].isna().sum()

ausentes = ausentes[
    ausentes > 0
]

if not ausentes.empty:
    print("\nValores ausentes:")
    print(ausentes)

    raise ValueError(
        "A base final contém valores essenciais ausentes."
    )


# ------------------------------------------------------------
# EXATAMENTE 4 DISTRATORES POR QUESTÃO
# ------------------------------------------------------------

contagens = (
    base.groupby(CHAVE_SIMILARIDADE)
    .size()
)

problemas_contagem = contagens[
    contagens != 4
]

if not problemas_contagem.empty:
    raise ValueError(
        "Há questões que não possuem exatamente "
        "quatro distratores:\n"
        f"{problemas_contagem}"
    )


# ------------------------------------------------------------
# EXATAMENTE 4 DISTRATORES DIFERENTES POR QUESTÃO
# ------------------------------------------------------------

quantidade_distratores = (
    base.groupby(CHAVE_SIMILARIDADE)["distrator"]
    .nunique()
)

problemas_distratores = quantidade_distratores[
    quantidade_distratores != 4
]

if not problemas_distratores.empty:
    raise ValueError(
        "Há questões que não possuem quatro "
        "distratores distintos."
    )


# ============================================================
# VALIDAÇÃO MAIS IMPORTANTE:
#
# AS SIMILARIDADES DERIVADAS PRECISAM BATER COM AS
# 10 SIMILARIDADES ORIGINAIS.
# ============================================================

print(
    "Conferindo relações distrator-correta "
    "e distrator-distrator..."
)

for indice, row in base.iterrows():

    distrator = row["distrator"]
    correta = row["gabarito"]

    coluna = coluna_similaridade(
        distrator,
        correta,
    )

    original = row[coluna]
    derivada = row["similaridade_com_correta"]

    if abs(original - derivada) > 1e-9:
        raise ValueError(
            "\nSimilaridade com a correta não confere.\n"
            f"Linha: {indice}\n"
            f"Par: {distrator}-{correta}\n"
            f"Original: {original}\n"
            f"Derivada: {derivada}"
        )


    for numero in range(1, 4):

        outro = row[
            f"outro_distrator_{numero}"
        ]

        coluna = coluna_similaridade(
            distrator,
            outro,
        )

        original = row[coluna]

        derivada = row[
            f"sim_outro_distrator_{numero}"
        ]

        if abs(original - derivada) > 1e-9:
            raise ValueError(
                "\nSimilaridade entre distratores "
                "não confere.\n"
                f"Linha: {indice}\n"
                f"Par: {distrator}-{outro}\n"
                f"Original: {original}\n"
                f"Derivada: {derivada}"
            )


# ============================================================
# RESUMO
# ============================================================

print("\nResumo final:")

resumo = (
    base.groupby("ano")
    .agg(
        questoes=(
            "questao",
            lambda x: len(x) // 4,
        ),
        distratores=(
            "distrator",
            "size",
        ),
    )
)

print(resumo)


print(
    f"\nQuestões analisáveis: {len(df)}"
)

print(
    f"Distratores gerados: {len(base)}"
)

print(
    f"Similaridades originais preservadas por questão: "
    f"{len(COLUNAS_SIMILARIDADE)}"
)

print(
    f"Esperado: {esperado}"
)


# ============================================================
# MOSTRAR EXEMPLO
# ============================================================

print("\nExemplo das primeiras quatro linhas:")

colunas_exemplo = [
    "ano",
    "cor",
    "area",
    "questao",
    "gabarito",
    "distrator",

    "similaridade_com_correta",

    "outro_distrator_1",
    "sim_outro_distrator_1",

    "outro_distrator_2",
    "sim_outro_distrator_2",

    "outro_distrator_3",
    "sim_outro_distrator_3",

    "sim_media_outros_distratores",
    "diferenca_similaridade",

    "taxa_escolha_distrator",
]

print(
    base[
        colunas_exemplo
    ].head(4).to_string(index=False)
)


# ============================================================
# SALVAR
# ============================================================

base.to_csv(
    ARQUIVO_SAIDA,
    sep=";",
    index=False,
    encoding="utf-8-sig",
)

print("\nSUCESSO.")
print(f"Arquivo salvo em:\n{ARQUIVO_SAIDA}")