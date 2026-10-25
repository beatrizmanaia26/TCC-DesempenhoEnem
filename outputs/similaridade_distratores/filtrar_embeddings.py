#/usr/bin/env python3

import argparse
import csv
import json
import re
from pathlib import Path


PALAVRA_RE = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿ]+")

def parece_formula(texto: str) -> bool:
    texto = texto.strip()

    # Equação/inequação começando por uma variável:
    # y = -3x + 20
    # x > 5
    # f = 2x
    if re.match(
        r"^[a-zA-Z]\s*[=<>≤≥]",
        texto
    ):
        return True

    # Função:
    # f(x) = ...
    # g(x) = ...
    if re.match(
        r"^[a-zA-Z]\s*\([^)]*\)\s*=",
        texto
    ):
        return True

    return False

def parece_linguagem_natural(texto: str) -> bool:
    if parece_formula(texto):
        return False
    palavras = PALAVRA_RE.findall(texto)

    letras = sum(
        len(palavra)
        for palavra in palavras
    )

    return letras >= 2


def classificar_questao(questao: dict) -> tuple[str, str]:
    alternativas = questao.get("alternativas", [])

    # A extração deveria produzir exatamente A-E.
    if len(alternativas) != 5:
        return "revisar", "alternativas_incompletas"

    textos = [
        alternativa.get("texto", "").strip()
        for alternativa in alternativas
    ]

    # Alternativa completamente vazia:
    # sabemos que pode ser imagem, fração etc.
    if any(not texto for texto in textos):
        return "excluir", "alternativa_sem_texto"

    formulas = sum(
    parece_formula(texto)
    for texto in textos
    )
    naturais = sum(
        parece_linguagem_natural(texto)
        for texto in textos
    )

    if formulas >= 4:
        return "excluir", "alternativas_formulas"
    # Todas ou quase todas são claramente textuais.
    if naturais == 0:
        return "excluir", "alternativas_nao_textuais"

    if naturais == 5:
        return "incluir", ""


    # 2 ou 3 alternativas textuais:
    # melhor olhar manualmente do que decidir errado.
    return "revisar", "conteudo_misto"


def identificar_metadados(caminho: Path, raiz: Path) -> dict:
    """
    Usa a estrutura de diretórios para identificar o arquivo.
    Não tenta interpretar ano/cor/dia automaticamente para não
    depender de uma convenção específica de nomes.
    """
    return {
        "arquivo": str(caminho.relative_to(raiz)),
    }


def processar_json(caminho: Path, raiz: Path) -> list[dict]:
    with caminho.open("r", encoding="utf-8") as arquivo:
        dados = json.load(arquivo)

    if not isinstance(dados, list):
        print(f"AVISO: ignorando {caminho}: JSON não contém uma lista.")
        return []

    metadados = identificar_metadados(caminho, raiz)
    resultados = []

    for questao in dados:
        classificacao, motivo = classificar_questao(questao)

        resultados.append({
            **metadados,
            "questao": questao.get("questao"),
            "idioma": questao.get("idioma", "geral"),
            "classificacao": classificacao,
            "motivo": motivo,
        })

    return resultados


def main():
    parser = argparse.ArgumentParser(
        description="Classifica questões para análise com embeddings."
    )

    parser.add_argument(
        "input",
        type=Path,
        nargs="?",
        default=Path(
            r"C:\Users\Nuno\Downloads\TCCDistratores\dados\enems_json_md_2022"
        ),
        help="Pasta contendo os JSONs extraídos do ENEM.",
    )

    parser.add_argument(
        "--output",
        type=Path,
        default=Path("filtro_embeddings_2022.csv"),
        help="CSV de saída.",
    )

    args = parser.parse_args()

    if not args.input.exists():
        raise SystemExit(
            f"Pasta não encontrada: {args.input}"
        )

    jsons = sorted(args.input.rglob("*.json"))

    if not jsons:
        raise SystemExit(
            f"Nenhum JSON encontrado em {args.input}"
        )

    resultados = []

    for caminho in jsons:
        print(f"Processando: {caminho}")
        resultados.extend(
            processar_json(caminho, args.input)
        )

    campos = [
        "arquivo",
        "questao",
        "idioma",
        "classificacao",
        "motivo",
    ]

    args.output.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with args.output.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as arquivo:
        writer = csv.DictWriter(
            arquivo,
            fieldnames=campos,
        )

        writer.writeheader()
        writer.writerows(resultados)

    incluir = sum(
        r["classificacao"] == "incluir"
        for r in resultados
    )

    excluir = sum(
        r["classificacao"] == "excluir"
        for r in resultados
    )

    revisar = sum(
        r["classificacao"] == "revisar"
        for r in resultados
    )

    print()
    print("=== RESULTADO ===")
    print(f"Questões analisadas: {len(resultados)}")
    print(f"Incluir:             {incluir}")
    print(f"Excluir:             {excluir}")
    print(f"Revisar manualmente: {revisar}")
    print()
    print(f"CSV salvo em: {args.output.resolve()}")


if __name__ == "__main__":
    main()