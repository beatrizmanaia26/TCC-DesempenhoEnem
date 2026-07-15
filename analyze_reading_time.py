#!/usr/bin/env python3
"""
Análise da relação entre tempo médio de leitura das questões e tempo de resolução da prova.

Referências:
    - Velocidade de leitura: ~1100 caracteres/minuto (Messias et al., 2008)
    - Tmpo de prova Dia 1: 5h30min (inclui redação)
    - Tempo de prova Dia 2: 5h00min
    - Tempo estimado para redação: 1h15min (Brasil Escola)

    precisa ser adaptado para o MVP
"""

import argparse
import json
from pathlib import Path

VELOCIDADE_LEITURA_CPM = 1100  # caracteres/min (Messias et al., 2008)

TEMPO_TOTAL_PROVA = {
    1: 330,  # Dia 1: 5h30min
    2: 300,  # Dia 2: 5h00min
}

TEMPO_REDACAO = 75  # 1h15min (só no Dia 1)


#Conta caracteres efetivos (exclui espaços, tabs e quebras de linha).
def contar_caracteres(texto):
    if not texto:
        return 0
    return sum(1 for ch in texto if ch not in (" ", "\t", "\n", "\r"))

def tempo_leitura_minutos(caracteres):
    return caracteres / VELOCIDADE_LEITURA_CPM

#Detecta se é Dia 1 ou Dia 2 pelo nome do arquivo. Exclusivo para enem
def detectar_dia(nome):
    if "Dia1" in nome or "dia1" in nome:
        return 1
    if "Dia2" in nome or "dia2" in nome:
        return 2
    raise ValueError(f"Não consegui identificar o dia em: {nome}")

#Tempo disponível para questões (descontando redação no Dia 1).
def tempo_disponivel(dia):
    desconto = TEMPO_REDACAO if dia == 1 else 0
    return TEMPO_TOTAL_PROVA[dia] - desconto

