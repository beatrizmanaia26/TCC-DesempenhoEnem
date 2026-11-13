#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Métricas de tempo de leitura e correlação entre caracteres da questão e acerto (ENEM 2020-2025, sem 2021).

RODAR: python3 "/Users/beatrizmanaia/Documents/FEI/TCC desemprov/TCC-DesempenhoEnem/codigo/analise/metricas_tempo.py"

SAÍDAS GERADAS:
  1. resumo_metricas_prova.csv: minutos de leitura por prova (descritivo, sem correlação).
  2. metricas_caracteristicas_questao.csv: caracteres e tempo de leitura por questão e caderno.
  3. analise_impacto_desempenho.csv: correlação de Spearman entre caracteres da questão e
     percentual de acerto, por ano × área (20 testes).

TEMPO DE LEITURA:
  tempo_leitura_minutos = caracteres / 1100 (caracteres por minuto).
  Categoria 1: questões (enunciado + alternativas). Categoria 2: questões + textos introdutórios.

CORRELAÇÃO (SPEARMAN), UMA LINHA POR ANO × ÁREA:
  Unidade = item (co_item). x = caracteres da questão (enunciado + alternativas).
  y = acerto do item = total de acertos / total de respondentes dos 4 cadernos.
  p por sorteio (20 mil permutações, semente 42); p_value ajustado por Holm sobre os 20 testes.
  Cada linha traz coeficiente_r, p_value (Holm), p_value_bruto e interpretacao (rótulo de |r|).
  Não há correlação separada para o tempo: o tempo é caracteres / 1100 / tempo disponível do dia,
  então a ordem dos itens é a mesma e o resultado seria idêntico ao de caracteres.
  Para "o tempo é suficiente?", ver os minutos por prova em resumo_metricas_prova.csv.

FILTROS APLICADOS:
  ✓ Período: 2020-2025, excluindo 2021 (conforme solicitado)
  ✓ Sem filtro de estado (coluna não disponível no CSV)
  ✓ Considera TODAS as cores/versões de prova (CSV já contém dados integrados)
