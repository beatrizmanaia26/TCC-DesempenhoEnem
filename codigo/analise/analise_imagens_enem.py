from pathlib import Path
import argparse
import json
import re

import numpy as np
import pandas as pd
from scipy import stats


ARQUIVO_DESEMPENHO = Path("desempenho_questoes.csv")
PASTA_JSON = Path("enems_json_md")
PASTA_SAIDA = Path("resultados_analise_imagens")
AREAS_POR_DIA = {1: {"LC", "CH"}, 2: {"CN", "MT"}}
ROTULOS_AREAS = {"CH": "Ciências Humanas (CH)", "CN": "Ciências da Natureza (CN)",
                 "LC": "Linguagens e Códigos (LC)", "MT": "Matemática (MT)"}
CORES_GRUPO = {"com_imagem": "#2878B5", "sem_imagem": "#F28E2B"}


def carregar_imagens():
    """Retorna (ano, área, posição, idioma) -> tem_imagem a partir dos JSONs."""
    imagens = {}
    for arquivo in sorted(PASTA_JSON.glob("enem*Dia*RegularAzul.json")):
        correspondencia = re.fullmatch(r"enem(\d{4})Dia([12])RegularAzul\.json", arquivo.name)
        if not correspondencia:
            continue
        ano, dia = int(correspondencia.group(1)), int(correspondencia.group(2))
        with arquivo.open(encoding="utf-8") as entrada:
            dados = json.load(entrada)
        for questao in dados.get("questoes", []):
            posicao = int(questao["questao"])
            tem_imagem = questao.get("tem_imagem")
            if not isinstance(tem_imagem, bool):
                raise ValueError(f"tem_imagem ausente/inválido: {arquivo}, questão {posicao}")
            areas = [area for area in AREAS_POR_DIA[dia] if posicao in intervalo_area(area)]
            if len(areas) != 1:
                raise ValueError(f"Não foi possível identificar área da questão {posicao} em {arquivo}")
            idioma = normalizar_idioma(questao.get("idioma"))
            chave = (ano, areas[0], posicao, idioma)
            if chave in imagens and imagens[chave] != tem_imagem:
                raise ValueError(f"Indicadores de imagem conflitantes para {chave}")
            imagens[chave] = tem_imagem
    return imagens


def normalizar_idioma(valor):
    if pd.isna(valor) or valor is None:
        return None
    valor = str(valor).strip().casefold()
    if valor in {"geral", "nan", ""}:
        return None
    if valor.startswith("ingl"):
        return "ingles"
    if valor.startswith("espan"):
        return "espanhol"
    return valor


def intervalo_area(area):
    return {"LC": range(1, 46), "CH": range(46, 91),
            "CN": range(91, 136), "MT": range(136, 181)}[area]


def estatisticas(valores):
    valores = pd.Series(valores).dropna().astype(float)
    if valores.empty:
        return {"n_questoes": 0, "media": np.nan, "mediana": np.nan,
                "desvio_padrao": np.nan, "minimo": np.nan, "q1": np.nan,
                "q3": np.nan, "maximo": np.nan, "iqr": np.nan}
    q1, q3 = valores.quantile([0.25, 0.75])
    return {"n_questoes": len(valores), "media": valores.mean(),
            "mediana": valores.median(), "desvio_padrao": valores.std(ddof=1),
            "minimo": valores.min(), "q1": q1, "q3": q3,
            "maximo": valores.max(), "iqr": q3 - q1}


def teste_seguro(funcao, *args, **kwargs):
    """Executa um teste quando há dados suficientes; em caso contrário, NaN."""
    try:
        resultado = funcao(*args, **kwargs)
        return float(resultado.statistic), float(resultado.pvalue)
    except (ValueError, FloatingPointError):
        return np.nan, np.nan


def ajustar_holm(valores):
    """Ajusta p-valores por Holm, ignorando ausentes e mantendo a ordem."""
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


