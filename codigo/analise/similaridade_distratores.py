import json
import re
from pathlib import Path
from itertools import combinations

import pandas as pd
from sentence_transformers import SentenceTransformer


# ============================================================
# CONFIGURAÇÃO
# ============================================================

RAIZ = Path(
    r"TCC-DesempenhoEnem"
)

PASTA_DADOS = RAIZ / "dados"
PASTA_RESULTADOS = RAIZ / "outputs" / "similaridade_distratores"

MODELO = "iara-project/e5-large-matryoshka-sts-pt"

LETRAS = ["A", "B", "C", "D", "E"]
PARES = list(combinations(LETRAS, 2))


# ============================================================
# FUNÇÕES AUXILIARES
# ============================================================

def normalizar_caminho(caminho: str) -> str:
    """
    Normaliza caminhos vindos do CSV.

    Exemplo:
    Amarelo\\Amarelo.json
    ->
    Amarelo/Amarelo.json
    """
    return str(caminho).strip().replace("\\", "/")


def normalizar_idioma(idioma) -> str:
    """
    Evita diferenças acidentais de maiúsculas/minúsculas
    ou espaços ao comparar filtro e JSON.
    """
    return str(idioma).strip().lower()


def carregar_json(caminho: Path) -> list[dict]:
    with caminho.open("r", encoding="utf-8") as arquivo:
        dados = json.load(arquivo)

    if not isinstance(dados, list):
        raise ValueError(
            f"O JSON {caminho} não contém uma lista de questões."
        )

    return dados


def criar_indice_questoes(dados: list[dict]) -> dict:
    """
    Cria índice:
        (questao, idioma) -> questão

    Isso evita procurar a questão percorrendo o JSON
    inteiro para cada linha do filtro.
    """
    indice = {}

    for questao in dados:
        numero = int(questao["questao"])
        idioma = normalizar_idioma(
            questao.get("idioma", "geral")
        )

        chave = (numero, idioma)

        if chave in indice:
            raise ValueError(
                f"Questão duplicada no JSON: "
                f"Q{numero} ({idioma})"
            )

        indice[chave] = questao

    return indice


def extrair_textos_alternativas(
    questao: dict,
    origem: str
) -> list[str]:

    alternativas = questao.get("alternativas", [])

    if len(alternativas) != 5:
        raise ValueError(
            f"{origem}: Q{questao['questao']} "
            f"possui {len(alternativas)} alternativas."
        )

    alternativas_por_letra = {
        str(alt["letra"]).strip().upper():
        str(alt["texto"]).strip()
        for alt in alternativas
    }

    if set(alternativas_por_letra.keys()) != set(LETRAS):
        raise ValueError(
            f"{origem}: Q{questao['questao']} "
            f"não possui exatamente A, B, C, D e E."
        )

    textos = [
        alternativas_por_letra[letra]
        for letra in LETRAS
    ]

    if any(not texto for texto in textos):
        raise ValueError(
            f"{origem}: Q{questao['questao']} "
            f"possui alternativa vazia, apesar de estar "
            f"marcada como 'incluir'."
        )

    return textos


# ============================================================
# PROCESSAMENTO DE UM ANO
# ============================================================