"""


import itertools
import json
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, cast
from scipy import stats
import warnings
warnings.filterwarnings('ignore')
import sys
# Raiz do repositório no sys.path: permite rodar como script OU como módulo (-m)
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
# Importar as funções já corretas do analyze_reading_time.py (pacote a partir da raiz do repo)
from codigo.analise.analyze_reading_time import (
    tempo_leitura_minutos,
    analisar_questao,
    analisar_textos_introdutorios,
    TEMPO_DISPONIVEL_MINUTOS_POR_DIA
)

REPO_ROOT = Path(__file__).resolve().parents[2]
DADOS_JSON_DIR = REPO_ROOT / "dados" / "enems_json_md"
DESEMPENHO_CSV = REPO_ROOT / "outputs" / "ordem" / "desempenho_questoes_por_prova.csv"

# Cor de referência: o texto das questões vem só do JSON Azul. Todos os cadernos
# de um ano têm as mesmas questões em ordem diferente; o item é ligado ao texto
# pelo co_item e pela posição que ele ocupa no caderno Azul.
COR_REFERENCIA = "Azul"

# Código co_prova do caderno Azul por ano e área (mesmos códigos de tabela_base.py)
CODIGOS_AZUIS = {
    2020: {"CN": 597, "CH": 567, "LC": 577, "MT": 587},
    2022: {"CN": 1085, "CH": 1055, "LC": 1065, "MT": 1075},
    2023: {"CN": 1221, "CH": 1191, "LC": 1201, "MT": 1211},
    2024: {"CN": 1419, "CH": 1383, "LC": 1395, "MT": 1407},
    2025: {"CN": 1483, "CH": 1447, "LC": 1459, "MT": 1471},
}
OUTPUT_DIR = REPO_ROOT / "outputs" / "metricas" / "tempo"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Anos incluídos na análise
ANOS_PARA_ANALISE = [2020, 2022, 2023, 2024, 2025]  # Excluindo 2021

# Nota: tempo_leitura_minutos e analisar_questao são importadas de analyze_reading_time.py

def calcular_tempo_resolucao(tempo_leitura_min: float, dia: int) -> float:
    """MÉTRICA: T_resolução = T_disponível - T_leitura"""
    tempo_disponivel = TEMPO_DISPONIVEL_MINUTOS_POR_DIA[dia]
    return max(0, tempo_disponivel - tempo_leitura_min)

def calcular_percentual_tempo_disponivel_resolucao(tempo_resolucao_min: float, dia: int) -> float: #para usar no mvp
    """MÉTRICA: Percentual de tempo DISPONÍVEL para resolver a prova
     Calcula que PORCENTAGEM do tempo total SOBRA para resolver.
    
    Fórmula: (tempo_resolucao / tempo_disponível) × 100
    
    Resultado: 0% a 100%
    - 90% = 90% do tempo disponível para resolver (BAIXA PRESSÃO DE TEMPO)  BOM
    - 50% = 50% do tempo disponível para resolver (MÉDIA PRESSÃO)
    - 10% = 10% do tempo disponível para resolver (ALTA PRESSÃO)  RUIM
     """
    tempo_disponivel = TEMPO_DISPONIVEL_MINUTOS_POR_DIA[dia]
    return (tempo_resolucao_min / tempo_disponivel) * 100

def _extrair_questoes_categoria_1(dados: Dict[str, Any], dia: int, area: str) -> Tuple[Any, ...]:
    """Extrai características das questões (CATEGORIA 1 = Enunciado + 5 Alternativas).
    
     Filtra questões por NÚMERO (campo "questao" do JSON)
    - Dia 1, Area LC: Questões 1-45 (45 questões de Linguagens)
    - Dia 1, Area CH: Questões 46-90 (45 questões de Ciências Humanas)
    - Dia 2, Area CN: Questões 91-135 (45 questões de Ciências Naturais)
    - Dia 2, Area MT: Questões 136-180 (45 questões de Matemática)
    
    Pode haver questões duplicadas no JSON (especialmente questões 1-5 por serem de ingles e espanhol)
    Usamos dict para manter apenas PRIMEIRA ocorrência de cada número
    
    Reutiliza analisar_questao() de analyze_reading_time.py, que conta
    apenas o campo "texto" da questão (enunciado + alternativas com letras,
    já presentes nesse campo, sem somar as alternativas de novo).
    Os caracteres são calculados por analisar_questao()
    Calcula tempo_leitura_min corretamente
    """
    # range de números de questão no JSON (numeração absoluta = posição na prova):
    # - Dia 1: Q1-45 (LC), Q46-90 (CH)
    # - Dia 2: Q91-135 (CN), Q136-180 (MT)
    if area == 'CH':  
        inicio_num = 46
        fim_num = 91  
    elif area == 'LC':  
        inicio_num = 1
        fim_num = 46  
    elif area == 'CN':  
        inicio_num = 91
        fim_num = 136 
    else:  # area == 'MT', Dia 2, segunda área
        inicio_num = 136
        fim_num = 181  
    
    # Usar dict para evitar duplicatas (manter primeira ocorrência)
    questoes_por_numero = {}
    caracteres_total = 0
    todas_questoes = dados.get("questoes", [])
    
    for questao in todas_questoes:
        num_questao = questao.get("questao", 0)
        
        # Filtra apenas questões da área (pelo número)
        if inicio_num <= num_questao < fim_num:
            # Se questão não foi vista ainda, processa
            if num_questao not in questoes_por_numero:
                # Usa função importada de analyze_reading_time.py
                metricas = analisar_questao(questao)
                questoes_por_numero[num_questao] = {
                    'numero_questao': num_questao,
                    'caracteres': metricas['caracteres'],
                    'tempo_leitura_min': metricas['tempo_leitura_min']
                }
                caracteres_total += metricas['caracteres']
    
    # Converter dict para lista, ordenada por número
    questoes_metricas = sorted(questoes_por_numero.values(), key=lambda x: x['numero_questao'])
    
    tempo_leitura = tempo_leitura_minutos(caracteres_total)
    tempo_resolucao = calcular_tempo_resolucao(tempo_leitura, dia)
    percentual_tempo_resolucao = calcular_percentual_tempo_disponivel_resolucao(tempo_resolucao, dia)
    
    return questoes_metricas, caracteres_total, tempo_leitura, tempo_resolucao, percentual_tempo_resolucao

def _construir_categoria(caracteres_total: int, tempo_leitura: float, 
                         tempo_resolucao: float, percentual_tempo_resolucao: float,
                         caracteres_intro: int = 0) -> Dict[str, Any]:
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

def _normalizar_idioma(valor) -> str:
    """Padroniza o idioma: 'Inglês' -> 'inglês'; vazio/NaN (questão comum) -> 'geral'."""
    if valor is None or pd.isna(valor):
        return 'geral'
    return str(valor).strip().lower()


def _caracteres_por_item(dados: Dict[str, Any]) -> Dict[Tuple[Any, str], int]:
    """Caracteres de cada questão do JSON, indexados por (número, idioma).

    Diferente de _extrair_questoes_categoria_1 (que guarda só a primeira versão
    de cada número), aqui as questões 1-5 de inglês e de espanhol ficam separadas.
    """
    por_item: Dict[Tuple[Any, str], int] = {}
    for questao in dados.get('questoes', []):
        chave = (questao.get('questao', 0), _normalizar_idioma(questao.get('idioma', 'geral')))
        if chave not in por_item:
            por_item[chave] = cast(int, analisar_questao(questao)['caracteres'])
    return por_item


def extrair_metricas_json_prova(arquivo_json: Path, ano: int, dia: int, area: str) -> Optional[Dict[str, Any]]:
    """Extrai CATEGORIA 1 (Enunciado + Alternativas) + CATEGORIA 2 (Caderno Completo)"""
    try:
        with open(arquivo_json, 'r', encoding='utf-8') as f:
            dados = json.load(f)
    except Exception as e:
        print(f" Erro ao ler {arquivo_json}: {e}")
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
    
    categoria_2 = _construir_categoria(char_cat2, tempo_leitura_cat2, tempo_res_cat2, percentual_tempo_cat2, cast(int, caracteres_intro))
    
    return {
        'ano': ano,
        'dia': dia,
        'area': area,
        'questoes': questoes,
        'categoria_1': categoria_1,
        'categoria_2': categoria_2,
        'caracteres_por_item': _caracteres_por_item(dados)
    }


def _parse_pasta_json(nome_pasta: str) -> Optional[Dict[str, Any]]:
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
                              areas_dia: List[str], resultado: Dict[Any, Any], 
                              nome_pasta: str, cor: str) -> None:
    """Processa arquivo JSON para cada área do dia."""
    for area in areas_dia:
        metricas = extrair_metricas_json_prova(arquivo_json, ano, dia, area)
        if metricas:
            chave = (ano, dia, area, cor)
            resultado[chave] = metricas
            print(f"✓ {nome_pasta} → {area}")

def carregar_todos_jsons() -> Dict[Any, Any]:
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
            print(f" Erro em {nome_pasta}: {e}")
    
    return resultado



def carregar_desempenho_csv() -> pd.DataFrame:
    """Carrega CSV desempenho (TODAS cores, 2020-2025 sem 2021)"""
    df = pd.read_csv(DESEMPENHO_CSV)
    print(f"\n📈 CSV ORIGINAL: {len(df)} linhas")
    
    # Filtro por anos e garantir que é DataFrame
    df_filtrado = cast(pd.DataFrame, df[df['ano'].isin(ANOS_PARA_ANALISE)].copy())
    if not isinstance(df_filtrado, pd.DataFrame):
        raise TypeError("df_filtrado deve ser DataFrame")
    
    print(f"✓ Após filtro de anos: {len(df_filtrado)} linhas")
    
    # Filtrar posições por área (CSV original pode ter erro de posições)
    # Dia 1: CH (46-90), LC (1-45)
    # Dia 2: CN (91-135), MT (136-180)
    def filtro_posicoes_por_area(row):
        """Filtra questões com posições corretas por área."""
        area = row['area']
        posicao = row['posicao_prova']
        
        if area == 'CH':
            # Dia 1: CH sempre tem posições 46-90
            return 46 <= posicao <= 90
        elif area == 'LC':
            # Dia 1: LC sempre tem posições 1-45
            return 1 <= posicao <= 45
        elif area == 'CN':
            # Dia 2: CN sempre tem posições 91-135
            return 91 <= posicao <= 135
        elif area == 'MT':
            # Dia 2: MT sempre tem posições 136-180
            return 136 <= posicao <= 180
        else:
            return True
    
    linhas_antes_filtro = len(df_filtrado)
    df_filtrado = cast(pd.DataFrame, df_filtrado[df_filtrado.apply(filtro_posicoes_por_area, axis=1)])
    linhas_removidas = linhas_antes_filtro - len(df_filtrado)
    if linhas_removidas > 0:
        print(f"✓ Após filtrar posições por área: {len(df_filtrado)} linhas (-{linhas_removidas})")
    
    # parametro_b_tri não é obrigatório: a correlação usa só caracteres e acerto.
    # Questões sem b (o ENEM não calculou) permanecem na análise.
    colunas_criticas = ['co_item', 'posicao_prova',
                       'n_respostas', 'n_acertos', 'percentual_acertos']
    df_filtrado = df_filtrado.dropna(subset=colunas_criticas)
    print(f"✓ Após remover NULLs: {len(df_filtrado)} linhas")
    
    if 'dificuldade_tri' not in df_filtrado.columns:
        # Sem b (não calculado pelo ENEM), a dificuldade fica vazia.
        def classificar_dificuldade(b_tri):
            if pd.isna(b_tri): return None
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

def _buscar_metricas_json(jsons_dict: Dict[Any, Any], ano: int, dia: int, area: str) -> Tuple[Any, ...]:
    """Busca características do caderno Azul (cor de referência) para ano/dia/area."""
    metricas = jsons_dict.get((ano, dia, area, COR_REFERENCIA))
    if metricas is None:
        return None, None
    return metricas, COR_REFERENCIA

def _extrair_dados_row(row: pd.Series, caracteristicas: Dict[str, Any], cor_encontrada: str,
                       posicao_azul: int, idioma: str) -> Dict[str, Any]:
    """Extrai e combina dados de uma linha CSV com características do JSON Azul.

    posicao_azul: posição que o item (co_item) ocupa no caderno Azul. É ela
    que indica a questão do JSON, e não a posição do caderno desta linha.
    idioma: 'inglês', 'espanhol' ou 'geral' (LC; questões 1-5 têm duas versões).
    """
    
    # Helper para extrair valor de forma segura
    def safe_item(val):
        return val.item() if hasattr(val, 'item') else val
    
    area = safe_item(row['area'])
    
    # Caracteres da questão (número do Azul + idioma), lidos do JSON Azul.
    # Não há fallback: se a questão não existir no Azul, é erro de dados.
    chave_item = (posicao_azul, idioma)
    caracteres_questao_individual = caracteristicas['caracteres_por_item'].get(chave_item)
    if caracteres_questao_individual is None:
        raise ValueError(
            f"Questão {chave_item} não encontrada no JSON Azul "
            f"(ano={safe_item(row['ano'])}, área={area}, co_item={safe_item(row['co_item'])})."
        )
    
    return {
        'ano': safe_item(row['ano']),
        'dia': 1 if area in ['CH', 'LC'] else 2,
        'area': area,
        'co_prova': safe_item(row['co_prova']),
        'co_item': safe_item(row['co_item']),
        'posicao': safe_item(row['posicao_prova']),
        'posicao_azul': posicao_azul,
        'caracteres_questao_individual': caracteres_questao_individual,
        'caracteres_total_cat1': caracteristicas['categoria_1']['caracteres_total'],
        'caracteres_intro_cat2': caracteristicas['categoria_2']['caracteres_intro'],
        'caracteres_total_cat2': caracteristicas['categoria_2']['caracteres_total'],
        'tempo_leitura_cat1_min': caracteristicas['categoria_1']['tempo_leitura_min'],
        'tempo_leitura_cat2_min': caracteristicas['categoria_2']['tempo_leitura_min'],
        'porcentagem_acerto_questao': safe_item(row['percentual_acertos']),
        'n_respostas': safe_item(row['n_respostas']),
        'n_acertos': safe_item(row['n_acertos']),
        'parametro_b_tri': safe_item(row['parametro_b_tri']),
        'dificuldade_tri': safe_item(row['dificuldade_tri'])
    }

def combinar_json_e_desempenho(jsons_dict: Dict[Any, Any], df_desempenho: pd.DataFrame) -> pd.DataFrame:
    """Combina características (JSON Azul) com desempenho (CSV).

    Cada linha do CSV é um item em um caderno (co_prova). O texto vem do JSON
    Azul, na posição que o mesmo co_item ocupa no caderno Azul. Assim, uma
    questão que é a 1 no Azul e a 4 no Rosa recebe o mesmo texto nas duas.
    """
    # Posição de cada item no caderno Azul: (ano, área, co_item) -> posição
    posicoes_azul: Dict[Tuple[Any, ...], int] = {}
    for _, row_any in df_desempenho.iterrows():
        row = cast(Any, row_any)
        ano_row = int(row['ano'])
        area_row = str(row['area'])
        if int(row['co_prova']) == CODIGOS_AZUIS[ano_row][area_row]:
            posicoes_azul[(ano_row, area_row, int(row['co_item']))] = int(row['posicao_prova'])
    
    dados_combinados = []
    sem_posicao_azul = 0
    
    for _, row_any in df_desempenho.iterrows():
        row = cast(Any, row_any)
        ano: int = int(row['ano'])
        area: str = str(row['area'])
        dia: int = 1 if area in ['CH', 'LC'] else 2
        
        caracteristicas, cor_encontrada = _buscar_metricas_json(jsons_dict, ano, dia, area)
        
        if caracteristicas is None:
            continue
        
        posicao_azul = posicoes_azul.get((ano, area, int(row['co_item'])))
        if posicao_azul is None:
            sem_posicao_azul += 1
            continue
        
        idioma = _normalizar_idioma(row.get('lingua_estrangeira'))
        dados_combinados.append(
            _extrair_dados_row(row, caracteristicas, cor_encontrada, posicao_azul, idioma)
        )
    
    if sem_posicao_azul:
        print(f"  {sem_posicao_azul} linhas sem item no caderno Azul (ignoradas)")
    
    return pd.DataFrame(dados_combinados)


def gerar_resumo_prova(df_combinado: pd.DataFrame) -> pd.DataFrame:
    """SAÍDA 1: Resumo por Prova (40 provas × 4 cores = 80 linhas)
    
    Usa MÉDIA PONDERADA para porcentagem_acerto_questao
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
    agrupado_base = cast(pd.DataFrame, df_combinado.groupby(['ano', 'dia', 'area', 'co_prova']).agg({
        'caracteres_total_cat1': 'first',
        'tempo_leitura_cat1_min': 'first',
        'caracteres_intro_cat2': 'first',
        'caracteres_total_cat2': 'first',
        'tempo_leitura_cat2_min': 'first',
        'n_respostas': 'max'
    }).reset_index())
    
    # Calcular média ponderada para cada grupo de prova
    media_ponderada_por_grupo = df_combinado.groupby(['ano', 'dia', 'area', 'co_prova']).apply(
        media_ponderada_acertos, include_groups=False
    ).reset_index()
    media_ponderada_por_grupo.columns = ['ano', 'dia', 'area', 'co_prova', 'porcentagem_acerto_questao']
    
    # Fazer merge para adicionar a média ponderada
    agrupado = agrupado_base.merge(media_ponderada_por_grupo, on=['ano', 'dia', 'area', 'co_prova'], how='left')
    
    agrupado = cast(pd.DataFrame, agrupado.rename(columns={
        'porcentagem_acerto_questao': 'porcentagem_acerto_media_prova',
        'n_respostas': 'n_respondentes'
    }))
    
    colunas = ['ano', 'dia', 'area', 'co_prova', 'caracteres_total_cat1',
               'tempo_leitura_cat1_min',
               'caracteres_intro_cat2',
               'caracteres_total_cat2', 'tempo_leitura_cat2_min',
               'porcentagem_acerto_media_prova', 'n_respondentes']
    
    agrupado = cast(pd.DataFrame, agrupado[colunas])
    
    agrupado['diferenca_tempo_leitura_min'] = (
        agrupado['tempo_leitura_cat2_min'] - agrupado['tempo_leitura_cat1_min']
    )
    
    # Reordenar colunas
    colunas_finais = ['ano', 'dia', 'area', 'co_prova', 
                      'caracteres_total_cat1', 'tempo_leitura_cat1_min', 
                      'caracteres_intro_cat2', 'caracteres_total_cat2', 
                      'tempo_leitura_cat2_min',
                      'diferenca_tempo_leitura_min',
                      'porcentagem_acerto_media_prova', 'n_respondentes']
    
    agrupado = cast(pd.DataFrame, agrupado[colunas_finais])
    agrupado = agrupado.sort_values(by=['ano', 'dia', 'area']).reset_index(drop=True)
    print(f"\n✓ Resumo por Prova: {len(agrupado)} linhas (com análise de diferenças CAT1 vs CAT2)")
    return agrupado