def carregar_dados_graficos():
    """Carrega observações individuais e associa imagem usando os JSONs já existentes."""
    desempenho = pd.read_csv(ARQUIVO_DESEMPENHO, encoding="utf-8-sig")
    obrigatorias = {"ano", "area", "posicao_prova_azul", "percentual_acertos"}
    faltantes = obrigatorias - set(desempenho.columns)
    if faltantes:
        raise ValueError(f"Colunas ausentes em {ARQUIVO_DESEMPENHO}: {sorted(faltantes)}")
    for coluna in ("ano", "posicao_prova_azul", "percentual_acertos"):
        desempenho[coluna] = pd.to_numeric(desempenho[coluna], errors="coerce")
    if desempenho[["ano", "posicao_prova_azul"]].isna().any().any():
        raise ValueError("Há valores ausentes ou não numéricos no ano ou na posição da questão.")
    # Algumas questões não têm respostas válidas e, portanto, não têm taxa de
    # acerto. Elas não entram nos gráficos, assim como já são excluídas dos testes.
    desempenho = desempenho.dropna(subset=["percentual_acertos"]).copy()
    if not desempenho["percentual_acertos"].between(0, 100).all():
        minimo, maximo = desempenho.percentual_acertos.min(), desempenho.percentual_acertos.max()
        raise ValueError(f"percentual_acertos fora da escala 0–100: mínimo={minimo}, máximo={maximo}")
    desempenho["ano"] = desempenho.ano.astype(int)
    desempenho["posicao_prova_azul"] = desempenho.posicao_prova_azul.astype(int)
    idiomas = desempenho["lingua_estrangeira"] if "lingua_estrangeira" in desempenho else pd.Series(None, index=desempenho.index)
    imagens = carregar_imagens()
    desempenho["tem_imagem"] = [
        imagens.get((int(ano), area, int(pos), normalizar_idioma(idioma)))
        for ano, area, pos, idioma in zip(desempenho.ano, desempenho.area, desempenho.posicao_prova_azul, idiomas)
    ]
    if desempenho.tem_imagem.isna().any():
        exemplos = desempenho.loc[desempenho.tem_imagem.isna(), ["ano", "area", "posicao_prova_azul"]].head(10).to_dict("records")
        raise ValueError(f"Questões sem correspondência nos JSONs: {exemplos}")
    desempenho["grupo_imagem"] = desempenho.tem_imagem.map({True: "com_imagem", False: "sem_imagem"})
    return desempenho


def carregar_resumo_graficos():
    """Lê os CSVs estatísticos existentes e valida sua estrutura e escala."""
    caminho_stats = PASTA_SAIDA / "estatisticas_por_grupo.csv"
    caminho_comp = PASTA_SAIDA / "comparacoes_por_ano_area.csv"
    for caminho in (caminho_stats, caminho_comp):
        if not caminho.is_file():
            raise FileNotFoundError(f"Arquivo necessário não encontrado: {caminho}")
    resumo = pd.read_csv(caminho_stats, encoding="utf-8-sig")
    comparacoes = pd.read_csv(caminho_comp, encoding="utf-8-sig")
    req_stats = {"ano", "area", "grupo", "n_questoes", "media", "mediana", "q1", "q3"}
    req_comp = {"ano", "area", "diferenca_medias_com_menos_sem", "correlacao_ponto_bisserial_r",
                "ponto_bisserial_p_holm"}
    if req_stats - set(resumo.columns):
        raise ValueError(f"Colunas ausentes em {caminho_stats}: {sorted(req_stats - set(resumo.columns))}")
    if req_comp - set(comparacoes.columns):
        raise ValueError(f"Colunas ausentes em {caminho_comp}: {sorted(req_comp - set(comparacoes.columns))}")
    num_stats = ["n_questoes", "media", "mediana", "q1", "q3"]
    num_comp = ["diferenca_medias_com_menos_sem", "correlacao_ponto_bisserial_r",
                "ponto_bisserial_p_holm"]
    for df, cols, caminho in ((resumo, num_stats, caminho_stats), (comparacoes, num_comp, caminho_comp)):
        for coluna in cols:
            df[coluna] = pd.to_numeric(df[coluna], errors="coerce")
        if df[cols].isna().any().any():
            raise ValueError(f"Valores ausentes/não numéricos nas colunas necessárias de {caminho}")
    extremos = [resumo[c] for c in ("media", "mediana", "q1", "q3")]
    if not pd.concat(extremos).between(0, 100).all():
        raise ValueError("Estatísticas de acerto não estão na escala percentual 0–100.")
    if not comparacoes.correlacao_ponto_bisserial_r.between(-1, 1).all():
        raise ValueError("Correlação ponto-bisserial fora da escala válida -1 a 1.")
    return resumo, comparacoes


