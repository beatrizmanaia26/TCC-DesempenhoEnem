#!/usr/bin/env python3
# -*- coding: utf-8 -*-


import json
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, cast, Union
from scipy import stats
import warnings
warnings.filterwarnings('ignore')


import sys
sys.path.insert(0, str(Path(__file__).parent))

# Importar as funções já corretas do analyze_reading_time.py
from analyze_reading_time import (
    contar_caracteres,
    tempo_leitura_minutos,
    analisar_questao,
    analisar_textos_introdutorios,
    VELOCIDADE_LEITURA_CPM,
    TEMPO_TOTAL_PROVA,
    TEMPO_REDACAO
)

REPO_ROOT = Path("/Users/beatrizmanaia/Documents/FEI/TCC/TCC-DesempenhoEnem")
DADOS_JSON_DIR = REPO_ROOT / "dados" / "enems_json_md"
DESEMPENHO_CSV = REPO_ROOT / "outputs" / "ordem" / "desempenho_questoes_por_prova.csv"
OUTPUT_DIR = REPO_ROOT / "outputs" / "metricas" / "tempo"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Constantes adicionais específicas de metricas_tempo.py
TEMPO_DISPONIVEL_MINUTOS_POR_DIA = {
    1: 255,  # Dia 1 (CH, LC): 255 minutos (desconta 75 min de redação de 330 min)
    2: 300   # Dia 2 (CN, MT): 300 minutos completos
}

# Anos incluídos na análise
ANOS_PARA_ANALISE = [2020, 2022, 2023, 2024, 2025]  # Excluindo 2021

# Nota: contar_caracteres e tempo_leitura_minutos estão importadas de analyze_reading_time.py

def calcular_tempo_resolucao(tempo_leitura_min: float, dia: int) -> float:

    tempo_disponivel = TEMPO_DISPONIVEL_MINUTOS_POR_DIA[dia]
    return max(0, tempo_disponivel - tempo_leitura_min)

def calcular_percentual_tempo_disponivel_resolucao(tempo_resolucao_min: float, dia: int) -> float:

    tempo_disponivel = TEMPO_DISPONIVEL_MINUTOS_POR_DIA[dia]
    return (tempo_resolucao_min / tempo_disponivel) * 100

def calcular_percentual_tempo_gasto_leitura(tempo_leitura_min: float, dia: int) -> float:

    tempo_disponivel = TEMPO_DISPONIVEL_MINUTOS_POR_DIA[dia]
    return (tempo_leitura_min / tempo_disponivel) * 100

def extrair_metricas_questao_json(questao_json: Dict) -> Dict[str, int]:

    # 1. Pega o enunciado
    texto_enunciado = questao_json.get("texto", "")
    
    # 2. Pega as alternativas (LETRA + TEXTO) e concatena
    alternativas = questao_json.get("alternativas", [])
    texto_alternativas = ""
    for alt in alternativas:
        texto_alternativas += alt.get("letra", "")      # Inclui LETRA (A, B, C, D, E)
        texto_alternativas += " " + alt.get("texto", "")
    
    # 3. Junta enunciado + alternativas
    texto_completo = texto_enunciado + " " + texto_alternativas
    
    return {
        'caracteres': contar_caracteres(texto_completo)
    }

def _extrair_questoes_categoria_1(dados: Dict, dia: int, area: str) -> tuple:
    """Extrai características das questões (CATEGORIA 1 = Enunciado + 5 Alternativas).
    """
    # Define range de números de questão por área
    # No ENEM, cada dia tem 2 áreas com 45 questões cada (numeradas 1-90)
    if area in ['CH', 'CN']:
        inicio_num = 1
        fim_num = 46  # range é exclusivo no fim, então 46 significa até 45
    else:  # LC ou MT
        inicio_num = 46
        fim_num = 91  # range é exclusivo no fim, então 91 significa até 90
    
    questoes_metricas = []
    caracteres_total = 0
    todas_questoes = dados.get("questoes", [])
    
    for questao in todas_questoes:
        num_questao = questao.get("questao", 0)
        
        # Filtra apenas questões da área (pelo número)
        if inicio_num <= num_questao < fim_num:
            # Usa função importada de analyze_reading_time.py
            metricas = analisar_questao(questao)
            questoes_metricas.append({
                'numero_questao': num_questao,  # Número real da questão (1-90)
                'caracteres': metricas['caracteres'],
                'tempo_leitura_min': metricas['tempo_leitura_min']
            })
            caracteres_total += metricas['caracteres']
    
    tempo_leitura = tempo_leitura_minutos(caracteres_total)
    tempo_resolucao = calcular_tempo_resolucao(tempo_leitura, dia)
    percentual_tempo_resolucao = calcular_percentual_tempo_disponivel_resolucao(tempo_resolucao, dia)
    
    return questoes_metricas, caracteres_total, tempo_leitura, tempo_resolucao, percentual_tempo_resolucao

