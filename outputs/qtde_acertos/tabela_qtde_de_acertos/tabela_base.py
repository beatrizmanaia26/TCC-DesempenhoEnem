import pandas as pd
import os

# ============================================================
# CONFIGURAÇÃO
# ============================================================

PASTA_DADOS = "microdados"

ANOS = [2020, 2022, 2023, 2024, 2025]

AREAS = ["CN", "CH", "LC", "MT"]

CODIGOS_REGULARES = {
    2020: {
        "CN": [597, 598, 599, 600],
        "CH": [567, 568, 569, 570],
        "LC": [577, 578, 579, 580],
        "MT": [587, 588, 589, 590],
    },

    2022: {
        "CN": [1085, 1086, 1087, 1088],
        "CH": [1055, 1056, 1057, 1058],
        "LC": [1065, 1066, 1067, 1068],
        "MT": [1075, 1076, 1077, 1078],
    },

    2023: {
        "CN": [1221, 1222, 1223, 1224],
        "CH": [1191, 1192, 1193, 1194],
        "LC": [1201, 1202, 1203, 1204],
        "MT": [1211, 1212, 1213, 1214],
    },

    2024: {
        "CN": [1419, 1420, 1421, 1422],
        "CH": [1383, 1384, 1385, 1386],
        "LC": [1395, 1396, 1397, 1398],
        "MT": [1407, 1408, 1409, 1410],
    },

    2025: {
        "CN": [1483, 1484, 1485, 1486],
        "CH": [1447, 1448, 1449, 1450],
        "LC": [1459, 1460, 1461, 1462],
        "MT": [1471, 1472, 1473, 1474],
    }
}

# Códigos das versões azuis dentro das versões regulares acima. A posição
# publicada em ITENS_PROVA para esses cadernos será incluída no resultado.
CODIGOS_AZUIS = {
    2020: {"CN": 597, "CH": 567, "LC": 577, "MT": 587},
    2022: {"CN": 1085, "CH": 1055, "LC": 1065, "MT": 1075},
    2023: {"CN": 1221, "CH": 1191, "LC": 1201, "MT": 1211},
    2024: {"CN": 1419, "CH": 1383, "LC": 1395, "MT": 1407},
    2025: {"CN": 1483, "CH": 1447, "LC": 1459, "MT": 1471},
}


# Colunas necessárias dos microdados
COLUNAS_MICRODADOS = [
    "SG_UF_PROVA",
    "TP_LINGUA",

    "TP_PRESENCA_CN",
    "TP_PRESENCA_CH",
    "TP_PRESENCA_LC",
    "TP_PRESENCA_MT",

    "CO_PROVA_CN",
    "CO_PROVA_CH",
    "CO_PROVA_LC",
    "CO_PROVA_MT",

    "TX_RESPOSTAS_CN",
    "TX_RESPOSTAS_CH",
    "TX_RESPOSTAS_LC",
    "TX_RESPOSTAS_MT",

    "TX_GABARITO_CN",
    "TX_GABARITO_CH",
    "TX_GABARITO_LC",
    "TX_GABARITO_MT",
]

# A leitura em blocos evita manter na memória o arquivo inteiro (que pode ter
# vários GB). Aumente este valor caso tenha bastante memória disponível.
TAMANHO_BLOCO = 100_000


# ============================================================
# FUNÇÃO PARA PROCESSAR UM ANO
# ============================================================

