

import pandas as pd
import os
import pandas as pd
import numpy as np
from itertools import combinations
from sentence_transformers import SentenceTransformer

# Arquivos de cada caderno do ENEM
cadernos = {
    "Azul":    "RespostasLinguagensProvaAzul.csv",
    "Amarela": "RespostasProvaAmarela.csv",
    "Verde":    "RespostasProvaVerde.csv",
    "Cinza":   "RespostasProvasCinzaeBranca.csv",   # ajusta os nomes reais dos arquivos
}

# Coluna de resposta de cada área
areas = {
    "Linguagens":        "TX_RESPOSTAS_LC",
    "Ciências Humanas":  "TX_RESPOSTAS_CH",
    "Matemática":        "TX_RESPOSTAS_MT",
    "Ciências Naturais": "TX_RESPOSTAS_CN",
}

#Pega as respostas dos participantes, separando respostas em branco e vazias
def analisar_area(df, col_respostas, n_questoes=45):
    total = len(df)
    resultados = []
    for posicao in range(1, n_questoes + 1):
        resp = df[col_respostas].str[posicao - 1]
        brancos = (resp == ".").sum()
        duplas = (resp == "*").sum()
        validos = resp[~resp.isin([".", "*"])]
        distrib = validos.value_counts(normalize=True).sort_index()

        linha = {
            "questao": posicao,
            "pct_branco": brancos / total,
            "pct_dupla": duplas / total,
        }
        linha.update({f"pct_{alt}": pct for alt, pct in distrib.items()})
        resultados.append(linha)
    return pd.DataFrame(resultados)

# Pegando em todas as cores
todas = []
for cor, arquivo in cadernos.items():
    df = pd.read_csv(arquivo, sep=";")
    for area, col in areas.items():
        resultado = analisar_area(df, col)
        resultado.insert(0, "cor", cor)
        resultado.insert(1, "area", area)
        todas.append(resultado)

#Transferindo para um csv com tudo
todas = pd.concat(todas, ignore_index=True)
todas.to_csv("taxas_escolha_completo.csv", index=False)
colunas_pct = [c for c in todas.columns if c.startswith("pct_")]

#Formatação para deixar bunitinho em Markdown
todas_formatado = todas.copy()
todas_formatado[colunas_pct] = todas_formatado[colunas_pct].applymap(lambda x: f"{x:.2%}")
for cor in cadernos:
    print(f"\n# Caderno {cor}\n")
    for area in areas:
        subset = todas_formatado[(todas["cor"] == cor) & (todas_formatado["area"] == area)]
        print(f"## {area}\n")
        print(subset.drop(columns=["cor", "area"]).round(4).to_markdown(index=False))
        print()

#Necessário para poder transformar em tabelas markdown
#!pip install tabulate




#Não vou vazar minha senha hoje
acesso = "token_acesso_hugging_face"

modelo = SentenceTransformer("iara-project/e5-large-matryoshka-sts-pt", token=acesso)

#Leitura do CSV das questões
df = pd.read_csv("Caderno_algum_enem.csv", sep=";")
#Colunas com texto das alternativas no CSV
alt_cols = ["Alternativa_A", "Alternativa_B", "Alternativa_C", "Alternativa_D", "Alternativa_E"]
letras = ["A", "B", "C", "D", "E"]
pares = list(combinations(letras, 2)) #pegando combinações de alternativas para comparar similaridades

def similaridade_par(row):
    textos = [row[c] for c in alt_cols]
    embeddings = modelo.encode(textos)
    sim_matrix = modelo.similarity(embeddings, embeddings)  # tensor [5, 5]
    return pd.Series({
        f"sim_{i}{j}": float(sim_matrix[letras.index(i)][letras.index(j)])
        for i, j in pares
    })

#Formatação do conteúdo - N° da questão, área de conhecimento, o idioma(no caso das de linguagens), e o gabarito)
sim_df = df.apply(similaridade_par, axis=1)
resultado = pd.concat([df[["Numero", "Area", "Idioma","Gabarito"]], sim_df], axis=1)

#Pegando a similaridade geral de cada questão
sim_cols = [c for c in resultado.columns if c.startswith("sim_")]
resultado["sim_media"] = resultado[sim_cols].mean(axis=1)
resultado["sim_maxima"] = resultado[sim_cols].max(axis=1)
resultado["par_mais_similar"] = resultado[sim_cols].idxmax(axis=1).str.replace("sim_", "")
#colocando resultados em um CSV separado
resultado.to_csv("similaridade_alternativas.csv", index=False)

#Formatando para Markdown
resultado_formatado = resultado.copy()
resultado_formatado[sim_cols + ["sim_media", "sim_maxima"]] = (
    resultado_formatado[sim_cols + ["sim_media", "sim_maxima"]].applymap(lambda x: f"{x:.2%}")
)

for area in resultado["Area"].unique():
    print(f"\n## {area}\n")
    subset = resultado_formatado[resultado_formatado["Area"] == area]
    print(subset.drop(columns=["Area"]).to_markdown(index=False))
    print()