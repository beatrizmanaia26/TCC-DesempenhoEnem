from pathlib import Path
import unicodedata

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.colors import TwoSlopeNorm
from scipy.stats import spearmanr


ARQUIVO_ENTRADA = Path("desempenho_questoes_por_prova.csv")
PASTA_GRAFICOS = Path("resultados_analise_ordem/graficos")
PASTA_RESULTADOS = PASTA_GRAFICOS.parent
MOSTRAR_GRAFICOS = False
AREAS = ["CH", "CN", "LC", "MT"]


def salvar_figura(figura, nome_arquivo):
    PASTA_GRAFICOS.mkdir(parents=True, exist_ok=True)
    figura.savefig(PASTA_GRAFICOS / nome_arquivo, dpi=300, bbox_inches="tight")
    if MOSTRAR_GRAFICOS:
        plt.show()
    plt.close(figura)


def ajustar_holm(valores):
    """Retorna p-valores ajustados por Holm, preservando posições e NaNs."""
    p = np.asarray(valores, dtype=float)
    ajustados = np.full(p.shape, np.nan, dtype=float)
    validos = np.flatnonzero(np.isfinite(p))
    if not len(validos):
        return ajustados
    ordem = validos[np.argsort(p[validos])]
    m = len(ordem)
    corrigidos = np.maximum.accumulate((m - np.arange(m)) * p[ordem])
    ajustados[ordem] = np.minimum(corrigidos, 1.0)
    return ajustados


def desenhar_mapa_calor(resultados, titulo, nome_arquivo, anos, areas=AREAS):
    """Desenha correlações com escala fixa, deixando combinações ausentes em branco."""
    dados = resultados.pivot(index="area", columns="ano", values="correlacao")
    dados = dados.reindex(index=areas, columns=anos)
    valores = dados.to_numpy(dtype=float)
    mascara = np.ma.masked_invalid(valores)

    figura, eixo = plt.subplots(figsize=(max(7, 1.15 * len(anos)), 4.2))
    cmap = plt.colormaps["RdBu_r"].copy()
    cmap.set_bad("#eeeeee")
    imagem = eixo.imshow(
        mascara, cmap=cmap, norm=TwoSlopeNorm(vmin=-1, vcenter=0, vmax=1),
        aspect="auto"
    )
    eixo.set_xticks(np.arange(len(anos)), labels=[str(a) for a in anos])
    eixo.set_yticks(np.arange(len(areas)), labels=areas)
    eixo.set_xlabel("Ano")
    eixo.set_ylabel("Área")
    eixo.set_title(titulo)
    eixo.set_xticks(np.arange(-0.5, len(anos), 1), minor=True)
    eixo.set_yticks(np.arange(-0.5, len(areas), 1), minor=True)
    eixo.grid(which="minor", color="white", linewidth=1.5)
    eixo.tick_params(which="minor", bottom=False, left=False)

    coluna_p = "p_holm" if "p_holm" in resultados else "p_valor"
    p_values = resultados.pivot(index="area", columns="ano", values=coluna_p)
    p_values = p_values.reindex(index=areas, columns=anos)
    for i, area in enumerate(areas):
        for j, ano in enumerate(anos):
            valor = valores[i, j]
            if np.isfinite(valor):
                p = p_values.iloc[i, j]
                significativo = pd.notna(p) and p < 0.05
                eixo.text(j, i, f"{valor:.2f}" + ("*" if significativo else ""),
                          ha="center", va="center", fontsize=10, color="black")
            else:
                eixo.text(j, i, "—", ha="center", va="center", fontsize=10,
                          color="#666666")
    barra = figura.colorbar(imagem, ax=eixo, pad=0.03)
    barra.set_label("Coeficiente de Spearman (ρ)")
    figura.text(0.5, 0.005, "* p < 0,05 após correção de Holm", ha="center", fontsize=8)
    figura.tight_layout(rect=(0, 0.03, 1, 1))
    salvar_figura(figura, nome_arquivo)


def gerar_mapa_dificuldade(resultados, dificuldade, anos):
    filtrados = resultados[resultados["dificuldade_normalizada"] == dificuldade]
    rotulos = {"facil": "fáceis", "media": "de dificuldade média", "dificil": "difíceis"}
    desenhar_mapa_calor(
        filtrados,
        f"Posição e percentual de acertos — itens {rotulos[dificuldade]}",
        f"correlacao_dificuldade_{dificuldade}.png",
        anos,
    )