def gerar_metricas_questao(df_combinado: pd.DataFrame) -> pd.DataFrame:
    """SAÍDA 2: Métricas por Questão (1 linha por caderno: 918 itens × 4 cores = 3672 linhas)
    
    Usa caracteres INDIVIDUAIS de cada questão, não o total da prova
    """
    df_questoes = cast(pd.DataFrame, df_combinado[[
        'ano', 'dia', 'area', 'co_prova', 'co_item', 'posicao',
        'caracteres_questao_individual',
        'porcentagem_acerto_questao', 'n_acertos', 'n_respostas', 'dificuldade_tri'
    ]].copy())
    
    df_questoes = cast(pd.DataFrame, df_questoes.rename(columns={
        'caracteres_questao_individual': 'caracteres',
    }))
    
    df_questoes = cast(pd.DataFrame, df_questoes.sort_values(
        ['ano', 'dia', 'area', 'co_prova', 'posicao']
    ).reset_index(drop=True))
    
    print(f"✓ Métricas por Questão: {len(df_questoes)} linhas")
    return df_questoes

def ajustar_holm(p_values: List[float]) -> List[float]:
    """Correção de Holm para múltiplos testes (controla o erro da família de testes)."""
    if any(pd.isna(p) for p in p_values):
        raise ValueError("p-values ausentes na correção de Holm")
    m = len(p_values)
    ordem = sorted(range(m), key=lambda i: p_values[i])
    ajustados = [0.0] * m
    maximo = 0.0
    for posicao, i in enumerate(ordem):
        maximo = max(maximo, min(1.0, (m - posicao) * p_values[i]))
        ajustados[i] = maximo
    return ajustados