def processar_ano(
    ano: int,
    arquivo_filtro: Path,
    modelo: SentenceTransformer
):

    print()
    print("=" * 70)
    print(f"PROCESSANDO {ano}")
    print("=" * 70)

    pasta_json = (
        PASTA_DADOS /
        f"enems_json_md_{ano}"
    )

    if not pasta_json.exists():
        print(
            f"[ERRO] Pasta dos JSONs não encontrada:"
            f"\n{pasta_json}"
        )
        return

    # --------------------------------------------------------
    # 1. Carregar filtro
    # --------------------------------------------------------

    filtro = pd.read_csv(
        arquivo_filtro,
        encoding="utf-8-sig"
    )

    colunas_necessarias = {
        "arquivo",
        "questao",
        "idioma",
        "classificacao"
    }

    faltando = (
        colunas_necessarias -
        set(filtro.columns)
    )

    if faltando:
        print(
            f"[ERRO] Faltam colunas no filtro de {ano}: "
            f"{faltando}"
        )
        return

    filtro["arquivo"] = (
        filtro["arquivo"]
        .astype(str)
        .apply(normalizar_caminho)
    )

    filtro["idioma"] = (
        filtro["idioma"]
        .apply(normalizar_idioma)
    )

    filtro["classificacao"] = (
        filtro["classificacao"]
        .astype(str)
        .str.strip()
        .str.lower()
    )

    total = len(filtro)

    total_incluir = (
        filtro["classificacao"] == "incluir"
    ).sum()

    total_excluir = (
        filtro["classificacao"] == "excluir"
    ).sum()

    total_revisar = (
        filtro["classificacao"] == "revisar"
    ).sum()

    print(f"Filtro: {arquivo_filtro.name}")
    print(f"Total:   {total}")
    print(f"Incluir: {total_incluir}")
    print(f"Excluir: {total_excluir}")
    print(f"Revisar: {total_revisar}")
    print()

    # Só precisamos dessas daqui para frente.
    filtro_incluir = filtro[
        filtro["classificacao"] == "incluir"
    ].copy()

    # --------------------------------------------------------
    # 2. Carregar JSONs necessários
    # --------------------------------------------------------

    cache_json = {}

    arquivos_necessarios = (
        filtro_incluir["arquivo"]
        .unique()
    )

    for arquivo_relativo in arquivos_necessarios:

        caminho_json = (
            pasta_json /
            Path(arquivo_relativo)
        )

        if not caminho_json.exists():
            print(
                f"[ERRO] JSON não encontrado:"
                f"\n{caminho_json}"
            )
            continue

        dados = carregar_json(caminho_json)

        cache_json[arquivo_relativo] = (
            criar_indice_questoes(dados)
        )

        print(
            f"Carregado: {arquivo_relativo} "
            f"({len(dados)} questões)"
        )

    print()

    # --------------------------------------------------------
    # 3. Preparar questões
    # --------------------------------------------------------

    questoes_processar = []
    problemas = []

    for _, linha in filtro_incluir.iterrows():

        arquivo_relativo = linha["arquivo"]
        numero = int(linha["questao"])
        idioma = linha["idioma"]

        if arquivo_relativo not in cache_json:

            problemas.append({
                "arquivo": arquivo_relativo,
                "questao": numero,
                "idioma": idioma,
                "problema": "JSON não encontrado"
            })

            continue

        indice = cache_json[arquivo_relativo]

        chave = (numero, idioma)

        if chave not in indice:

            problemas.append({
                "arquivo": arquivo_relativo,
                "questao": numero,
                "idioma": idioma,
                "problema":
                    "Questão/idioma não encontrado no JSON"
            })

            continue

        questao = indice[chave]

        try:
            textos = extrair_textos_alternativas(
                questao,
                arquivo_relativo
            )

        except ValueError as erro:

            problemas.append({
                "arquivo": arquivo_relativo,
                "questao": numero,
                "idioma": idioma,
                "problema": str(erro)
            })

            continue

        questoes_processar.append({
            "arquivo": arquivo_relativo,
            "questao": numero,
            "idioma": idioma,
            "textos": textos
        })

    print(
        f"Questões prontas para embeddings: "
        f"{len(questoes_processar)}"
    )

    # --------------------------------------------------------
    # 4. Verificação antes dos embeddings
    # --------------------------------------------------------

    if problemas:

        print()
        print(
            f"[ATENÇÃO] Foram encontrados "
            f"{len(problemas)} problemas."
        )

        pasta_saida = (
            PASTA_RESULTADOS /
            str(ano)
        )

        pasta_saida.mkdir(
            parents=True,
            exist_ok=True
        )

        arquivo_problemas = (
            pasta_saida /
            f"problemas_embeddings_{ano}.csv"
        )

        pd.DataFrame(problemas).to_csv(
            arquivo_problemas,
            index=False,
            sep=";",
            encoding="utf-8-sig"
        )

        print(
            f"Problemas salvos em:"
            f"\n{arquivo_problemas}"
        )

        print()
        print(
            "[ERRO] Os embeddings deste ano NÃO serão "
            "gerados até esses problemas serem resolvidos."
        )

        return

    if len(questoes_processar) != total_incluir:

        print(
            "[ERRO] O número de questões preparadas "
            "não corresponde ao número marcado como incluir."
        )

        return

    print(
        "Filtro e JSONs conferem. "
        "Iniciando embeddings..."
    )
    print()

    # --------------------------------------------------------
    # 5. Embeddings + similaridades
    # --------------------------------------------------------

    resultados = []

    for indice_questao, item in enumerate(
        questoes_processar,
        start=1
    ):

        textos = item["textos"]

        embeddings = modelo.encode(
            textos,
            show_progress_bar=False
        )

        sim_matrix = modelo.similarity(
            embeddings,
            embeddings
        )

        resultado = {
            "arquivo": item["arquivo"],
            "questao": item["questao"],
            "idioma": item["idioma"]
        }

        for letra_i, letra_j in PARES:

            i = LETRAS.index(letra_i)
            j = LETRAS.index(letra_j)

            resultado[
                f"sim_{letra_i}{letra_j}"
            ] = float(
                sim_matrix[i][j]
            )

        resultados.append(resultado)

        if (
            indice_questao % 50 == 0
            or indice_questao == len(questoes_processar)
        ):
            print(
                f"{indice_questao}/"
                f"{len(questoes_processar)} "
                f"questões processadas"
            )

    # --------------------------------------------------------
    # 6. Métricas derivadas
    # --------------------------------------------------------

    resultado = pd.DataFrame(resultados)

    sim_cols = [
        f"sim_{i}{j}"
        for i, j in PARES
    ]

    resultado["sim_media"] = (
        resultado[sim_cols]
        .mean(axis=1)
    )

    resultado["sim_maxima"] = (
        resultado[sim_cols]
        .max(axis=1)
    )

    resultado["par_mais_similar"] = (
        resultado[sim_cols]
        .idxmax(axis=1)
        .str.replace(
            "sim_",
            "",
            regex=False
        )
    )

    # --------------------------------------------------------
    # 7. Salvar
    # --------------------------------------------------------

    pasta_saida = (
        PASTA_RESULTADOS /
        str(ano)
    )

    pasta_saida.mkdir(
        parents=True,
        exist_ok=True
    )

    arquivo_saida = (
        pasta_saida /
        f"similaridade_alternativas_{ano}.csv"
    )

    resultado.to_csv(
        arquivo_saida,
        index=False,
        sep=";",
        encoding="utf-8-sig"
    )

    print()
    print(f"{ano} FINALIZADO")
    print(
        f"{len(resultado)} questões processadas."
    )
    print(f"Salvo em:\n{arquivo_saida}")