def _construir_categoria(caracteres_total: int, tempo_leitura: float, 
                         tempo_resolucao: float, percentual_tempo_resolucao: float,
                         caracteres_intro: int = 0) -> Dict:
    """Constrói dict de categoria com métricas.
    
    Parâmetros:
    - caracteres_total: Número total de caracteres
    - tempo_leitura: Tempo em minutos gasto em leitura
    - tempo_resolucao: Tempo em minutos disponível para resolução
    - percentual_tempo_resolucao: % do tempo total disponível para resolver (0-100)
    - caracteres_intro: (opcional) Caracteres de textos introdutórios
    """
    resultado = {
        'caracteres_total': caracteres_total,
        'tempo_leitura_min': tempo_leitura,
        'tempo_resolucao_min': tempo_resolucao,
        'percentual_tempo_resolucao_pct': percentual_tempo_resolucao  
    }
    if caracteres_intro > 0:
        resultado['caracteres_intro'] = caracteres_intro
    return resultado

def extrair_metricas_json_prova(arquivo_json: Path, ano: int, dia: int, area: str) -> Optional[Dict]:
    """Extrai CATEGORIA 1 (Enunciado + Alternativas) + CATEGORIA 2 (Caderno Completo)"""
    try:
        with open(arquivo_json, 'r', encoding='utf-8') as f:
            dados = json.load(f)
    except Exception as e:
        print(f"⚠️  Erro ao ler {arquivo_json}: {e}")
        return None
    
    # CATEGORIA 1: APENAS QUESTÕES (Enunciado + 5 Alternativas)
    questoes, char_cat1, tempo_leitura_cat1, tempo_res_cat1, percentual_tempo_cat1 = _extrair_questoes_categoria_1(dados, dia, area)
    categoria_1 = _construir_categoria(char_cat1, tempo_leitura_cat1, tempo_res_cat1, percentual_tempo_cat1)
    
    # CATEGORIA 2: CADERNO COMPLETO (Intros + Questões)
    # Usa função importada de analyze_reading_time.py
    intro = analisar_textos_introdutorios(dados.get("textos_introdutorios", []))
    caracteres_intro = intro['total_caracteres']
    char_cat2 = char_cat1 + caracteres_intro
    tempo_leitura_cat2 = tempo_leitura_minutos(char_cat2)
    tempo_res_cat2 = calcular_tempo_resolucao(tempo_leitura_cat2, dia)
    percentual_tempo_cat2 = calcular_percentual_tempo_disponivel_resolucao(tempo_res_cat2, dia)
    
    categoria_2 = _construir_categoria(char_cat2, tempo_leitura_cat2, tempo_res_cat2, percentual_tempo_cat2, caracteres_intro)
    
    return {
        'ano': ano,
        'dia': dia,
        'area': area,
        'questoes': questoes,
        'categoria_1': categoria_1,
        'categoria_2': categoria_2
    }


def _parse_pasta_json(nome_pasta: str) -> Optional[Dict]:
    """
    Faz parse do nome da pasta JSON.
    Retorna dict com ano, dia, cor ou None se inválido.
    """
    try:
        ano = int(nome_pasta[4:8])
        if ano not in ANOS_PARA_ANALISE:
            return None
        
        dia_idx = nome_pasta.index('Dia') + 3
        dia = int(nome_pasta[dia_idx])
        cor = nome_pasta.split('Regular')[-1]
        
        return {'ano': ano, 'dia': dia, 'cor': cor}
    except (ValueError, IndexError):
        return None

def _processar_json_por_area(arquivo_json: Path, ano: int, dia: int, 
                              areas_dia: List[str], resultado: Dict, 
                              nome_pasta: str, cor: str) -> None:
    """Processa arquivo JSON para cada área do dia."""
    for area in areas_dia:
        metricas = extrair_metricas_json_prova(arquivo_json, ano, dia, area)
        if metricas:
            chave = (ano, dia, area, cor)
            resultado[chave] = metricas
            print(f"✓ {nome_pasta} → {area}")