def processar_ano(ano):

    print(f"\nProcessando {ano}...")

    if ano <= 2023:
        arquivo_microdados = os.path.join(
            PASTA_DADOS,
            f"microdados_enem_{ano}/DADOS/MICRODADOS_ENEM_{ano}.csv"
        )
    elif ano >= 2024:
        # A partir de 2024, as respostas e os gabaritos estão neste arquivo;
        # PARTICIPANTES contém somente informações cadastrais.
        arquivo_microdados = os.path.join(
            PASTA_DADOS,
            f"microdados_enem_{ano}/DADOS/RESULTADOS_{ano}.csv"
        )
    else:
        arquivo_microdados = os.path.join(
            PASTA_DADOS,
            f"microdados_enem_{ano}/DADOS/PARTICIPANTES_{ano}.csv"
        )

    arquivo_itens = os.path.join(
        PASTA_DADOS,
        f"microdados_enem_{ano}/DADOS/ITENS_PROVA_{ano}.csv"
    )

    # Não é possível calcular acertos sem respostas, gabaritos, presença e
    # código da prova. Essa verificação também dá uma mensagem clara quando a
    # estrutura dos microdados muda entre edições.
    colunas_disponiveis = pd.read_csv(
        arquivo_microdados,
        sep=";",
        encoding="latin1",
        nrows=0
    ).columns
    colunas_ausentes = set(COLUNAS_MICRODADOS) - set(colunas_disponiveis)
    if colunas_ausentes:
        print(
            f"  {ano} ignorado: {os.path.basename(arquivo_microdados)} não contém "
            "as respostas e/ou gabaritos necessários."
        )
        return None

    # --------------------------------------------------------
    # Ler tabela de itens
    # --------------------------------------------------------

    itens = pd.read_csv(
        arquivo_itens,
        sep=";",
        encoding="latin1"
    )

    resultados = []

    # Para cada área/prova, guarda o item e o índice correspondente nas
    # strings TX_RESPOSTAS/TX_GABARITO.
    itens_por_area_e_prova = {}
    posicoes_azul = {}
    linguas_estrangeiras = {}

    for area in AREAS:
        codigos = CODIGOS_REGULARES[ano][area]
        itens_area = itens[
            (itens["SG_AREA"] == area) &
            (itens["CO_PROVA"].isin(codigos))
        ]

        itens_azuis = itens_area[
            itens_area["CO_PROVA"] == CODIGOS_AZUIS[ano][area]
        ]
        for item_azul in itens_azuis.itertuples(index=False):
            posicoes_azul[(area, item_azul.CO_ITEM)] = int(item_azul.CO_POSICAO)
            if area == "LC" and pd.notna(item_azul.TP_LINGUA):
                linguas_estrangeiras[(area, item_azul.CO_ITEM)] = (
                    "Inglês" if int(item_azul.TP_LINGUA) == 0 else "Espanhol"
                )

        for prova in codigos:
            itens_prova = (
                itens_area[itens_area["CO_PROVA"] == prova]
                [["CO_ITEM", "CO_POSICAO", "TP_LINGUA"]]
                .copy()
            )

            if area == "LC":
                # Em Linguagens há 50 posições: 5 de inglês, 5 de espanhol
                # e 40 itens comuns no gabarito. Cada participante responde
                # somente um idioma.
                itens_prova["INDICE_GABARITO"] = itens_prova["CO_POSICAO"] + 4
                itens_prova.loc[
                    itens_prova["TP_LINGUA"] == 0,
                    "INDICE_GABARITO"
                ] = itens_prova.loc[itens_prova["TP_LINGUA"] == 0, "CO_POSICAO"] - 1

                if ano == 2020:
                    # Em 2020, a resposta também tem 50 posições e traz 9
                    # nas cinco questões do idioma não escolhido.
                    itens_prova["INDICE_RESPOSTA"] = itens_prova["INDICE_GABARITO"]
                else:
                    # De 2022 em diante, a resposta tem só 45 posições: as
                    # cinco do idioma escolhido e as 40 questões comuns.
                    itens_prova["INDICE_RESPOSTA"] = itens_prova["CO_POSICAO"] - 1
            else:
                itens_prova = itens_prova.sort_values("CO_POSICAO")
                itens_prova["INDICE_RESPOSTA"] = range(len(itens_prova))
                itens_prova["INDICE_GABARITO"] = itens_prova["INDICE_RESPOSTA"]

            itens_por_area_e_prova[(area, prova)] = itens_prova.sort_values(
                "INDICE_RESPOSTA"
            )

    # Acumula somente os totais finais. A versão anterior criava uma linha
    # Python para cada participante e questão, o que gerava dezenas de
    # milhões de dicionários e tornava a execução excessivamente lenta.
    acumulados = {}
    itens_anulados = set()
    participantes_por_area = {area: 0 for area in AREAS}

    # --------------------------------------------------------
    # Ler e processar os microdados em blocos
    # --------------------------------------------------------

    leitor = pd.read_csv(
        arquivo_microdados,
        sep=";",
        encoding="latin1",
        usecols=COLUNAS_MICRODADOS,
        low_memory=False,
        chunksize=TAMANHO_BLOCO
    )

    for numero_bloco, microdados in enumerate(leitor, start=1):
        print(f"  Bloco {numero_bloco} lido", flush=True)

    # --------------------------------------------------------
    # Processar cada área
    # --------------------------------------------------------

        for area in AREAS:

            codigo_presenca = f"TP_PRESENCA_{area}"
            codigo_prova = f"CO_PROVA_{area}"
            respostas = f"TX_RESPOSTAS_{area}"
            gabarito = f"TX_GABARITO_{area}"

            codigos = CODIGOS_REGULARES[ano][area]

            colunas_candidatos = [codigo_prova, respostas, gabarito]
            if area == "LC":
                colunas_candidatos.append("TP_LINGUA")

            candidatos = microdados.loc[
                (microdados["SG_UF_PROVA"] == "SP") &
                (microdados[codigo_presenca] == 1) &
                (microdados[codigo_prova].isin(codigos)),
                colunas_candidatos
            ]
            participantes_por_area[area] += len(candidatos)

            for prova, candidatos_prova in candidatos.groupby(codigo_prova):
                prova = int(prova)
                itens_prova = itens_por_area_e_prova[(area, prova)]
                respostas_candidatos = candidatos_prova[respostas].astype("string")
                gabarito_prova = candidatos_prova[gabarito].iloc[0]

                for item in itens_prova.itertuples(index=False):
                    co_item = item.CO_ITEM
                    indice_resposta = int(item.INDICE_RESPOSTA)
                    indice_gabarito = int(item.INDICE_GABARITO)

                    # X identifica item anulado. Ele não deve reduzir a taxa
                    # de acerto, pois não há resposta correta para comparar.
                    if gabarito_prova[indice_gabarito] == "X":
                        itens_anulados.add((area, co_item))
                        continue

                    if area == "LC" and pd.notna(item.TP_LINGUA):
                        mascara_lingua = candidatos_prova["TP_LINGUA"] == item.TP_LINGUA
                        respostas_item = respostas_candidatos[mascara_lingua]
                    else:
                        respostas_item = respostas_candidatos

                    total_participantes = len(respostas_item)
                    chave = (area, co_item)
                    if chave not in acumulados:
                        acumulados[chave] = [0, 0]

                    acumulados[chave][0] += total_participantes
                    acumulados[chave][1] += int(
                        respostas_item.str[indice_resposta].eq(
                            gabarito_prova[indice_gabarito]
                        ).sum()
                    )

    for area in AREAS:
        print(f"  Área: {area} — participantes: {participantes_por_area[area]:,}")

    for (area, co_item), (n_respostas, n_acertos) in acumulados.items():
        if (area, co_item) in itens_anulados:
            continue
        posicao_prova_azul = posicoes_azul.get((area, co_item))
        if posicao_prova_azul is None:
            raise ValueError(
                f"Item {co_item} da área {area} não foi encontrado na prova azul de {ano}."
            )
        resultados.append({
            "ano": ano,
            "area": area,
            "co_item": co_item,
            "posicao_prova_azul": posicao_prova_azul,
            "lingua_estrangeira": linguas_estrangeiras.get((area, co_item)),
            "n_respostas": n_respostas,
            "n_acertos": n_acertos
        })

    return pd.DataFrame(resultados)