def gerar_dispersoes(tabela, combinacoes):
    for ano, area in combinacoes:
        dados = tabela[(tabela["ano"] == ano) & (tabela["area"] == area)].copy()
        dados = dados.dropna(subset=["posicao_prova", "percentual_acertos"])
        if dados.empty:
            print(f"Sem observações para dispersão {ano} {area}; gráfico ignorado.")
            continue
        medias = (dados.groupby("posicao_prova", as_index=False)["percentual_acertos"]
                  .mean().sort_values("posicao_prova"))
        figura, eixo = plt.subplots(figsize=(8, 5))
        eixo.scatter(dados["posicao_prova"], dados["percentual_acertos"],
                     alpha=0.55, s=25, label="Itens nos cadernos")
        eixo.plot(medias["posicao_prova"], medias["percentual_acertos"],
                  color="#b23a48", marker="o", linewidth=2, label="Média por posição")
        eixo.set_title(f"Posição e percentual de acertos — {ano}, {area}")
        eixo.set_xlabel("Posição da questão")
        eixo.set_ylabel("Percentual de acertos (%)")
        eixo.grid(True, alpha=0.25)
        eixo.legend()
        figura.text(
            0.5, 0.005,
            "Análise descritiva: a média por posição também reflete as características dos itens presentes.",
            ha="center", fontsize=8, color="#555555"
        )
        figura.tight_layout(rect=(0, 0.04, 1, 1))
        salvar_figura(figura, f"dispersao_{ano}_{area}.png")


def gerar_grafico_variacoes(media_variacao):
    if media_variacao.empty:
        print("Sem itens presentes nos quatro cadernos; gráfico de variação ignorado.")
        return
    figura, eixo = plt.subplots(figsize=(8, 5))
    for area in AREAS:
        serie = media_variacao[media_variacao["area"] == area].sort_values("ano")
        if not serie.empty:
            eixo.plot(serie["ano"], serie["media_variacao"], marker="o",
                      linewidth=1.8, label=area)
    eixo.set_xlabel("Ano")
    eixo.set_ylabel("Variação média (pontos percentuais)")
    eixo.set_title("Variação média do percentual de acertos entre cadernos")
    eixo.grid(True, alpha=0.25)
    eixo.legend(title="Área")
    eixo.set_xticks(sorted(media_variacao["ano"].dropna().unique()))
    figura.tight_layout()
    salvar_figura(figura, "variacao_media_cadernos.png")


def normalizar_dificuldade(valor):
    if pd.isna(valor):
        return None
    texto = unicodedata.normalize("NFKD", str(valor).strip().casefold())
    return "".join(c for c in texto if not unicodedata.combining(c))