#Formata minutos em texto legível
def fmt_tempo(minutos):
    h = int(minutos // 60)
    m = int(minutos % 60)
    s = int((minutos * 60) % 60)
    partes = []
    if h:
        partes.append(f"{h}h")
    if m:
        partes.append(f"{m}min")
    if s or not partes:
        partes.append(f"{s}s")
    return " ".join(partes)


def analisar_questao(dados_questao):
    texto = dados_questao.get("texto_contado", "")
    chars = contar_caracteres(texto)
    leitura_min = tempo_leitura_minutos(chars)

    return {
        "questao": dados_questao["questao"],
        "idioma": dados_questao.get("idioma", "geral"),
        "caracteres": chars,
        "palavras": dados_questao.get("quantidade_palavras", 0),
        "tem_imagem": dados_questao.get("tem_imagem", False),
        "tempo_leitura_min": leitura_min,
        "tempo_leitura_seg": leitura_min * 60,
    }


def analisar_prova(caminho):
    nome = caminho.stem
    dia = detectar_dia(nome)
    disponivel_min = tempo_disponivel(dia)

    with open(caminho, encoding="utf-8") as f:
        dados = json.load(f)

    total_questoes = len(dados)

    questoes = [analisar_questao(q) for q in dados]

    total_chars = sum(q["caracteres"] for q in questoes)
    leitura_total_min = sum(q["tempo_leitura_min"] for q in questoes)
    resolucao_total_min = disponivel_min - leitura_total_min

    leitura_media = leitura_total_min / total_questoes if total_questoes else 0
    resolucao_media = resolucao_total_min / total_questoes if total_questoes else 0
    tempo_medio_total = disponivel_min / total_questoes if total_questoes else 0
    pct_leitura = (leitura_total_min / disponivel_min) * 100 if disponivel_min else 0
    pct_resolucao = 100.0 - pct_leitura

    return {
        "nome": nome,
        "dia": dia,
        "questoes": questoes,
        "total_questoes": total_questoes,
        "total_caracteres": total_chars,
        "disponivel_min": disponivel_min,
        "leitura_total_min": leitura_total_min,
        "resolucao_total_min": resolucao_total_min,
        "leitura_media_min": leitura_media,
        "resolucao_media_min": resolucao_media,
        "tempo_medio_total_min": tempo_medio_total,
        "pct_leitura": pct_leitura,
        "pct_resolucao": pct_resolucao,
    }


# SAÍDA NO TERMINAL 

def imprimir_resumo(prova):
    print(f"  ANÁLISE DE TEMPO DE LEITURA — {prova['nome']}")
    print()
    print("  PARÂMETROS:")
    print(f"    • Velocidade de leitura: {VELOCIDADE_LEITURA_CPM} caracteres/min")
    print(f"    • Tempo total da prova (Dia {prova['dia']}): {fmt_tempo(TEMPO_TOTAL_PROVA[prova['dia']])}")
    if prova["dia"] == 1:
        print(f"    • Tempo estimado para redação: {fmt_tempo(TEMPO_REDACAO)}")
    print(f"    • Tempo disponível para questões: {fmt_tempo(prova['disponivel_min'])}")
    print()
    print("  RESULTADOS:")
    print(f"    • Questões analisadas: {prova['total_questoes']}")
    print(f"    • Total de caracteres: {prova['total_caracteres']:,}")
    print()
    print(f"    • Tempo de leitura total: {fmt_tempo(prova['leitura_total_min'])} ({prova['pct_leitura']:.1f}%)")
    print(f"    • Tempo de resolução total: {fmt_tempo(prova['resolucao_total_min'])} ({prova['pct_resolucao']:.1f}%)")
    print()
    print(f"    • Leitura média/questão: {prova['leitura_media_min']:.2f} min ({prova['leitura_media_min'] * 60:.1f}s)")
    print(f"    • Resolução média/questão: {prova['resolucao_media_min']:.2f} min ({prova['resolucao_media_min'] * 60:.1f}s)")
    print(f"    • tempo total médio/questão: {prova['tempo_medio_total_min']:.2f} min ({prova['tempo_medio_total_min'] * 60:.1f}s)")
    print()

    # Tabela por questão
    print("  CARACTERES POR QUESTÃO:")
    print(f"    {'Questão':<10} {'Idioma':<10} {'Chars':<8} {'Palavras':<10} {'Imagem':<8} {'Leitura (s)':<12}")
    print(f"    {'-'*10} {'-'*10} {'-'*8} {'-'*10} {'-'*8} {'-'*12}")
    for q in prova["questoes"]:
        img = "sim" if q["tem_imagem"] else "não"
        print(
            f"    {q['questao']:<10} {q['idioma']:<10} {q['caracteres']:<8} "
            f"{q['palavras']:<10} {img:<8} {q['tempo_leitura_seg']:<.1f}"
        )
    print()

def imprimir_comparativo(provas):
    """Imprime tabela comparativa entre provas."""
    print("  RESUMO COMPARATIVO")
    print()
    print(f"  {'Prova':<35} {'Dia':<4} {'Chars':<9} {'Leitura':<11} {'Resolução':<11} {'%Leit':<6}")
    print(f"  {'-'*35} {'-'*4} {'-'*9} {'-'*11} {'-'*11} {'-'*6}")
    for p in provas:
        print(
            f"  {p['nome']:<35} {p['dia']:<4} {p['total_caracteres']:<9,} "
            f"{fmt_tempo(p['leitura_total_min']):<11} "
            f"{fmt_tempo(p['resolucao_total_min']):<11} "
            f"{p['pct_leitura']:.1f}%"
        )
    print()


# SALVAR ARQUIVOS

def salvar_json(prova, destino):
    """Salva resultado em JSON."""
    saida = {
        "prova": prova["nome"],
        "dia": prova["dia"],
        "parametros": {
            "velocidade_leitura_cpm": VELOCIDADE_LEITURA_CPM,
            "tempo_prova_min": TEMPO_TOTAL_PROVA[prova["dia"]],
            "tempo_redacao_min": TEMPO_REDACAO if prova["dia"] == 1 else 0,
            "tempo_disponivel_min": prova["disponivel_min"],
        },
        "resumo": {
            "total_questoes": prova["total_questoes"],
            "total_caracteres": prova["total_caracteres"],
            "leitura_total_min": round(prova["leitura_total_min"], 2),
            "resolucao_total_min": round(prova["resolucao_total_min"], 2),
            "leitura_media_min": round(prova["leitura_media_min"], 4),
            "resolucao_media_min": round(prova["resolucao_media_min"], 4),
            "tempo_medio_total_min": round(prova["tempo_medio_total_min"], 4),
            "pct_leitura": round(prova["pct_leitura"], 2),
            "pct_resolucao": round(prova["pct_resolucao"], 2),
        },
        "questoes": prova["questoes"],
    }
    destino.write_text(json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")


def salvar_md(prova, destino):
    """Salva resultado em Markdown."""
    linhas = [
        f"# Análise de Tempo de Leitura — {prova['nome']}",
        "",
        "## Parâmetros",
        "",
        "| Parâmetro | Valor |",
        "|-----------|-------|",
        f"| Velocidade de leitura | {VELOCIDADE_LEITURA_CPM} cpm |",
        f"| Dia | {prova['dia']} |",
        f"| Tempo total da prova | {fmt_tempo(TEMPO_TOTAL_PROVA[prova['dia']])} |",
    ]
    if prova["dia"] == 1:
        linhas.append(f"| Tempo redação | {fmt_tempo(TEMPO_REDACAO)} |")
    linhas.extend([
        f"| Tempo disponível (questões) | {fmt_tempo(prova['disponivel_min'])} |",
        "",
        "## Resumo",
        "",
        "| Métrica | Valor |",
        "|---------|-------|",
        f"| Questões | {prova['total_questoes']} |",
        f"| Total de caracteres | {prova['total_caracteres']:,} |",
        f"| Leitura total | {fmt_tempo(prova['leitura_total_min'])} ({prova['pct_leitura']:.1f}%) |",
        f"| Resolução total | {fmt_tempo(prova['resolucao_total_min'])} ({prova['pct_resolucao']:.1f}%) |",
        f"| Leitura média/questão | {prova['leitura_media_min'] * 60:.1f}s |",
        f"| Resolução média/questão | {prova['resolucao_media_min'] * 60:.1f}s |",
        f"| Total médio/questão | {prova['tempo_medio_total_min'] * 60:.1f}s |",
        "",
        "## Caracteres por Questão",
        "",
        "| Questão | Idioma | Caracteres | Palavras | Imagem | Leitura (s) |",
        "|---------|--------|-----------|----------|--------|-------------|",
    ])
    for q in prova["questoes"]:
        img = "✓" if q["tem_imagem"] else "—"
        linhas.append(
            f"| {q['questao']} | {q['idioma']} | {q['caracteres']} | "
            f"{q['palavras']} | {img} | {q['tempo_leitura_seg']:.1f} |"
        )
    linhas.append("")
    destino.write_text("\n".join(linhas), encoding="utf-8")


def salvar_comparativo(provas, destino):
    """Salva resumo comparativo em JSON."""
    payload = {
        "parametros_globais": {
            "velocidade_leitura_cpm": VELOCIDADE_LEITURA_CPM,
            "tempo_dia1_min": TEMPO_TOTAL_PROVA[1],
            "tempo_dia2_min": TEMPO_TOTAL_PROVA[2],
            "tempo_redacao_min": TEMPO_REDACAO,
            "disponivel_dia1_min": tempo_disponivel(1),
            "disponivel_dia2_min": tempo_disponivel(2),
        },
        "provas": [
            {
                "nome": p["nome"],
                "dia": p["dia"],
                "total_caracteres": p["total_caracteres"],
                "leitura_total_min": round(p["leitura_total_min"], 2),
                "resolucao_total_min": round(p["resolucao_total_min"], 2),
                "pct_leitura": round(p["pct_leitura"], 2),
            }
            for p in provas
        ],
    }
    destino.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  Comparativo salvo em: {destino}")


#Encontra JSONs de provas do ENEM.
def descobrir_jsons(caminho):
    caminho = Path(caminho)
    if caminho.is_file() and caminho.suffix == ".json":
        return [caminho]
    if caminho.is_dir():
        return sorted(j for j in caminho.rglob("*.json") if "enem" in j.stem.lower())
    return []

def main():
    parser = argparse.ArgumentParser(
        description="Analisa tempo de leitura vs. resolução das provas do ENEM.",
    )
    parser.add_argument(
        "input", nargs="?", default="enems_json_md",
        help="JSON ou diretório com JSONs extraídos (padrão: enems_json_md)",
    )
    parser.add_argument(
        "--out-dir", default="analise_tempo",
        help="Diretório de saída (padrão: analise_tempo)",
    )
    parser.add_argument(
        "--silencioso", "-s", action="store_true",
        help="Suprime saída detalhada no terminal.",
    )
    args = parser.parse_args()

    entrada = Path(args.input)
    saida = Path(args.out_dir)

    jsons = descobrir_jsons(entrada)
    if not jsons:
        raise SystemExit(f"Nenhum JSON encontrado em: {entrada}")

    saida.mkdir(parents=True, exist_ok=True)
    print(f"Entrada: {entrada}")
    print(f"Saída:   {saida}")
    print(f"Encontrados {len(jsons)} arquivo(s) JSON para análise.\n")

    provas = []

    for caminho in jsons:
        try:
            prova = analisar_prova(caminho)
        except ValueError as err:
            print(f"  ⚠ Ignorando {caminho.name}: {err}")
            continue

        provas.append(prova)

        if not args.silencioso:
            imprimir_resumo(prova)

        salvar_json(prova, saida / f"{prova['nome']}_tempo.json")
        salvar_md(prova, saida / f"{prova['nome']}_tempo.md")
        print(f"  → {prova['nome']}_tempo.json / .md\n")

    if len(provas) > 1:
        imprimir_comparativo(provas)
        salvar_comparativo(provas, saida / "resumo_comparativo.json")

if __name__ == "__main__":
    main()