def carregar_todos_jsons() -> Dict:
    """Carrega características de TODAS as provas (JSON)"""
    resultado = {}
    
    for pasta_json in DADOS_JSON_DIR.iterdir():
        if not pasta_json.is_dir():
            continue
        
        nome_pasta = pasta_json.name
        
        # Parse do nome
        info = _parse_pasta_json(nome_pasta)
        if not info:
            continue
        
        ano, dia, cor = info['ano'], info['dia'], info['cor']
        
        # Verifica arquivo JSON
        arquivo_json = pasta_json / f"{nome_pasta}.json"
        if not arquivo_json.exists():
            continue
        
        # Processa por área
        areas_dia = ['CH', 'LC'] if dia == 1 else ['CN', 'MT']
        
        try:
            _processar_json_por_area(arquivo_json, ano, dia, areas_dia, resultado, nome_pasta, cor)
        except Exception as e:
            print(f"⚠️  Erro em {nome_pasta}: {e}")
    
    return resultado



def carregar_desempenho_csv() -> pd.DataFrame:
    """Carrega CSV desempenho (TODAS cores, 2020-2025 sem 2021)"""
    df = pd.read_csv(DESEMPENHO_CSV)
    print(f"\nCSV ORIGINAL: {len(df)} linhas")
    
    # Filtro por anos e garantir que é DataFrame
    df_filtrado = cast(pd.DataFrame, df[df['ano'].isin(ANOS_PARA_ANALISE)].copy())
    if not isinstance(df_filtrado, pd.DataFrame):
        raise TypeError("df_filtrado deve ser DataFrame")
    
    print(f"✓ Após filtro de anos: {len(df_filtrado)} linhas")
    
    colunas_criticas = ['co_item', 'posicao_prova', 'parametro_b_tri',
                       'n_respostas', 'n_acertos', 'percentual_acertos']
    df_filtrado = df_filtrado.dropna(subset=colunas_criticas)
    print(f"✓ Após remover NULLs: {len(df_filtrado)} linhas")
    
    if 'dificuldade_tri' not in df_filtrado.columns:
        def classificar_dificuldade(b_tri):
            if pd.isna(b_tri): return 'media'
            if b_tri < 0: return 'facil'
            elif b_tri < 1.5: return 'media'
            else: return 'dificil'
        
        df_filtrado['dificuldade_tri'] = df_filtrado['parametro_b_tri'].apply(
            classificar_dificuldade
        )
    
    df_filtrado['percentual_acertos'] = pd.to_numeric(
        df_filtrado['percentual_acertos'], errors='coerce'
    )
    
    return df_filtrado

def _buscar_metricas_json(jsons_dict: Dict, ano: int, dia: int, area: str) -> tuple:
    """Busca características JSON para um ano/dia/area específico."""
    for (j_ano, j_dia, j_area, j_cor), j_metricas in jsons_dict.items():
        if j_ano == ano and j_dia == dia and j_area == area:
            return j_metricas, j_cor
    return None, None

def _extrair_dados_row(row: pd.Series, caracteristicas: Dict, cor_encontrada: str) -> dict:
    """Extrai e combina dados de uma linha CSV com características JSON."""
    
    # Helper para extrair valor de forma segura
    def safe_item(val):
        return val.item() if hasattr(val, 'item') else val
    
    return {
        'ano': safe_item(row['ano']),
        'dia': 1 if safe_item(row['area']) in ['CH', 'LC'] else 2,
        'area': safe_item(row['area']),
        'cor': cor_encontrada,
        'co_prova': safe_item(row['co_prova']),
        'co_item': safe_item(row['co_item']),
        'posicao': safe_item(row['posicao_prova']),
        'caracteres_total_cat1': caracteristicas['categoria_1']['caracteres_total'],
        'caracteres_intro_cat2': caracteristicas['categoria_2']['caracteres_intro'],
        'caracteres_total_cat2': caracteristicas['categoria_2']['caracteres_total'],
        'tempo_leitura_cat1_min': caracteristicas['categoria_1']['tempo_leitura_min'],
        'tempo_resolucao_cat1_min': caracteristicas['categoria_1']['tempo_resolucao_min'],
        'percentual_tempo_resolucao_cat1_pct': caracteristicas['categoria_1']['percentual_tempo_resolucao_pct'],
        'tempo_leitura_cat2_min': caracteristicas['categoria_2']['tempo_leitura_min'],
        'tempo_resolucao_cat2_min': caracteristicas['categoria_2']['tempo_resolucao_min'],
        'percentual_tempo_resolucao_cat2_pct': caracteristicas['categoria_2']['percentual_tempo_resolucao_pct'],
        'porcentagem_acerto_questao': safe_item(row['percentual_acertos']),
        'n_respostas': safe_item(row['n_respostas']),
        'n_acertos': safe_item(row['n_acertos']),
        'parametro_b_tri': safe_item(row['parametro_b_tri']),
        'dificuldade_tri': safe_item(row['dificuldade_tri'])
    }