def main():
    tabela = pd.read_csv(ARQUIVO_ENTRADA, sep=",", encoding="utf-8-sig")
    # Apenas análises de b e estratificada usam itens com b válido.
    tabela_tri = tabela.dropna(subset=["parametro_b_tri"]).copy()
    resul_posi_acerto, resul_posi_b, resul_dificuldade = [], [], []

    for (ano, area), grupo in tabela.groupby(["ano", "area"]):
        grupo_valido = grupo.dropna(subset=["posicao_prova", "percentual_acertos"])
        r, p = spearmanr(grupo_valido["posicao_prova"], grupo_valido["percentual_acertos"])
        resul_posi_acerto.append({"ano": ano, "area": area, "correlacao": r, "p_valor": p})

    for (ano, area), grupo in tabela_tri.groupby(["ano", "area"]):
        r, p = spearmanr(grupo["posicao_prova"], grupo["parametro_b_tri"])
        resul_posi_b.append({"ano": ano, "area": area, "correlacao": r,
                             "p_valor": p, "n_itens": len(grupo)})

    tabela_tri["dificuldade_normalizada"] = tabela_tri["dificuldade_tri"].map(normalizar_dificuldade)
    for (ano, area, dificuldade), grupo in tabela_tri.groupby(
            ["ano", "area", "dificuldade_tri"]):
        r, p = spearmanr(grupo["posicao_prova"], grupo["percentual_acertos"])
        resul_dificuldade.append({
            "ano": ano, "area": area, "dificuldade": dificuldade,
            "dificuldade_normalizada": normalizar_dificuldade(dificuldade),
            "correlacao": r, "p_valor": p, "n_itens": len(grupo)
        })

    resul_dificuldade = pd.DataFrame(resul_dificuldade)
    resul_posi_acerto = pd.DataFrame(resul_posi_acerto)
    resul_posi_b = pd.DataFrame(resul_posi_b)
    # Cada família corresponde a uma pergunta: relação com acertos, com b,
    # ou relação com acertos dentro de uma mesma faixa de dificuldade.
    resul_posi_acerto["p_holm"] = ajustar_holm(resul_posi_acerto["p_valor"])
    resul_posi_b["p_holm"] = ajustar_holm(resul_posi_b["p_valor"])
    if not resul_dificuldade.empty:
        resul_dificuldade["p_holm"] = np.nan
        for _, indices in resul_dificuldade.groupby("dificuldade_normalizada").groups.items():
            resul_dificuldade.loc[indices, "p_holm"] = ajustar_holm(
                resul_dificuldade.loc[indices, "p_valor"]
            )
    PASTA_RESULTADOS.mkdir(parents=True, exist_ok=True)
    resul_posi_acerto.to_csv(PASTA_RESULTADOS / "correlacoes_posicao_acertos.csv", index=False, encoding="utf-8-sig")
    resul_posi_b.to_csv(PASTA_RESULTADOS / "correlacoes_posicao_parametro_b.csv", index=False, encoding="utf-8-sig")
    resul_dificuldade.to_csv(PASTA_RESULTADOS / "correlacoes_posicao_por_dificuldade.csv", index=False, encoding="utf-8-sig")
    r_posi_acerto, p_posi_acerto = spearmanr(tabela["posicao_prova"], tabela["percentual_acertos"])
    r_posi_b, p_posi_b = spearmanr(tabela_tri["posicao_prova"], tabela_tri["parametro_b_tri"])

    # Inclui somente itens presentes nos quatro cadernos da edição e área.
    variacoes = (
        tabela.groupby(["ano", "area", "co_item"])
        .agg(n_provas=("co_prova", "nunique"),
             menor_acerto=("percentual_acertos", "min"),
             maior_acerto=("percentual_acertos", "max"))
        .reset_index()
    )
    variacoes = variacoes[variacoes["n_provas"] == 4].copy()
    variacoes["variacao"] = variacoes["maior_acerto"] - variacoes["menor_acerto"]
    media_variacao = (variacoes.groupby(["ano", "area"])
                      .agg(n_itens=("co_item", "count"),
                           media_variacao=("variacao", "mean"))
                      .reset_index())

    print("Correlação entre a posição da prova e a qtde de acertos\n")
    print(resul_posi_acerto)
    print("Para toda a tabela: spearman ", r_posi_acerto, "p-value ", p_posi_acerto)
    print("\nCorrelação entre a posição da prova e parametro b\n")
    print(resul_posi_b)
    print("Para toda a tabela: spearman ", r_posi_b, "p-value ", p_posi_b)
    print("\nCorrelação entre posição e qtde de acerto por dificuldade\n")
    print(resul_dificuldade)
    print("\nVariação média do percentual entre os quatro cadernos\n")
    print(media_variacao)

    anos = sorted(tabela["ano"].dropna().unique())
    desenhar_mapa_calor(resul_posi_acerto, "Posição da prova e percentual de acertos",
                        "correlacao_posicao_acertos.png", anos)
    desenhar_mapa_calor(resul_posi_b, "Posição da prova e parâmetro b da TRI",
                        "correlacao_posicao_parametro_b.png", anos)
    anos_areas = sorted(tabela[["ano", "area"]].dropna().itertuples(index=False, name=None))
    gerar_dispersoes(tabela, anos_areas)
    for dificuldade in ("facil", "media", "dificil"):
        gerar_mapa_dificuldade(resul_dificuldade, dificuldade, anos)
    gerar_grafico_variacoes(media_variacao)


if __name__ == "__main__":
    main()
