from pathlib import Path
import json
import re

import numpy as np
import pandas as pd
from scipy import stats


ARQUIVO_DESEMPENHO = Path("desempenho_questoes.csv")
PASTA_JSON = Path("enems_json_md")
PASTA_SAIDA = Path("resultados_analise_imagens")
AREAS_POR_DIA = {1: {"LC", "CH"}, 2: {"CN", "MT"}}


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

        com = valores_por_grupo["com_imagem"]
        sem = valores_por_grupo["sem_imagem"]
        u, p_mw = teste_seguro(stats.mannwhitneyu, com, sem, alternative="two-sided", method="auto")
        t, p_welch = teste_seguro(stats.ttest_ind, com, sem, equal_var=False, nan_policy="omit")
        ambos = grupo.dropna(subset=["percentual_acertos"])
        rpb, p_rpb = teste_seguro(stats.pointbiserialr, ambos.tem_imagem.astype(int), ambos.percentual_acertos)
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
            "mann_whitney_u": u, "mann_whitney_p_value": p_mw,
            "welch_t": t, "welch_p_value": p_welch,
            "correlacao_ponto_bisserial_r": rpb, "ponto_bisserial_p_value": p_rpb,
        })

    PASTA_SAIDA.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(linhas_estatisticas).to_csv(PASTA_SAIDA / "estatisticas_por_grupo.csv", index=False, encoding="utf-8-sig", float_format="%.6f")
    pd.DataFrame(linhas_comparacao).to_csv(PASTA_SAIDA / "comparacoes_por_ano_area.csv", index=False, encoding="utf-8-sig", float_format="%.6f")
    print(f"Arquivos gerados em {PASTA_SAIDA}/")
    print(f"Questões analisadas: {len(desempenho)}; anos: {desempenho.ano.nunique()}; áreas: {desempenho.area.nunique()}")
    print(pd.DataFrame(linhas_comparacao).to_string(index=False))


if __name__ == "__main__":
    main()