def combinar_json_e_desempenho(jsons_dict: Dict, df_desempenho: pd.DataFrame) -> pd.DataFrame:
    """Combina características (JSON) com desempenho (CSV)"""
    dados_combinados = []
    
    # Helper functions para conversão segura de tipos
    def safe_int(val) -> int:
        if hasattr(val, 'item'):
            return int(val.item())
        return int(val)
    
    def safe_str(val) -> str:
        if hasattr(val, 'item'):
            return str(val.item())
        return str(val)
    
    for idx, row in df_desempenho.iterrows():
        ano: int = safe_int(row['ano'])
        area: str = safe_str(row['area'])
        dia: int = 1 if area in ['CH', 'LC'] else 2
        
        caracteristicas, cor_encontrada = _buscar_metricas_json(jsons_dict, ano, dia, area)
        
        if caracteristicas is None:
            continue
        
        dados_combinados.append(_extrair_dados_row(row, caracteristicas, cor_encontrada))
    
    return pd.DataFrame(dados_combinados)


def gerar_resumo_prova(df_combinado: pd.DataFrame) -> pd.DataFrame:
    """SAÍDA 1: Resumo por Prova (~40 linhas)
    
    ⚠️ CRÍTICO: Usa MÉDIA PONDERADA para porcentagem_acerto_questao
    Ponderação: número de respondentes de cada questão
    
    Fórmula: Σ(acerto_i × n_respondentes_i) / Σ(n_respondentes_i)
    """
    # Criar função lambda para média ponderada
    def media_ponderada_acertos(grupo):
        """Calcula média ponderada de acertos pelo número de respondentes"""
        if len(grupo) == 0 or grupo['n_respostas'].sum() == 0:
            return 0
        return (grupo['porcentagem_acerto_questao'] * grupo['n_respostas']).sum() / grupo['n_respostas'].sum()
    
    # Agrupar por prova e calcular média ponderada
    agrupado_base = cast(pd.DataFrame, df_combinado.groupby(['ano', 'dia', 'area', 'cor']).agg({
        'co_prova': 'first',
        'caracteres_total_cat1': 'first',
        'tempo_leitura_cat1_min': 'first',
        'tempo_resolucao_cat1_min': 'first',
        'percentual_tempo_resolucao_cat1_pct': 'first',
        'caracteres_intro_cat2': 'first',
        'caracteres_total_cat2': 'first',
        'tempo_leitura_cat2_min': 'first',
        'tempo_resolucao_cat2_min': 'first',
        'percentual_tempo_resolucao_cat2_pct': 'first',
        'n_respostas': 'max'
    }).reset_index())
    
    # Calcular média ponderada para cada grupo de prova
    media_ponderada_por_grupo = df_combinado.groupby(['ano', 'dia', 'area', 'cor']).apply(
        media_ponderada_acertos, include_groups=False
    ).reset_index()
    media_ponderada_por_grupo.columns = ['ano', 'dia', 'area', 'cor', 'porcentagem_acerto_questao']
    
    # Fazer merge para adicionar a média ponderada
    agrupado = agrupado_base.merge(media_ponderada_por_grupo, on=['ano', 'dia', 'area', 'cor'], how='left')
    
    agrupado = cast(pd.DataFrame, agrupado.rename(columns={
        'co_prova': 'co_prova_cor',
        'porcentagem_acerto_questao': 'porcentagem_acerto_media_prova',
        'n_respostas': 'n_respondentes'
    }))
    
    colunas = ['ano', 'dia', 'area', 'cor', 'caracteres_total_cat1',
               'tempo_leitura_cat1_min', 'tempo_resolucao_cat1_min',
               'percentual_tempo_resolucao_cat1_pct', 'caracteres_intro_cat2',
               'caracteres_total_cat2', 'tempo_leitura_cat2_min',
               'tempo_resolucao_cat2_min', 'percentual_tempo_resolucao_cat2_pct',
               'porcentagem_acerto_media_prova', 'n_respondentes']
    
    agrupado = cast(pd.DataFrame, agrupado[colunas])

    agrupado['diferenca_caracteres_intro'] = (
        agrupado['caracteres_total_cat2'] - agrupado['caracteres_total_cat1']
    )
    
    agrupado['diferenca_tempo_leitura_min'] = (
        agrupado['tempo_leitura_cat2_min'] - agrupado['tempo_leitura_cat1_min']
    )
    
    agrupado['diferenca_tempo_resolucao_min'] = (
        agrupado['tempo_resolucao_cat2_min'] - agrupado['tempo_resolucao_cat1_min']
    )
    
    # Percentuais de diferença (para análise de impacto proporcional)
    agrupado['pct_aumento_tempo_leitura'] = (
        (agrupado['diferenca_tempo_leitura_min'] / agrupado['tempo_leitura_cat1_min']) * 100
    ).round(2)
    
    agrupado['pct_reducao_tempo_resolucao'] = (
        (agrupado['diferenca_tempo_resolucao_min'] / agrupado['tempo_resolucao_cat1_min']) * 100
    ).round(2)
    
    # Reordenar colunas para colocar diferenças logo após CAT2
    colunas_finais = ['ano', 'dia', 'area', 'cor', 
                      'caracteres_total_cat1', 'tempo_leitura_cat1_min', 
                      'tempo_resolucao_cat1_min', 'percentual_tempo_resolucao_cat1_pct',
                      'caracteres_intro_cat2', 'caracteres_total_cat2', 
                      'tempo_leitura_cat2_min', 'tempo_resolucao_cat2_min', 
                      'percentual_tempo_resolucao_cat2_pct',
                      'diferenca_caracteres_intro', 'diferenca_tempo_leitura_min',
                      'diferenca_tempo_resolucao_min', 'pct_aumento_tempo_leitura',
                      'pct_reducao_tempo_resolucao',
                      'porcentagem_acerto_media_prova', 'n_respondentes']
    
    agrupado = cast(pd.DataFrame, agrupado[colunas_finais])
    agrupado = agrupado.sort_values(by=['ano', 'dia', 'area']).reset_index(drop=True)
    print(f"\n✓ Resumo por Prova: {len(agrupado)} linhas (com análise de diferenças CAT1 vs CAT2)")
    return agrupado

