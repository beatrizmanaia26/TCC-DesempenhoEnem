import pandas as pd
from scipy.stats import spearmanr

#Leitura da tabela
tabela = pd.read_csv(
    "desempenho_questoes_por_prova.csv",
    sep=",",
    encoding="utf-8-sig"
)
#Tabela, mas tirando as linhas com nulo no tri
tabela_tri = tabela.dropna(subset=["parametro_b_tri"]).copy()

resul_posi_acerto = []
resul_posi_b = []
resul_dificuldade = []

# ==========================================================
# 1. Correlação de posição e % de acertos
# ==========================================================

#Agrupando por ano e area, cria grupos como: 2020cn, 2020ch...
for (ano, area), grupo in tabela.groupby(["ano", "area"]):

    #Calculo da correlação de spearman e p-value
    r, p = spearmanr(
        grupo["posicao_prova"],
        grupo["percentual_acertos"]
    )

    resul_posi_acerto.append({
        "ano": ano,
        "area": area,
        "correlacao": r,
        "p_valor": p
    })

# ==========================================================
# 2. Correlação de posição e b
# ==========================================================

# Aqui usamos tabela_tri, pois os itens sem b não podem participar
for (ano, area), grupo in tabela_tri.groupby(["ano", "area"]):

    r, p = spearmanr(
        grupo["posicao_prova"],
        grupo["parametro_b_tri"]
    )

    resul_posi_b.append({
        "ano": ano,
        "area": area,
        "correlacao": r,
        "p_valor": p,
        "n_itens": len(grupo)
    })

# ==========================================================
# 3. Correlação de posição e % de acertos, considerando a dificuldade
# ==========================================================

#Separação de grupos, mais agora com a dificuldade tbm
for (ano, area, dificuldade), grupo in tabela_tri.groupby(
    ["ano", "area", "dificuldade_tri"]):

    r, p = spearmanr(
        grupo["posicao_prova"],
        grupo["percentual_acertos"]
    )

    resul_dificuldade.append({
        "ano": ano,
        "area": area,
        "dificuldade": dificuldade,
        "correlacao": r,
        "p_valor": p,
        "n_itens": len(grupo)
    })

resul_dificuldade = pd.DataFrame(resul_dificuldade)

resul_posi_acerto = pd.DataFrame(resul_posi_acerto)
resul_posi_b = pd.DataFrame(resul_posi_b)
r_posi_acerto, p_posi_acerto = spearmanr(tabela["posicao_prova"],tabela["percentual_acertos"])
r_posi_b, p_posi_b = spearmanr(tabela_tri["posicao_prova"],tabela_tri["parametro_b_tri"])

# ==========================================================
# 4. Em média, quanto o percentual de acertos de um mesmo item varia entre os diferentes cadernos?
# ==========================================================

#-- Codigo da variancia -- 
# Agrupa o mesmo item dentro de cada ano e área
variacoes = (
    tabela
    .groupby(["ano", "area", "co_item"])
    .agg(
        n_provas=("co_prova", "nunique"),
        menor_acerto=("percentual_acertos", "min"),
        maior_acerto=("percentual_acertos", "max")
    )
    .reset_index()
)

# Variação do percentual de acertos
variacoes["variacao"] = (
    variacoes["maior_acerto"] -
    variacoes["menor_acerto"]
)
#-- Média das variancias por ano e area --
media_variacao = (
    variacoes
    .groupby(["ano", "area"])
    .agg(
        n_itens=("co_item", "count"),
        media_variacao=("variacao", "mean")
    )
    .reset_index()
)

print("Correlação entre a posição da prova e a qtde de acertos")
print()
print(resul_posi_acerto)
print("Para toda a tabela: spearman ", r_posi_acerto, "p-value ", p_posi_acerto)
print()
print("Correlação entre a posição da prova e parametro b")
print()
print(resul_posi_b)
print("Para toda a tabela: spearman ", r_posi_b, "p-value ", p_posi_b)
print()
print("Correlação entre a posição da prova e qtde de acerto mas em grupos de dificuldade")
print()
print(resul_dificuldade)
print()
print("Variação média do percentual de acertos de uma mesma questão entre os quatro cadernos")
print()
print(media_variacao)