def agregar_itens(df_questoes: pd.DataFrame) -> pd.DataFrame:
    """Uma linha por item (ano, dia, área, co_item).

    Os 4 cadernos do mesmo item têm o mesmo texto. O acerto do item é o total de
    acertos dividido pelo total de respondentes dos cadernos (média ponderada).
    """
    df_itens = cast(pd.DataFrame, df_questoes.groupby(['ano', 'dia', 'area', 'co_item'], as_index=False).agg(
        caracteres=('caracteres', 'first'),
        caracteres_distintos=('caracteres', 'nunique'),
        n_acertos=('n_acertos', 'sum'),
        n_respostas=('n_respostas', 'sum')
    ))
    if (df_itens['caracteres_distintos'] > 1).any():
        raise ValueError("Caracteres diferentes entre cadernos do mesmo item")
    df_itens['acerto'] = df_itens['n_acertos'] / df_itens['n_respostas'] * 100
    print(f"✓ Itens únicos: {len(df_itens)} (a partir de {len(df_questoes)} linhas de caderno)")
    return df_itens.drop(columns=['caracteres_distintos'])


def _p_sorteio(x: List[float], y: List[float], n_sim: int = 20000, semente: int = 42) -> Tuple[float, float]:
    """Spearman e p bilateral por sorteio (permutação de y), para amostras de dezenas de itens.

    Com 41 a 50 itens por área-ano, todas as permutações são inviáveis, então sorteia
    n_sim permutações com semente fixa. p = (extremos + 1) / (n_sim + 1).
    """
    x_arr = np.asarray(x, dtype=float)
    y_arr = np.asarray(y, dtype=float)
    rho_obs = float(cast(Any, stats.spearmanr(x_arr, y_arr)).statistic)
    ranks_x = stats.rankdata(x_arr)
    ranks_y = stats.rankdata(y_arr)
    rng = np.random.default_rng(semente)
    extremos = 0
    for _ in range(n_sim):
        rho = float(np.corrcoef(ranks_x, rng.permutation(ranks_y))[0, 1])
        if abs(rho) >= abs(rho_obs) - 1e-12:
            extremos += 1
    return rho_obs, (extremos + 1) / (n_sim + 1)


def gerar_correlacoes_resultado(df_itens: pd.DataFrame) -> pd.DataFrame:
    """SAÍDA 3: correlação entre caracteres da questão e acerto, por ano × área.

    Unidade = item (co_item), com o acerto médio entre as cores. Cada ano × área
    (5 anos × 4 áreas = 20 testes) usa todos os itens da área naquele ano.
    p por sorteio (permutação); p ajustado por Holm sobre os 20 testes desta análise.
    """
    testes = []
    for ano in sorted(df_itens['ano'].unique()):
        for area in ['CH', 'LC', 'CN', 'MT']:
            df_area = cast(pd.DataFrame, df_itens[(df_itens['ano'] == ano) & (df_itens['area'] == area)])
            rho, p = _p_sorteio(df_area['caracteres'].tolist(), df_area['acerto'].tolist())
            testes.append((int(ano), area, rho, p, len(df_area)))

    p_holm = ajustar_holm([p for _, _, _, p, _ in testes])

    correlacoes = []
    for (ano, area, rho, p_bruto, n), p_ajustado in zip(testes, p_holm):
        correlacoes.append({
            'tipo_analise_correlacao': 'TIPO_1_caracteres_questao_vs_acerto',
            'dificuldade': 'TODAS', 'area': area, 'ano': ano,
            'coeficiente_correlacao_spearman': rho,
            'valor_p_significancia_estatistica': p_ajustado,
            'valor_p_bruto': p_bruto,
            'quantidade_pares': n,
            'interpretacao': _intensidade_correlacao(rho)
        })

    df_corr = pd.DataFrame(correlacoes)
    print(f"✓ Correlações por questão calculadas: {len(df_corr)} linhas (ano × área; sorteio; Holm sobre os 20 testes)")
    return df_corr