# ============================================================
# PROGRAMA PRINCIPAL
# ============================================================

def main():

    print("=" * 70)
    print("SIMILARIDADE ENTRE ALTERNATIVAS — ENEM")
    print("=" * 70)
    print()

    # --------------------------------------------------------
    # Descobrir filtros automaticamente
    # --------------------------------------------------------

    arquivos_filtro = sorted(
        RAIZ.glob("filtro_embeddings_*.csv")
    )

    if not arquivos_filtro:
        raise FileNotFoundError(
            "Nenhum arquivo "
            "'filtro_embeddings_*.csv' "
            f"encontrado em:\n{RAIZ}"
        )

    filtros_por_ano = []

    for arquivo in arquivos_filtro:

        match = re.search(
            r"filtro_embeddings_(\d{4})\.csv$",
            arquivo.name,
            re.IGNORECASE
        )

        if not match:
            print(
                f"[AVISO] Não consegui descobrir "
                f"o ano de {arquivo.name}."
            )
            continue

        ano = int(match.group(1))

        filtros_por_ano.append(
            (ano, arquivo)
        )

    if not filtros_por_ano:
        raise ValueError(
            "Nenhum filtro com ano válido foi encontrado."
        )

    print("Anos encontrados:")

    for ano, arquivo in filtros_por_ano:
        print(
            f"  {ano}: {arquivo.name}"
        )

    print()

    # --------------------------------------------------------
    # Carregar modelo UMA VEZ
    # --------------------------------------------------------

    print("Carregando modelo...")
    acesso = "token_hugging_face"
    modelo = SentenceTransformer(MODELO, token=acesso)

    print("Modelo carregado.")
    print()

    # --------------------------------------------------------
    # Processar todos os anos
    # --------------------------------------------------------

    for ano, arquivo_filtro in filtros_por_ano:

        processar_ano(
            ano,
            arquivo_filtro,
            modelo
        )

    print()
    print("=" * 70)
    print("PROCESSAMENTO CONCLUÍDO")
    print("=" * 70)


if __name__ == "__main__":
    main()