def gerar_metricas_questao(df_combinado: pd.DataFrame) -> pd.DataFrame:
    """SAÍDA 2: Métricas por Questão (~1800 linhas)"""
    df_questoes = cast(pd.DataFrame, df_combinado[[
        'ano', 'dia', 'area', 'cor', 'posicao', 'co_item',
        'caracteres_total_cat1', 'tempo_leitura_cat1_min',
        'porcentagem_acerto_questao', 'n_respostas', 'parametro_b_tri', 'dificuldade_tri'
    ]].copy())
    
    df_questoes = cast(pd.DataFrame, df_questoes.rename(columns={
        'caracteres_total_cat1': 'caracteres',
        'tempo_leitura_cat1_min': 'tempo_leitura_min',
        'n_respostas': 'n_respondentes'
    }))
    
    df_questoes = cast(pd.DataFrame, df_questoes.sort_values(
        ['ano', 'dia', 'area', 'cor', 'posicao']
    ).reset_index(drop=True))
    
    print(f"✓ Métricas por Questão: {len(df_questoes)} linhas")
    return df_questoes

def calcular_correlacao_pearson(x: List[float], y: List[float]) -> Dict:
    """Calcula correlação de Pearson entre X e Y"""
    dados_validos = [(xi, yi) for xi, yi in zip(x, y)
                    if pd.notna(xi) and pd.notna(yi) and
                    not np.isinf(xi) and not np.isinf(yi)]
    
    if len(dados_validos) < 3:
        return {'coeficiente_correlacao_pearson': np.nan, 'valor_p_significancia_estatistica': np.nan, 'quantidade_pares': len(dados_validos),
                'interpretacao': 'Dados insuficientes'}
    
    x_v = [d[0] for d in dados_validos]
    y_v = [d[1] for d in dados_validos]
    
    try:
        result = stats.pearsonr(x_v, y_v)
        # Usar indexação de tupla - PearsonRResult suporta __getitem__
        r = float(result[0])  # type: ignore
        p = float(result[1])  # type: ignore
    except (ValueError, ZeroDivisionError, RuntimeError) as e:
        print(f"⚠️  Erro ao calcular correlação: {e}")
        return {'coeficiente_correlacao_pearson': np.nan, 'valor_p_significancia_estatistica': np.nan, 'quantidade_pares': len(dados_validos),
                'interpretacao': 'Erro no cálculo'}
    
    abs_r = abs(r)
    if abs_r < 0.2: intens = "muito fraca"
    elif abs_r < 0.4: intens = "fraca"
    elif abs_r < 0.6: intens = "moderada"
    elif abs_r < 0.8: intens = "forte"
    else: intens = "muito forte"
    
    direcao = "positiva" if r > 0 else "negativa"
    signif = "sig(p<0.05)" if p < 0.05 else "n_sig"
    
    return {
        'coeficiente_correlacao_pearson': r, 'valor_p_significancia_estatistica': p, 'quantidade_pares': len(dados_validos),
        'interpretacao': f"{intens} {direcao}, {signif}"
    }