def gerar_correlacoes_por_dificuldade(df_questoes: pd.DataFrame) -> pd.DataFrame:
    """SAÍDA 4: correlação entre caracteres da questão e acerto, por dificuldade (TRI) e por ano × área.

    Unidade = item (ano, área, co_item). Acerto = total de acertos / total de respondentes dos
    4 cadernos (mesma regra da SAÍDA 3). Itens sem dificuldade_tri (sem parâmetro b) ficam de fora.
    Gera 3 linhas por nível (agregado de todos os anos e áreas, Holm sobre 3 testes) e
    60 linhas ano × área × nível (Holm sobre 60 testes). Mesma escala de cores do mapa geral.
    """
    df_com_dificuldade = cast(pd.DataFrame, df_questoes[df_questoes['dificuldade_tri'].notna()])
    df_itens = cast(pd.DataFrame, df_com_dificuldade.groupby(
        ['ano', 'area', 'co_item', 'dificuldade_tri'], as_index=False
    ).agg(
        caracteres=('caracteres', 'first'),
        n_acertos=('n_acertos', 'sum'),
        n_respostas=('n_respostas', 'sum')
    ))
    df_itens['acerto'] = df_itens['n_acertos'] / df_itens['n_respostas'] * 100

    niveis = ['facil', 'media', 'dificil']
    linhas = []

    # Agregado por nível (3 testes)
    testes_nivel = []
    for nivel in niveis:
        df_nivel = cast(pd.DataFrame, df_itens[df_itens['dificuldade_tri'] == nivel])
        rho, p = _p_sorteio(df_nivel['caracteres'].tolist(), df_nivel['acerto'].tolist())
        testes_nivel.append((nivel, rho, p, len(df_nivel)))
    p_holm_nivel = ajustar_holm([p for _, _, p, _ in testes_nivel])
    for (nivel, rho, p_bruto, n), p_ajustado in zip(testes_nivel, p_holm_nivel):
        linhas.append({
            'tipo_analise': 'TIPO_2_caracteres_questao_vs_acerto_por_dificuldade',
            'area': 'TODAS', 'ano': 'TODOS',
            'dificuldade': nivel,
            'coeficiente_r': rho,
            'p_value': p_ajustado,
            'p_value_bruto': p_bruto,
            'quantidade_pares': n,
            'interpretacao': _intensidade_correlacao(rho)
        })

    # Ano × área × nível (60 testes)
    testes_celula = []
    for ano in sorted(df_itens['ano'].unique()):
        for area in ['CH', 'LC', 'CN', 'MT']:
            for nivel in niveis:
                df_c = cast(pd.DataFrame, df_itens[
                    (df_itens['ano'] == ano) & (df_itens['area'] == area) & (df_itens['dificuldade_tri'] == nivel)
                ])
                rho, p = _p_sorteio(df_c['caracteres'].tolist(), df_c['acerto'].tolist())
                testes_celula.append((int(ano), area, nivel, rho, p, len(df_c)))
    p_holm_celula = ajustar_holm([p for *_, p, _ in testes_celula])
    for (ano, area, nivel, rho, p_bruto, n), p_ajustado in zip(testes_celula, p_holm_celula):
        linhas.append({
            'tipo_analise': 'TIPO_3_caracteres_questao_vs_acerto_ano_area_dificuldade',
            'area': area, 'ano': ano,
            'dificuldade': nivel,
            'coeficiente_r': rho,
            'p_value': p_ajustado,
            'p_value_bruto': p_bruto,
            'quantidade_pares': n,
            'interpretacao': _intensidade_correlacao(rho)
        })

    df_dif = pd.DataFrame(linhas)
    arq = OUTPUT_DIR / "analise_correlacao_dificuldade.csv"
    df_dif.to_csv(arq, index=False, encoding='utf-8')
    print(f"\n✓ {arq}")
    print(f"   {len(df_dif)} linhas: 3 por nível (Holm sobre 3) + 60 ano × área × nível (Holm sobre 60)")
    return df_dif


# Filtros do gráfico de colunas (dia e área). Cada área cai em um só dia da prova.
AREAS_POR_DIA = {1: ['CH', 'LC'], 2: ['CN', 'MT']}
ORDEM_AREAS = ['CH', 'LC', 'CN', 'MT']


def _combinacoes_filtro_dia_area():
    """Combinações de filtro: dia ('todos', 1 ou 2) × áreas marcadas (ao menos uma).

    Dia 'todos' tem as 15 combinações de 4 áreas; Dia 1 e Dia 2 têm 3 cada (duas áreas por dia).
    Sem área marcada na tela, o filtro usa todas as áreas do dia escolhido.
    """
    combinacoes = []
    for dia in ['todos', 1, 2]:
        areas_do_dia = ORDEM_AREAS if dia == 'todos' else AREAS_POR_DIA[dia]
        for tamanho in range(1, len(areas_do_dia) + 1):
            for areas in itertools.combinations(areas_do_dia, tamanho):
                combinacoes.append((dia, list(areas)))
    return combinacoes


def gerar_correlacoes_filtros_dificuldade(df_questoes: pd.DataFrame) -> pd.DataFrame:
    """SAÍDA 5: correlação por nível de dificuldade para cada ano e cada combinação de dia × áreas.

    Mesma unidade e mesma regra de acerto da SAÍDA 4 (item = ano, área, co_item; 4 cadernos somados).
    Cada combinação gera 3 linhas (um por nível), com Holm sobre os 3 níveis daquela combinação.
    Alimenta o gráfico de colunas com filtros de dia e área (uma aba por ano).
    """
    df_com_dificuldade = cast(pd.DataFrame, df_questoes[df_questoes['dificuldade_tri'].notna()])
    df_itens = cast(pd.DataFrame, df_com_dificuldade.groupby(
        ['ano', 'area', 'co_item', 'dificuldade_tri'], as_index=False
    ).agg(
        caracteres=('caracteres', 'first'),
        n_acertos=('n_acertos', 'sum'),
        n_respostas=('n_respostas', 'sum')
    ))
    df_itens['acerto'] = df_itens['n_acertos'] / df_itens['n_respostas'] * 100

    niveis = ['facil', 'media', 'dificil']
    combinacoes = _combinacoes_filtro_dia_area()
    linhas = []

    for ano in sorted(df_itens['ano'].unique()):
        df_ano = cast(pd.DataFrame, df_itens[df_itens['ano'] == ano])
        for dia, areas in combinacoes:
            df_filtro = cast(pd.DataFrame, df_ano[df_ano['area'].isin(areas)])
            testes = []
            for nivel in niveis:
                df_nivel = cast(pd.DataFrame, df_filtro[df_filtro['dificuldade_tri'] == nivel])
                rho, p = _p_sorteio(df_nivel['caracteres'].tolist(), df_nivel['acerto'].tolist())
                testes.append((nivel, rho, p, len(df_nivel)))
            p_holm = ajustar_holm([p for _, _, p, _ in testes])
            for (nivel, rho, p_bruto, n), p_ajustado in zip(testes, p_holm):
                linhas.append({
                    'tipo_analise': 'TIPO_4_caracteres_questao_vs_acerto_filtro_dia_area_dificuldade',
                    'ano': int(ano),
                    'dia': str(dia),
                    'areas': ';'.join(areas),
                    'dificuldade': nivel,
                    'coeficiente_r': rho,
                    'p_value': p_ajustado,
                    'p_value_bruto': p_bruto,
                    'quantidade_pares': n,
                    'interpretacao': _intensidade_correlacao(rho)
                })

    df_filtros = pd.DataFrame(linhas)
    arq = OUTPUT_DIR / "retornoMVP_analise_correlacao_dificuldade_filtros.csv"
    df_filtros.to_csv(arq, index=False, encoding='utf-8')
    print(f"\n✓ {arq}")
    print(f"   {len(df_filtros)} linhas: {len(combinacoes)} filtros de dia × área por ano, 3 níveis cada (Holm sobre 3 por filtro)")
    return df_filtros