# ============================================================
# PROCESSAR TODOS OS ANOS
# ============================================================

todos_resultados = []

for ano in ANOS:

    resultado_ano = processar_ano(ano)

    if resultado_ano is not None:
        todos_resultados.append(resultado_ano)


dados = pd.concat(
    todos_resultados,
    ignore_index=True
)


# ============================================================
# GERAR TABELA GERAL
# ============================================================

tabela_final = (
    dados
    .groupby(["ano", "area", "co_item"]) #Agrupa todas as linhas com esses valores iguais
    .agg(
        posicao_prova_azul=("posicao_prova_azul", "first"),
        lingua_estrangeira=("lingua_estrangeira", "first"),
        n_respostas=("n_respostas", "sum"),
        n_acertos=("n_acertos", "sum")
    )
    .reset_index()
)

tabela_final["percentual_acertos"] = (
    tabela_final["n_acertos"] /
    tabela_final["n_respostas"]
) * 100


# Arredondamento do percentual
tabela_final["percentual_acertos"] = (
    tabela_final["percentual_acertos"].round(2)
)


# Ordenar
tabela_final = tabela_final.sort_values(
    ["ano", "area", "posicao_prova_azul", "co_item"]
)


# ============================================================
# SALVAR
# ============================================================

tabela_final.to_csv(
    "desempenho_questoes.csv",
    index=False,
    encoding="utf-8-sig"
)

print("\n========================================")
print("Tabela criada com sucesso!")
print("Arquivo: desempenho_questoes.csv")
print("========================================")

print("\nPrimeiras linhas:")
print(tabela_final.head(20))