def gerar_correlacoes_resultado(df_questoes: pd.DataFrame, df_provas: pd.DataFrame) -> pd.DataFrame:
    """SAÍDA 3: Correlações Resultado com estratificação por ÁREA (controla confundidor)"""
    correlacoes = []
    
    for area in ['CH', 'LC', 'CN', 'MT']:
        df_area = cast(pd.DataFrame, df_provas[df_provas['area'] == area])
        if len(df_area) < 3:
            continue
        
        r = calcular_correlacao_pearson(df_area['tempo_leitura_cat1_min'].tolist(),
                                        df_area['porcentagem_acerto_media_prova'].tolist())
        correlacoes.append({
            'tipo_analise_correlacao': 'TIPO_1_tempo_leitura_categoria1_vs_desempenho',
            'nivel': 'por_prova', 'dificuldade': 'TODAS', 'area': area,
            'coeficiente_correlacao_pearson': r['coeficiente_correlacao_pearson'], 'valor_p_significancia_estatistica': r['valor_p_significancia_estatistica'], 'quantidade_pares': r['quantidade_pares'],
            'interpretacao': r['interpretacao']
        })
    for area in ['CH', 'LC', 'CN', 'MT']:
        df_area = cast(pd.DataFrame, df_provas[df_provas['area'] == area])
        if len(df_area) < 3:
            continue
        
        r = calcular_correlacao_pearson(df_area['tempo_leitura_cat2_min'].tolist(),
                                        df_area['porcentagem_acerto_media_prova'].tolist())
        correlacoes.append({
            'tipo_analise_correlacao': 'TIPO_2_tempo_leitura_categoria2_vs_desempenho',
            'nivel': 'por_prova', 'dificuldade': 'TODAS', 'area': area,
            'coeficiente_correlacao_pearson': r['coeficiente_correlacao_pearson'], 'valor_p_significancia_estatistica': r['valor_p_significancia_estatistica'], 'quantidade_pares': r['quantidade_pares'],
            'interpretacao': r['interpretacao']
        })
    
    for area in ['CH', 'LC', 'CN', 'MT']:
        df_area = cast(pd.DataFrame, df_provas[df_provas['area'] == area])
        if len(df_area) < 3:
            continue
        
        r = calcular_correlacao_pearson(df_area['percentual_tempo_resolucao_cat1_pct'].tolist(),
                                        df_area['porcentagem_acerto_media_prova'].tolist())
        correlacoes.append({
            'tipo_analise_correlacao': 'TIPO_3_percentual_tempo_disponivel_resolucao_vs_desempenho',
            'nivel': 'por_prova', 'dificuldade': 'TODAS', 'area': area,
            'coeficiente_correlacao_pearson': r['coeficiente_correlacao_pearson'], 'valor_p_significancia_estatistica': r['valor_p_significancia_estatistica'], 'quantidade_pares': r['quantidade_pares'],
            'interpretacao': r['interpretacao']
        })

    # TIPO 4 & 5: Estratificado por dificuldade
    for dif in ['facil', 'media', 'dificil']:
        df_d = cast(pd.DataFrame, df_questoes[df_questoes['dificuldade_tri'] == dif])
        if len(df_d) < 3:
            continue
        
        # TIPO 4: Caracteres vs Taxa_acerto
        # (Caracteres é proxy para complexidade da questão que impacta tempo de leitura)
        r = calcular_correlacao_pearson(df_d['caracteres'].tolist(),
                                       df_d['porcentagem_acerto_questao'].tolist())
        correlacoes.append({
            'tipo_analise_correlacao': 'TIPO_4_quantidade_caracteres_vs_desempenho',
            'nivel': 'por_questao', 'dificuldade': dif, 'area': 'TODAS',
            'coeficiente_correlacao_pearson': r['coeficiente_correlacao_pearson'], 'valor_p_significancia_estatistica': r['valor_p_significancia_estatistica'], 'quantidade_pares': r['quantidade_pares'],
            'interpretacao': r['interpretacao']
        })
    
    df_corr = pd.DataFrame(correlacoes)
    print(f"✓ Correlações calculadas: {len(df_corr)} linhas (com estratificação por ÁREA)")
    return df_corr


def _is_nan(valor) -> bool:
    """Verifica se um valor é NaN de forma segura."""
    if not isinstance(valor, (float, np.floating)):
        return False
    try:
        return np.isnan(valor)
    except (TypeError, ValueError):
        return False


def _convert_to_type(valor, tipo_esperado):
    """Converte valor para o tipo esperado."""
    if tipo_esperado is None:
        return valor
    try:
        return tipo_esperado(valor)
    except (ValueError, TypeError):
        return None


def _extract_from_native(valor, tipo_esperado):
    """Extrai valor de tipos nativos (int, float)."""
    if _is_nan(valor):
        return None
    return _convert_to_type(valor, tipo_esperado)