def _resumo_metades_caracteres(df_nivel):
    """Média de acerto das metades de caracteres (<= mediana e > mediana) de um nível.

    A mediana é calculada dentro do próprio nível e recorte, como no gráfico de referência.
    Devolve None se não houver itens suficientes para as duas metades.
    """
    if len(df_nivel) < 2:
        return None
    mediana = float(df_nivel['caracteres'].median())
    menos = df_nivel[df_nivel['caracteres'] <= mediana]
    mais = df_nivel[df_nivel['caracteres'] > mediana]
    if len(menos) == 0 or len(mais) == 0:
        return None
    return {
        'mediana': mediana,
        'menos': {'acerto': float(menos['acerto'].mean()), 'n': int(len(menos)),
                  'caracteres_medio': float(menos['caracteres'].mean())},
        'mais': {'acerto': float(mais['acerto'].mean()), 'n': int(len(mais)),
                 'caracteres_medio': float(mais['caracteres'].mean())},
    }


def gerar_metades_caracteres_filtros(df_questoes: pd.DataFrame) -> pd.DataFrame:
    """SAÍDA 6: média de acerto das metades de caracteres por nível, para cada ano e combinação de dia × áreas.

    Mesma unidade (item = ano, área, co_item) e mesma regra de acerto das SAÍDAS 4 e 5.
    Para cada ano, filtro e nível: a mediana de caracteres é calculada dentro do recorte
    e os itens são divididos em 'menos' (<= mediana) e 'mais' (> mediana).
    Alimenta o gráfico de comparação da porcentagem de acerto por quantidade de caracteres.
    """
    df_com_dificuldade = cast(pd.DataFrame, df_questoes[df_questoes['dificuldade_tri'].notna()])
    df_itens = cast(pd.DataFrame, df_com_dificuldade.groupby(
        ['ano', 'area', 'co_item', 'dificuldade_tri'], as_index=False
    ).agg(
        caracteres=('caracteres', 'first'),
        n_acertos=('n_acertos', 'sum'),
        n_respostas=('n_respostas', 'sum')
    ))
    df_itens['acerto'] = df_itens['n_acertos'] / df_itens['n_respostas'] * 100

    niveis = ['facil', 'media', 'dificil']
    combinacoes = _combinacoes_filtro_dia_area()
    linhas = []

    for ano in sorted(df_itens['ano'].unique()):
        df_ano = cast(pd.DataFrame, df_itens[df_itens['ano'] == ano])
        for dia, areas in combinacoes:
            df_filtro = cast(pd.DataFrame, df_ano[df_ano['area'].isin(areas)])
            for nivel in niveis:
                df_nivel = cast(pd.DataFrame, df_filtro[df_filtro['dificuldade_tri'] == nivel])
                resumo = _resumo_metades_caracteres(df_nivel)
                if resumo is None:
                    continue
                for metade in ['menos', 'mais']:
                    dados = resumo[metade]
                    linhas.append({
                        'tipo_analise': 'TIPO_5_acerto_metades_caracteres_filtro_dia_area_dificuldade',
                        'ano': int(ano),
                        'dia': str(dia),
                        'areas': ';'.join(areas),
                        'dificuldade': nivel,
                        'metade': metade,
                        'mediana_caracteres': resumo['mediana'],
                        'caracteres_medio': dados['caracteres_medio'],
                        'acerto_medio': dados['acerto'],
                        'quantidade_itens': dados['n'],
                    })

    df_metades = pd.DataFrame(linhas)
    arq = OUTPUT_DIR / "retornoMVP_analise_metades_caracteres_filtros.csv"
    df_metades.to_csv(arq, index=False, encoding='utf-8')
    print(f"\n✓ {arq}")
    print(f"   {len(df_metades)} linhas: {len(combinacoes)} filtros de dia × área por ano, 3 níveis × 2 metades cada")
    return df_metades



#========GRAFICO DISPERSAO_ITENS - dispersão caracteres × acerto por item, com curva logística e IC 95% (gerador)
_DISPERSAO_MINIMO_ITENS = 3
_DISPERSAO_MAX_ITER = 50
_Z_95 = float(stats.norm.ppf(0.975))


def _ajustar_logistica_binomial(x: np.ndarray, acertos: np.ndarray, total: np.ndarray) -> Optional[Dict[str, Any]]:
    """Regressão logística binomial (IRLS) de acertos/total em x padronizado.

    Mesmo cálculo da logística da prova enviada (frontend/src/services/logisticaProva.js):
    peso de cada item = número de respostas, IC no logit. Devolve None se não converge.
    """
    media_x = float(np.mean(x))
    desvio = float(np.std(x))
    if desvio == 0:
        return None
    z = (x - media_x) / desvio
    X = np.column_stack([np.ones_like(z), z])
    beta = np.zeros(2)
    for _ in range(_DISPERSAO_MAX_ITER):
        eta = X @ beta
        mu = 1 / (1 + np.exp(-eta))
        w = total * mu * (1 - mu)
        if np.any(w <= 0):
            return None
        grad = X.T @ (acertos - total * mu)
        info = X.T @ (X * w[:, None])
        try:
            passo = np.linalg.solve(info, grad)
        except np.linalg.LinAlgError:
            return None
        beta = beta + passo
        if np.max(np.abs(passo)) < 1e-10:
            break
    else:
        return None
    eta = X @ beta
    mu = 1 / (1 + np.exp(-eta))
    w = total * mu * (1 - mu)
    info = X.T @ (X * w[:, None])
    try:
        cov = np.linalg.inv(info)
    except np.linalg.LinAlgError:
        return None
    return {'b0': float(beta[0]), 'b1': float(beta[1]), 'media_x': media_x, 'desvio': desvio, 'cov': cov}