def gerar_graficos():
    """Gera figuras de apresentação sem recalcular os testes estatísticos."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.patches import Patch

    resumo, comparacoes = carregar_resumo_graficos()
    individuais = carregar_dados_graficos()
    pasta = PASTA_SAIDA / "graficos"
    pasta.mkdir(parents=True, exist_ok=True)
    areas = ["CH", "CN", "LC", "MT"]
    anos = sorted(resumo.ano.unique())
    legenda = [Patch(facecolor=CORES_GRUPO[g], label=l) for g, l in
               (("com_imagem", "Com imagem"), ("sem_imagem", "Sem imagem"))]
    plt.rcParams.update({"font.family": "DejaVu Sans", "axes.spines.top": False,
                         "axes.spines.right": False, "axes.titleweight": "bold"})

    # Médias: painéis por ano para comparação direta entre áreas.
    fig, eixos = plt.subplots(1, len(anos), figsize=(4.2 * len(anos), 5), sharey=True, squeeze=False)
    largura = 0.36
    for ax, ano in zip(eixos[0], anos):
        dados = resumo[resumo.ano == ano]
        x = np.arange(len(areas))
        for deslocamento, grupo in ((-largura/2, "com_imagem"), (largura/2, "sem_imagem")):
            vals = dados.set_index(["area", "grupo"]).media
            ys = [vals.get((a, grupo), np.nan) for a in areas]
            barras = ax.bar(x + deslocamento, ys, largura, color=CORES_GRUPO[grupo])
            for barra, valor in zip(barras, ys):
                if pd.notna(valor):
                    ax.annotate(f"{valor:.1f}%", (barra.get_x()+barra.get_width()/2, barra.get_height()),
                                xytext=(0, 3), textcoords="offset points", ha="center", fontsize=7)
        ax.set_title(str(ano)); ax.set_xticks(x, areas); ax.set_ylim(0, 100)
        ax.set_xlabel("Área do conhecimento")
        ax.grid(axis="y", alpha=.22)
    eixos[0, 0].set_ylabel("Média de acertos (%)")
    fig.suptitle("Média de acertos por presença de imagem e área", y=1.02)
    fig.legend(handles=legenda, loc="upper center", bbox_to_anchor=(.5, .96), ncol=2, frameon=False)
    fig.tight_layout(rect=[0, .04, 1, .88])
    fig.text(.5, .01, "CH: Ciências Humanas · CN: Ciências da Natureza · LC: Linguagens e Códigos · MT: Matemática", ha="center", fontsize=8)
    fig.savefig(pasta / "medias_por_ano_area.png", dpi=300, bbox_inches="tight"); plt.close(fig)

    # Diferenças em pontos percentuais.
    comp = comparacoes.copy()
    comp["rotulo"] = comp.ano.astype(str) + " · " + comp.area.map(ROTULOS_AREAS)
    comp = comp.sort_values(["ano", "area"], ascending=[True, True])
    fig, ax = plt.subplots(figsize=(10, max(5, .34 * len(comp))))
    ypos = np.arange(len(comp)); vals = comp.diferenca_medias_com_menos_sem
    ax.barh(ypos, vals, color=[CORES_GRUPO["com_imagem"] if v >= 0 else CORES_GRUPO["sem_imagem"] for v in vals])
    ax.axvline(0, color="#333333", linewidth=1)
    ax.set_yticks(ypos, comp.rotulo); ax.invert_yaxis()
    ax.set_xlabel("Diferença entre médias (pontos percentuais; com imagem − sem imagem)")
    ax.set_title("Diferença média de acertos por ano e área\nPositivo: maior média com imagem · Negativo: maior média sem imagem")
    ax.grid(axis="x", alpha=.22)
    fig.tight_layout(); fig.savefig(pasta / "diferencas_medias_pontos_percentuais.png", dpi=300, bbox_inches="tight"); plt.close(fig)

    # Boxplots baseados nos percentuais individuais das questões.
    anos_ind = sorted(individuais.ano.unique())
    fig, eixos = plt.subplots(len(anos_ind), 1, figsize=(11, max(3.5 * len(anos_ind), 8)), sharex=True, squeeze=False)
    for ax, ano in zip(eixos[:, 0], anos_ind):
        dados = individuais[individuais.ano == ano]
        posicoes, caixas, cores = [], [], []
        for i, area in enumerate(areas):
            for desloc, grupo in ((-.18, "com_imagem"), (.18, "sem_imagem")):
                valores = dados.loc[(dados.area == area) & (dados.grupo_imagem == grupo), "percentual_acertos"].values
                if len(valores):
                    posicoes.append(i + desloc); caixas.append(valores); cores.append(CORES_GRUPO[grupo])
        artistas = ax.boxplot(caixas, positions=posicoes, widths=.28, patch_artist=True, showfliers=True,
                              medianprops={"color": "#222222", "linewidth": 1.4},
                              flierprops={"marker": ".", "markersize": 3, "alpha": .5})
        for caixa, cor in zip(artistas["boxes"], cores):
            caixa.set_facecolor(cor); caixa.set_alpha(.72)
        ax.set_title(str(ano), loc="left"); ax.set_ylabel("Acertos (%)"); ax.set_ylim(0, 100)
        ax.grid(axis="y", alpha=.2)
    eixos[-1, 0].set_xticks(range(len(areas)), areas); eixos[-1, 0].set_xlabel("Área do conhecimento")
    fig.suptitle("Distribuição dos percentuais de acerto por questão", y=.995)
    fig.legend(handles=legenda, loc="upper center", bbox_to_anchor=(.5, .98), ncol=2, frameon=False)
    fig.tight_layout(rect=[0, .025, 1, .97])
    fig.text(.5, .005, "CH: Ciências Humanas · CN: Ciências da Natureza · LC: Linguagens e Códigos · MT: Matemática", ha="center", fontsize=8)
    fig.savefig(pasta / "distribuicoes_boxplots.png", dpi=300, bbox_inches="tight"); plt.close(fig)

    # Associação ponto-bisserial, sem intervalos de confiança não disponíveis nos CSVs.
    comp = comparacoes.sort_values(["ano", "area"]).copy()
    comp["rotulo"] = comp.ano.astype(str) + " · " + comp.area
    fig, ax = plt.subplots(figsize=(10, max(5, .34 * len(comp))))
    ypos = np.arange(len(comp))
    ax.scatter(comp.correlacao_ponto_bisserial_r, ypos, s=42, color="#4C78A8", zorder=3)
    for x, y, p_holm in zip(comp.correlacao_ponto_bisserial_r, ypos,
                            comp.ponto_bisserial_p_holm):
        if pd.notna(p_holm) and p_holm < 0.05:
            ax.annotate("*", (x, y), xytext=(5, 0), textcoords="offset points",
                        va="center", fontsize=11)
    ax.axvline(0, color="#333333", linewidth=1); ax.set_xlim(-1, 1)
    ax.set_yticks(ypos, comp.rotulo); ax.invert_yaxis()
    ax.set_xlabel("Correlação ponto-bisserial (r; −1 a 1)")
    ax.set_title("Associação entre presença de imagem e percentual de acertos\nPositivo: associação com maior acerto · Negativo: associação com menor acerto")
    ax.grid(axis="x", alpha=.22)
    fig.text(.5, .01, "* p < 0,05 após correção de Holm", ha="center", fontsize=8)
    fig.tight_layout(rect=[0, .03, 1, 1]); fig.savefig(pasta / "correlacao_ponto_bisserial.png", dpi=300, bbox_inches="tight"); plt.close(fig)
    print(f"Gráficos salvos em {pasta}/")


def main():
    desempenho = pd.read_csv(ARQUIVO_DESEMPENHO, encoding="utf-8-sig")
    colunas = {"ano", "area", "posicao_prova_azul", "percentual_acertos"}
    faltantes = colunas - set(desempenho.columns)
    if faltantes:
        raise ValueError(f"Colunas ausentes em {ARQUIVO_DESEMPENHO}: {sorted(faltantes)}")

    desempenho["ano"] = desempenho["ano"].astype(int)
    desempenho["posicao_prova_azul"] = desempenho["posicao_prova_azul"].astype(int)
    desempenho["percentual_acertos"] = pd.to_numeric(desempenho["percentual_acertos"], errors="coerce")
    imagens = carregar_imagens()
    idiomas = desempenho["lingua_estrangeira"] if "lingua_estrangeira" in desempenho else pd.Series(None, index=desempenho.index)
    desempenho["tem_imagem"] = [
        imagens.get((int(ano), area, int(pos), normalizar_idioma(idioma)))
        for ano, area, pos, idioma in zip(desempenho.ano, desempenho.area, desempenho.posicao_prova_azul, idiomas)
    ]

    sem_json = desempenho[desempenho.tem_imagem.isna()]
    if not sem_json.empty:
        exemplos = sem_json[["ano", "area", "posicao_prova_azul"]].head(10).to_dict("records")
        raise ValueError(f"Questões da tabela sem correspondência nos JSONs: {exemplos}")
    desempenho["grupo_imagem"] = desempenho["tem_imagem"].map({True: "com_imagem", False: "sem_imagem"})

    linhas_estatisticas = []
    linhas_comparacao = []
    for (ano, area), grupo in desempenho.groupby(["ano", "area"], sort=True):
        valores_por_grupo = {}
        for rotulo in ("com_imagem", "sem_imagem"):
            valores = grupo.loc[grupo.grupo_imagem == rotulo, "percentual_acertos"].dropna()
            valores_por_grupo[rotulo] = valores
            linhas_estatisticas.append({"ano": ano, "area": area, "grupo": rotulo, **estatisticas(valores)})

        ambos = grupo.dropna(subset=["percentual_acertos"])
        rpb, p_rpb = teste_seguro(stats.pointbiserialr, ambos.tem_imagem.astype(int), ambos.percentual_acertos)
        com = valores_por_grupo["com_imagem"]
        sem = valores_por_grupo["sem_imagem"]
        media_com = com.mean() if len(com) else np.nan
        media_sem = sem.mean() if len(sem) else np.nan
        mediana_com = com.median() if len(com) else np.nan
        mediana_sem = sem.median() if len(sem) else np.nan
        linhas_comparacao.append({
            "ano": ano, "area": area,
            "n_com_imagem": len(com), "n_sem_imagem": len(sem),
            "diferenca_medias_com_menos_sem": media_com - media_sem,
            "diferenca_medianas_com_menos_sem": mediana_com - mediana_sem,
            "razao_medias_com_div_sem": media_com / media_sem if pd.notna(media_sem) and media_sem != 0 else np.nan,
            "correlacao_ponto_bisserial_r": rpb, "ponto_bisserial_p_value": p_rpb,
        })

    # Uma família: teste ponto-bisserial em cada combinação ano × área.
    comparacoes = pd.DataFrame(linhas_comparacao)
    comparacoes["ponto_bisserial_p_holm"] = ajustar_holm(
        comparacoes["ponto_bisserial_p_value"]
    )

    PASTA_SAIDA.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(linhas_estatisticas).to_csv(PASTA_SAIDA / "estatisticas_por_grupo.csv", index=False, encoding="utf-8-sig", float_format="%.6f")
    comparacoes.to_csv(PASTA_SAIDA / "comparacoes_por_ano_area.csv", index=False, encoding="utf-8-sig", float_format="%.6f")
    print(f"Arquivos gerados em {PASTA_SAIDA}/")
    print(f"Questões analisadas: {len(desempenho)}; anos: {desempenho.ano.nunique()}; áreas: {desempenho.area.nunique()}")
    print(comparacoes.to_string(index=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Análise de imagens nas questões do ENEM")
    parser.add_argument("--graficos", action="store_true", help="gera gráficos a partir dos CSVs existentes e dados individuais, sem refazer a análise")
    args = parser.parse_args()
    if args.graficos:
        gerar_graficos()
    else:
        main()