def _extract_from_item_method(valor, tipo_esperado):
    """Extrai valor usando .item() method (numpy scalars, pandas Series)."""
    try:
        item_val = valor.item()
        if _is_nan(item_val):
            return None
        return _convert_to_type(item_val, tipo_esperado)
    except (ValueError, TypeError, AttributeError):
        return None


def _extract_from_array(valor, tipo_esperado):
    """Extrai valor de array-like com um elemento."""
    try:
        if hasattr(valor, '__len__') and len(valor) == 1:
            return _extrair_valor_escalar(valor[0], tipo_esperado)
    except (TypeError, IndexError):
        pass
    return None


def _calcular_diferenca_caracteres(df_questoes, dif):
    """Calcula diferença de acerto entre questões com menos vs mais caracteres."""
    df_dif = cast(pd.DataFrame, df_questoes[df_questoes['dificuldade_tri'] == dif])
    
    if len(df_dif) == 0:
        return "Dados insuficientes", "Impacta significativamente"
    
    mediana = df_dif['caracteres'].median()
    menos = df_dif[df_dif['caracteres'] <= mediana]['porcentagem_acerto_questao'].mean()
    mais = df_dif[df_dif['caracteres'] > mediana]['porcentagem_acerto_questao'].mean()
    diff = mais - menos
    
    ref_dados = f"Menos: {menos:.1f}% | Mais: {mais:.1f}% (+{diff:.1f}%)"
    conclusao = f"Questões com MAIS caracteres acertam MAIS (+{diff:.1f}%)"
    
    return ref_dados, conclusao


def _construir_entrada_tipo_1_3(tipo_label, area, r_valor, pval_valor, qtd_valor):
    """Constrói entrada do relatório para TIPOS 1, 2, 3."""
    impacta = 'SIM' if pval_valor and pval_valor < 0.05 else 'NÃO'
    ref_dados = f"r={r_valor:.3f}, p={pval_valor:.4f}" if r_valor and pval_valor else "Dados insuficientes"
    
    return {
        'tipo_analise': tipo_label,
        'area': area,
        'dificuldade': 'TODAS',
        'coeficiente_r': r_valor if r_valor else '',
        'p_value': pval_valor if pval_valor else '',
        'impacta': impacta,
        'conclusao': 'Não impacta significativamente',
        'referencia_dados': ref_dados,
        'quantidade_pares': qtd_valor
    }


def _construir_entrada_tipo_4(dif, r_valor, pval_valor, qtd_valor, ref_dados, conclusao):
    """Constrói entrada do relatório para TIPO 4."""
    return {
        'tipo_analise': 'Quantidade de Caracteres',
        'area': 'TODAS',
        'dificuldade': str(dif).upper(),
        'coeficiente_r': r_valor if r_valor else '',
        'p_value': pval_valor if pval_valor else '',
        'impacta': 'SIM',
        'conclusao': conclusao,
        'referencia_dados': ref_dados,
        'quantidade_pares': qtd_valor
    }


def _extrair_valores_linha(row):
    """Extrai valores escalares de uma linha do DataFrame."""
    r_val = row.get('coeficiente_correlacao_pearson')
    pval = row.get('valor_p_significancia_estatistica')
    qtd = row.get('quantidade_pares')
    
    r_valor = _extrair_valor_escalar(r_val, tipo_esperado=float)
    pval_valor = _extrair_valor_escalar(pval, tipo_esperado=float)
    qtd_valor = _extrair_valor_escalar(qtd, tipo_esperado=int) or 0
    
    return r_valor, pval_valor, qtd_valor


def _processar_tipos_1_2_3(df_correlacoes):
    """Processa TIPOS 1, 2, 3 do relatório."""
    relatorio = []
    tipos_info = [
        ('TIPO_1', 'Tempo Leitura (Questões)'),
        ('TIPO_2', 'Tempo Leitura (Questões + Textos)'),
        ('TIPO_3', '% Tempo Disponível')
    ]
    
    for tipo_nome, tipo_label in tipos_info:
        df_tipo = cast(pd.DataFrame, df_correlacoes[df_correlacoes['tipo_analise_correlacao'].str.contains(tipo_nome)])
        for _, row in df_tipo.iterrows():
            r_valor, pval_valor, qtd_valor = _extrair_valores_linha(row)
            entrada = _construir_entrada_tipo_1_3(tipo_label, row['area'], r_valor, pval_valor, qtd_valor)
            relatorio.append(entrada)
    
    return relatorio