def _logistica_dispersao_itens(x: np.ndarray, acertos: np.ndarray, total: np.ndarray, grade: np.ndarray) -> Optional[Dict[str, Any]]:
    """Curva logística de acerto (%) com IC 95%, φ, razão de chances e p de Wald, na grade de caracteres.

    Devolve None se há menos de 3 itens, se x não varia ou se o ajuste não converge.
    """
    n = len(x)
    if n < _DISPERSAO_MINIMO_ITENS or np.ptp(x) == 0 or np.any(total <= 0) or np.any(acertos > total):
        return None
    ajuste = _ajustar_logistica_binomial(x, acertos, total)
    if ajuste is None:
        return None
    b0, b1 = ajuste['b0'], ajuste['b1']
    media_x, desvio, cov = ajuste['media_x'], ajuste['desvio'], ajuste['cov']

    z_obs = (x - media_x) / desvio
    mu_obs = 1 / (1 + np.exp(-(b0 + b1 * z_obs)))
    qui_quadrado = float(np.sum((acertos - total * mu_obs) ** 2 / (total * mu_obs * (1 - mu_obs))))
    phi = max(1.0, qui_quadrado / (n - 2)) if n > 2 else 1.0

    z_grade = (grade - media_x) / desvio
    eta = b0 + b1 * z_grade
    erro_padrao = np.sqrt(phi * (cov[0, 0] + 2 * z_grade * cov[0, 1] + z_grade ** 2 * cov[1, 1]))
    previsto = 100 / (1 + np.exp(-eta))
    ic_inferior = 100 / (1 + np.exp(-(eta - _Z_95 * erro_padrao)))
    ic_superior = 100 / (1 + np.exp(-(eta + _Z_95 * erro_padrao)))

    wald = b1 / np.sqrt(phi * cov[1, 1])
    p_wald = float(2 * (1 - stats.norm.cdf(abs(wald))))
    return {
        'razao_chances_por_100': float(np.exp(100 * b1 / desvio)),
        'p_wald': p_wald,
        'phi': float(phi),
        'n': int(n),
        'previsto': previsto,
        'ic_inferior': ic_inferior,
        'ic_superior': ic_superior,
    }


