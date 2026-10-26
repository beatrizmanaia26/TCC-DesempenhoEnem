#!/usr/bin/env python3
"""
Script de Análise de Tempo de Leitura do ENEM

Este script foi atualizado para funcionar com a nova estrutura de pastas.

COMO USAR:

1. Rodar de qualquer lugar (com paths padrão):
   cd /Users/beatrizmanaia/Documents/FEI/TCC/TCC-DesempenhoEnem/codigo/analise
   python3 analyze_reading_time.py

2. Rodar com caminho customizado:
   python3 analyze_reading_time.py /caminho/para/enems_json_md --out-dir /caminho/para/output

3. Rodar silenciosamente:
   python3 analyze_reading_time.py -s

PATHS PADRÃO:
- Input:  ../../dados/enems_json_md
- Output: ../../outputs/tempo_leitura

REQUISITOS:
- Python 3.7+
- Nenhuma biblioteca externa (usa apenas stdlib: json, pathlib, argparse)

OUTPUTS:
- JSON com análise detalhada por questão
- Markdown com resumo formatado
- Arquivo de comparativo entre ENEMs

Análise da relação entre tempo médio de leitura das questões e tempo de resolução da prova.

Referências:
    - Velocidade de leitura: ~1100 caracteres/minuto (Messias et al., 2008)
    - Tmpo de prova Dia 1: 5h30min (inclui redação)
    - Tempo de prova Dia 2: 5h00min
    - Tempo estimado para redação: 1h15min (Brasil Escola)

    precisa ser adaptado para o MVP
"""

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

#  Conta caracteres considerando: "texto" (campo principal da questão), "letra" de cada item em "alternativas" "texto" de cada item em "alternativas", exclui espaços, tabs e quebras de linha da contagem.
def analisar_questao(dados_questao):
    texto = dados_questao.get("texto", "")
    
    alternativas = dados_questao.get("alternativas", [])

    partes_alternativas = ""
    for alt in alternativas:
        partes_alternativas += alt.get("letra", "")
        partes_alternativas += alt.get("texto", "")
    
    texto_final = texto + partes_alternativas
    
    chars = contar_caracteres(texto_final)
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


# Conta caracteres dos textos introdutórios (capa, orientações, divisões de seção, etc.)
def analisar_textos_introdutorios(textos_introdutorios):
    """Analisa os textos introdutórios do caderno (capa, instruções, divisões de seção).
    Retorna dict com total de caracteres, palavras e tempo de leitura."""
    total_chars = 0
    total_palavras = 0
    detalhes = []

    for ti in textos_introdutorios:
        texto = ti.get("texto", "")
        chars = contar_caracteres(texto)
        palavras = ti.get("quantidade_palavras", 0)
        total_chars += chars
        total_palavras += palavras
        detalhes.append({
            "id": ti.get("id"),
            "texto_resumo": texto[:80] + "..." if len(texto) > 80 else texto,
            "caracteres": chars,
            "palavras": palavras,
        })

    leitura_min = tempo_leitura_minutos(total_chars)

    return {
        "total_caracteres": total_chars,
        "total_palavras": total_palavras,
        "tempo_leitura_min": leitura_min,
        "tempo_leitura_seg": leitura_min * 60,
        "quantidade_textos": len(textos_introdutorios),
        "detalhes": detalhes,
    }


def analisar_prova(caminho):
    nome = caminho.stem
    dia = detectar_dia(nome)
    disponivel_min = tempo_disponivel(dia)

    with open(caminho, encoding="utf-8") as f:
        dados = json.load(f)

    # Se o JSON for um dicionário com chave "questoes", extrair a lista
    if isinstance(dados, dict):
        lista_questoes = dados.get("questoes", [])
        lista_textos_intro = dados.get("textos_introdutorios", [])
    else:
        lista_questoes = dados
        lista_textos_intro = []

    total_questoes = len(lista_questoes)

    questoes = [analisar_questao(q) for q in lista_questoes]

    #OPÇÃO 1: Apenas questões (enunciado + alternativas)
    total_chars = sum(q["caracteres"] for q in questoes)
    leitura_total_min = sum(q["tempo_leitura_min"] for q in questoes)
    resolucao_total_min = disponivel_min - leitura_total_min

    # Tempo médio de leitura por questão 
    leitura_media = leitura_total_min / total_questoes if total_questoes else 0
    # Tempo médio de resolução por questão
    resolucao_media = resolucao_total_min / total_questoes if total_questoes else 0
    # Tempo total médio por questão
    tempo_medio_total = disponivel_min / total_questoes if total_questoes else 0
    pct_leitura = (leitura_total_min / disponivel_min) * 100 if disponivel_min else 0
    pct_resolucao = 100.0 - pct_leitura

    #OPÇÃO 2: Questões + textos introdutórios (caderno completo)
    intro = analisar_textos_introdutorios(lista_textos_intro)

    total_chars_completo = total_chars + intro["total_caracteres"]
    leitura_total_completo_min = leitura_total_min + intro["tempo_leitura_min"]
    resolucao_total_completo_min = disponivel_min - leitura_total_completo_min
    pct_leitura_completo = (leitura_total_completo_min / disponivel_min) * 100 if disponivel_min else 0
    pct_resolucao_completo = 100.0 - pct_leitura_completo
    leitura_media_completo = leitura_total_completo_min / total_questoes if total_questoes else 0
    resolucao_media_completo = resolucao_total_completo_min / total_questoes if total_questoes else 0

    return {
        "nome": nome,
        "dia": dia,
        "questoes": questoes,
        "total_questoes": total_questoes,
        # Opção 1 - Apenas questões
        "total_caracteres": total_chars,
        "disponivel_min": disponivel_min,
        "leitura_total_min": leitura_total_min,
        "resolucao_total_min": resolucao_total_min,
        "leitura_media_min": leitura_media,
        "resolucao_media_min": resolucao_media,
        "tempo_medio_total_min": tempo_medio_total,
        "pct_leitura": pct_leitura,
        "pct_resolucao": pct_resolucao,
        # Opção 2 - Caderno completo (questões + textos introdutórios)
        "textos_introdutorios": intro,
        "total_caracteres_completo": total_chars_completo,
        "leitura_total_completo_min": leitura_total_completo_min,
        "resolucao_total_completo_min": resolucao_total_completo_min,
        "leitura_media_completo_min": leitura_media_completo,
        "resolucao_media_completo_min": resolucao_media_completo,
        "pct_leitura_completo": pct_leitura_completo,
        "pct_resolucao_completo": pct_resolucao_completo,
    }



if __name__ == "__main__":
    print("Script executado com sucesso")