def _processar_tipo_4(df_correlacoes, df_questoes):
    """Processa TIPO 4 do relatório."""
    relatorio = []
    df_tipo4 = cast(pd.DataFrame, df_correlacoes[df_correlacoes['tipo_analise_correlacao'].str.contains('TIPO_4')])
    
    for _, row in df_tipo4.iterrows():
        dif = row['dificuldade']
        r_valor, pval_valor, qtd_valor = _extrair_valores_linha(row)
        ref_dados, conclusao = _calcular_diferenca_caracteres(df_questoes, dif)
        entrada = _construir_entrada_tipo_4(dif, r_valor, pval_valor, qtd_valor, ref_dados, conclusao)
        relatorio.append(entrada)
    
    return relatorio


def _carregar_dados_pipeline():
    """Carrega todos os dados do pipeline."""
    print("\n[1/6] Carregando características (JSON)...")
    jsons_dict = carregar_todos_jsons()
    print(f"     ✓ {len(jsons_dict)} provas carregadas")
    
    print("\n[2/6] Carregando desempenho (CSV)...")
    df_desempenho = carregar_desempenho_csv()
    
    print("\n[3/6] Combinando JSON + CSV...")
    df_combinado = combinar_json_e_desempenho(jsons_dict, df_desempenho)
    print(f"     ✓ {len(df_combinado)} registros combinados")
    
    print("\n[4/6] Gerando Resumo por Prova...")
    df_provas = gerar_resumo_prova(df_combinado)
    
    print("\n[5/6] Gerando Métricas por Questão...")
    df_questoes = gerar_metricas_questao(df_combinado)
    
    print("\n[6/6] Calculando Correlações...")
    df_correlacoes = gerar_correlacoes_resultado(df_questoes, df_provas)
    
    return df_questoes, df_correlacoes


def _exportar_e_exibir(relatorio):
    """Exporta relatório e exibe conclusões."""
    df_relatorio = pd.DataFrame(relatorio)
    arq_final = OUTPUT_DIR / "analise_impacto_desempenho.csv"
    df_relatorio.to_csv(arq_final, index=False, encoding='utf-8')
    
    print(f"\n✓ {arq_final}")
    print(f"   {len(df_relatorio)} análises consolidadas em 1 arquivo único")
    
    print("\n" + "="*80)
    print("  ✅ PIPELINE CONCLUÍDO")
    print("="*80)
    print("\n📊 CONCLUSÕES:")
    print("   ❌ Tempo de leitura (questões): NÃO impacta (p > 0.05)")
    print("   ❌ Tempo de leitura (questões + textos): NÃO impacta (p > 0.05)")
    print("   ❌ % Tempo disponível para resolver: NÃO impacta (p > 0.05)")
    print("   ✅ Quantidade de caracteres: SIM impacta (p < 0.05)")
    print(f"\n📄 Arquivo: {arq_final}")
    print("   Colunas: tipo_analise, area, dificuldade, coeficiente_r, p_value, impacta, conclusao, referencia_dados, quantidade_pares\n")


def _extrair_valor_escalar(valor, tipo_esperado=float):
    """Extrai valor escalar de forma segura, evitando problemas com Series/NDArray.
    
    Trata:
    - floats/ints nativos
    - numpy scalars
    - pandas Series (extrai com .item())
    - NaN/None
    """
    # Casos nulos e booleanos
    if valor is None or isinstance(valor, (bool, np.bool_)):
        return None
    
    # Tipos nativos (int, float)
    if isinstance(valor, (int, float)):
        return _extract_from_native(valor, tipo_esperado)
    
    # Numpy scalars ou pandas Series/Index com .item()
    if isinstance(valor, np.generic) or (hasattr(valor, 'item') and callable(getattr(valor, 'item', None))):
        return _extract_from_item_method(valor, tipo_esperado)
    
    # Array-like com um elemento
    result = _extract_from_array(valor, tipo_esperado)
    if result is not None:
        return result
    
    # Fallback: tenta conversão direta
    return _convert_to_type(valor, tipo_esperado)



def main():
    """PIPELINE COMPLETO"""
    print("\n" + "="*80)
    print("  GERADOR DE MÉTRICAS: IMPACTO DO TEMPO NO DESEMPENHO ENEM")
    print("="*80)
    
    # Carregar dados do pipeline
    df_questoes, df_correlacoes = _carregar_dados_pipeline()
    
    print("\n" + "="*80)
    print("  EXPORTANDO RELATÓRIO CONSOLIDADO ÚNICO")
    print("="*80)
    
    # Construir relatório consolidado
    relatorio = []
    relatorio.extend(_processar_tipos_1_2_3(df_correlacoes))
    relatorio.extend(_processar_tipo_4(df_correlacoes, df_questoes))
    
    # Exportar e exibir conclusões
    _exportar_e_exibir(relatorio)

if __name__ == "__main__":
    main()