def gerar_grafico_retorno_dispersao_itens(df_questoes: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """SAÍDA 7: um ponto por item (caracteres x acerto) e a curva logística com IC 95% por ano e filtro.

    Mesma unidade (item = ano, área, co_item) e mesmo acerto das SAÍDAS 4 a 6.
    Gera dois arquivos:
      - retornoMVP_dispersao_itens.csv: um registro por item (ano, área, nível, caracteres, acertos, respostas, acerto).
      - retornoMVP_dispersao_itens_retas.csv: curva e IC 95% por ano × filtro de dia × áreas.
    O modelo é a logística binomial da prova enviada (mesmo cálculo de frontend/src/services/logisticaProva.js):
    peso de cada item = número de respostas, IC no logit, correção de dispersão φ e p pelo teste de Wald.
    Itens sem nível TRI ficam de fora.
    """
    df_com_dificuldade = cast(pd.DataFrame, df_questoes[df_questoes['dificuldade_tri'].notna()])
    df_itens = cast(pd.DataFrame, df_com_dificuldade.groupby(
        ['ano', 'area', 'co_item', 'dificuldade_tri'], as_index=False
    ).agg(
        caracteres=('caracteres', 'first'),
        n_acertos=('n_acertos', 'sum'),
        n_respostas=('n_respostas', 'sum')
    ))
    df_itens['acerto'] = df_itens['n_acertos'] / df_itens['n_respostas'] * 100

    df_pontos = df_itens.rename(columns={'dificuldade_tri': 'dificuldade'})[
        ['ano', 'area', 'co_item', 'dificuldade', 'caracteres', 'n_acertos', 'n_respostas', 'acerto']
    ].copy()
    df_pontos['ano'] = df_pontos['ano'].astype(int)
    arq_pontos = OUTPUT_DIR / "retornoMVP_dispersao_itens.csv"
    df_pontos.to_csv(arq_pontos, index=False, encoding='utf-8')
    print(f"\n✓ {arq_pontos}")
    print(f"   {len(df_pontos)} itens")

    combinacoes = _combinacoes_filtro_dia_area()
    linhas = []
    for ano in sorted(df_itens['ano'].unique()):
        df_ano = cast(pd.DataFrame, df_itens[df_itens['ano'] == ano])
        for dia, areas in combinacoes:
            df_filtro = cast(pd.DataFrame, df_ano[df_ano['area'].isin(areas)])
            if len(df_filtro) < _DISPERSAO_MINIMO_ITENS:
                continue
            x = df_filtro['caracteres'].to_numpy(dtype=float)
            acertos = df_filtro['n_acertos'].to_numpy(dtype=float)
            total = df_filtro['n_respostas'].to_numpy(dtype=float)
            grade = np.linspace(x.min(), x.max(), 50)
            curva = _logistica_dispersao_itens(x, acertos, total, grade)
            if curva is None:
                continue
            for i, cx in enumerate(grade):
                linhas.append({
                    'tipo_analise': 'TIPO_6_dispersao_itens_reta_filtro_dia_area',
                    'ano': int(ano),
                    'dia': str(dia),
                    'areas': ';'.join(areas),
                    'caracteres': float(cx),
                    'acerto_previsto': float(curva['previsto'][i]),
                    'ic_inferior': float(curva['ic_inferior'][i]),
                    'ic_superior': float(curva['ic_superior'][i]),
                    'razao_chances_por_100': curva['razao_chances_por_100'],
                    'phi': curva['phi'],
                    'p_wald': curva['p_wald'],
                    'quantidade_itens': curva['n'],
                })

    df_retas = pd.DataFrame(linhas)
    arq_retas = OUTPUT_DIR / "retornoMVP_dispersao_itens_retas.csv"
    df_retas.to_csv(arq_retas, index=False, encoding='utf-8')
    print(f"✓ {arq_retas}")
    print(f"   {len(df_retas)} linhas: 50 pontos de grade por curva")
    return df_pontos, df_retas
#=======grafico DISPERSAO_ITENS


def _intensidade_correlacao(r_valor):
    """Rótulo de intensidade pela magnitude de |rho| (escala fixa do TCC)."""
    abs_rho = abs(r_valor)
    if abs_rho < 0.20:
        return "muito fraca / desprezível"
    elif abs_rho < 0.40:
        return "fraca"
    elif abs_rho < 0.70:
        return "moderada"
    elif abs_rho < 0.90:
        return "forte"
    return "muito forte"


def _valor_numerico(valor, tipo):
    """Converte para tipo (float ou int). Devolve None se o valor estiver ausente ou for NaN."""
    if valor is None or pd.isna(valor):
        return None
    return tipo(valor)


def _extrair_valores_linha(row):
    """Extrai valores escalares de uma linha do DataFrame."""
    r_val = row.get('coeficiente_correlacao_spearman')
    pval = row.get('valor_p_significancia_estatistica')
    qtd = row.get('quantidade_pares')
    
    r_valor = _valor_numerico(r_val, float)
    pval_valor = _valor_numerico(pval, float)
    qtd_valor = _valor_numerico(qtd, int) or 0
    
    return r_valor, pval_valor, qtd_valor


def _linha_relatorio(row, r_valor, p_holm, p_bruto, qtd_valor):
    """Uma linha do CSV final. p_value é o ajustado por Holm; p_value_bruto é o do sorteio."""
    ano_valor = row.get('ano')
    return {
        'tipo_analise': row['tipo_analise_correlacao'],
        'area': row['area'],
        'ano': '' if pd.isna(ano_valor) else int(ano_valor),
        'dificuldade': 'TODAS',
        'coeficiente_r': r_valor,
        'p_value': p_holm,
        'p_value_bruto': p_bruto,
        'quantidade_pares': qtd_valor,
        'interpretacao': row['interpretacao'],
    }


def _processar_correlacoes(df_correlacoes):
    """Monta o relatório: uma linha por análise (caracteres: ano × área; tempo: dia × ano)."""
    relatorio = []
    for _, row in df_correlacoes.iterrows():
        r_valor, p_holm, qtd_valor = _extrair_valores_linha(row)
        p_bruto = _valor_numerico(row.get('valor_p_bruto'), float)
        relatorio.append(_linha_relatorio(row, r_valor, p_holm, p_bruto, qtd_valor))
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
    
    print("\n[6/6] Agregando itens e calculando correlações...")
    df_itens = agregar_itens(df_questoes)
    df_correlacoes = gerar_correlacoes_resultado(df_itens)
    
    return df_combinado, df_provas, df_questoes, df_correlacoes


def _exportar_e_exibir(relatorio, df_provas, df_questoes):
    """Exporta todos os relatórios e exibe conclusões."""
    
    #ARQUIVO 1: RESUMO POR PROVA
    arq_provas = OUTPUT_DIR / "resumo_metricas_prova.csv"
    
    # Renomear colunas para títulos mais descritivos
    df_provas_export = df_provas.rename(columns={
        'caracteres_total_cat1': 'caracteres_total_questoes',
        'tempo_leitura_cat1_min': 'tempo_leitura_questoes_min',
        'caracteres_intro_cat2': 'caracteres_intro_questoesEtextos',
        'caracteres_total_cat2': 'caracteres_total_questoesEtextos',
        'tempo_leitura_cat2_min': 'tempo_leitura_questoesEtextos_min',
    })
    df_provas_export.to_csv(arq_provas, index=False, encoding='utf-8')
    print(f"\n✓ {arq_provas}")
    print(f"   {len(df_provas)} provas com métricas de tempo e desempenho")
    
    # ARQUIVO 2: MÉTRICAS POR QUESTÃO
    arq_questoes = OUTPUT_DIR / "metricas_caracteristicas_questao.csv"
    df_questoes.to_csv(arq_questoes, index=False, encoding='utf-8')
    print(f"\n✓ {arq_questoes}")
    print(f"   {len(df_questoes)} questões com características estruturais e desempenho")
    
    # ARQUIVO 3: CORRELAÇÕES FINAIS 
    df_relatorio = pd.DataFrame(relatorio)
    arq_final = OUTPUT_DIR / "analise_impacto_desempenho.csv"
    df_relatorio.to_csv(arq_final, index=False, encoding='utf-8')
    print(f"\n✓ {arq_final}")
    print(f"   {len(df_relatorio)} análises correlacionais consolidadas")
    print("  PIPELINE CONCLUÍDO")
    print(f"\n Arquivos gerados em: {OUTPUT_DIR}")
    print("   1. resumo_metricas_prova.csv (métricas agregadas por prova)")
    print("   2. metricas_caracteristicas_questao.csv (métricas por questão)")
    print("   3. analise_impacto_desempenho.csv (correlações finais)\n")





def gerar_questoes_grafico() -> pd.DataFrame:
    """Gera tabela de TODAS as entradas de questão do JSON (sem deduplicar).

    Usada pelo gráfico 'quanto tempo demora para ler cada questão'.
    As questões 1-5 aparecem duas vezes quando existem versões em inglês e espanhol
    (campo 'idioma'), para que o eixo X mostre 1,1,2,2,...,5,5,6,...,180.
    """
    linhas = []
    for pasta_json in sorted(DADOS_JSON_DIR.iterdir()):
        if not pasta_json.is_dir():
            continue
        info = _parse_pasta_json(pasta_json.name)
        if not info:
            continue
        arquivo_json = pasta_json / f"{pasta_json.name}.json"
        if not arquivo_json.exists():
            continue

        with open(arquivo_json, 'r', encoding='utf-8') as f:
            dados = json.load(f)

        for questao in dados.get("questoes", []):
            num_questao = questao.get("questao", 0)
            metricas = analisar_questao(questao)
            linhas.append({
                'ano': info['ano'],
                'dia': info['dia'],
                'posicao_prova': num_questao,
                'idioma': questao.get('idioma', 'geral'),
                'caracteres': metricas['caracteres'],
                'tempo_leitura_min': metricas['tempo_leitura_min'],
            })

    df = pd.DataFrame(linhas)
    df = df.sort_values(by=['ano', 'dia', 'posicao_prova', 'idioma']).reset_index(drop=True)
    return df


def _exportar_questoes_grafico():
    """Exporta CSV com todas as entradas de questão (para o gráfico de tempo por questão)."""
    arq_grafico = OUTPUT_DIR / "tempo_leitura_questoes_grafico.csv"
    df_grafico = gerar_questoes_grafico()
    df_grafico.to_csv(arq_grafico, index=False, encoding='utf-8')
    print(f"\n✓ {arq_grafico}")
    print(f"   {len(df_grafico)} entradas de questão (inclui duplicatas de idioma)")



def main():
    print("  GERADOR DE MÉTRICAS: TEMPO DE LEITURA E CARACTERES × DESEMPENHO ENEM")
    
    # Carregar dados do pipeline
    df_combinado, df_provas, df_questoes, df_correlacoes = _carregar_dados_pipeline()
    
    print("  EXPORTANDO RELATÓRIOS")
    
    # Construir relatório consolidado
    relatorio = _processar_correlacoes(df_correlacoes)
    
    # Exportar e exibir conclusões
    _exportar_e_exibir(relatorio, df_provas, df_questoes)

    # Correlação por nível de dificuldade (gráfico da análise do tamanho das questões)
    gerar_correlacoes_por_dificuldade(df_questoes)

    # Correlação por dificuldade com filtros de dia e área (gráfico de colunas, uma aba por ano)
    gerar_correlacoes_filtros_dificuldade(df_questoes)

    # Acerto por metade de caracteres e nível (gráfico de barras agrupadas, uma aba por ano)
    gerar_metades_caracteres_filtros(df_questoes)

    #========GRAFICO DISPERSAO_ITENS - chamada no main
    gerar_grafico_retorno_dispersao_itens(df_questoes)
    #=======grafico DISPERSAO_ITENS

    # Exportar entradas por questão para o gráfico de tempo de leitura
    _exportar_questoes_grafico()

if __name__ == "__main__":
    main()
