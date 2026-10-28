#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""

RODAR: python3 /Users/beatrizmanaia/Documents/FEI/TCC/TCC-DesempenhoEnem/codigo/analise/metricas_tempo.py


✓ MÉTRICA 1: TEMPO DE LEITURA (CATEGORIA 1 vs CATEGORIA 2)
  CATEGORIA 1: Apenas questões (enunciado + 5 alternativas)
  CATEGORIA 2: Caderno completo (questões + textos introdutórios/explicativos)
  Cálculo: tempo_leitura_minutos = Σ(caracteres) / 1100 caracteres_por_minuto

✓ MÉTRICA 2: TEMPO DE RESOLUÇÃO DISPONÍVEL
  Fórmula: tempo_resolucao_minutos = tempo_disponivel - tempo_leitura_minutos
  Dia 1: 255 minutos (5h30min - 1h15min para redação)
  Dia 2: 300 minutos (5h)


✓ MÉTRICA 4: CARACTERÍSTICAS ESTRUTURAIS (POR QUESTÃO)
  - Quantidade de caracteres: enunciado + 5 alternativas
  - Quantidade de palavras: contagem de tokens
  - Posição na prova: 1-45
  - Tempo de leitura individual: caracteres / 1100

✓ MÉTRICA 5: DESEMPENHO
  - Porcentagem de acerto: percentual (%)
  - Quantidade de respondentes: candidatos que fizeram questão
  - Classificação de dificuldade: fácil/média/difícil

✓ 4 TIPOS DE ANÁLISE DE CORRELAÇÃO (SPEARMAN - correlação por ranks não-paramétrica):
  TIPO 1: tempo_leitura_categoria1 vs porcentagem_acerto (por prova, POR ÁREA)  ESTRATIFICADO
  TIPO 2: tempo_leitura_categoria2 vs porcentagem_acerto (por prova, POR ÁREA)  ESTRATIFICADO
  TIPO 4: quantidade_caracteres vs porcentagem_acerto (por questão, estratificado por dificuldade)
   - Dia 1: Carrega JSON Dia 1, depois filtra LC (Q1-45) ou CH (Q46-90)
   - Dia 2: Carrega JSON Dia 2, depois filtra CN (Q91-135) ou MT (Q136-180)
   - Resultado: CH ≠ LC (características diferentes), CN ≠ MT (características diferentes)

FILTROS APLICADOS:
  ✓ Período: 2020-2025, excluindo 2021 (conforme solicitado)
  ✓ Sem filtro de estado (coluna não disponível no CSV)
  ✓ Considera TODAS as cores/versões de prova (CSV já contém dados integrados)

SAÍDAS GERADAS:
  1. resumo_metricas_prova.csv 
  2. metricas_caracteristicas_questao.csv 
  3. analise_correlacoes_resultado.csv 
"""


import json
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, cast, Union
from scipy import stats
import warnings
warnings.filterwarnings('ignore')
import sys
# Raiz do repositório no sys.path: permite rodar como script OU como módulo (-m)
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
# Importar as funções já corretas do analyze_reading_time.py (pacote a partir da raiz do repo)
from codigo.analise.analyze_reading_time import (
    contar_caracteres,
    tempo_leitura_minutos,
    analisar_questao,
    analisar_textos_introdutorios,
    TEMPO_DISPONIVEL_MINUTOS_POR_DIA
)

REPO_ROOT = Path("/Users/beatrizmanaia/Documents/FEI/TCC/TCC-DesempenhoEnem")
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

# Nota: contar_caracteres e tempo_leitura_minutos estão importadas de analyze_reading_time.py

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

def calcular_percentual_tempo_gasto_leitura(tempo_leitura_min: float, dia: int) -> float:
    """MÉTRICA: Percentual de tempo GASTO em leitura
     Calcula que PORCENTAGEM do tempo total é consumida com leitura.
    
    Fórmula: (tempo_leitura / tempo_disponível) × 100
    
    Resultado: 0% a 100%
    - 5% = apenas 5% do tempo em leitura (BAIXA PRESSÃO) BOM
    - 15% = 15% do tempo em leitura (MÉDIA PRESSÃO)
    - 40% = 40% do tempo em leitura (ALTA PRESSÃO) RUIM
    
    Hipótese: MAIOR % tempo em leitura → PIOR desempenho
    Correlação esperada com acerto: r < -0.6 (NEGATIVA FORTE)
    """
    tempo_disponivel = TEMPO_DISPONIVEL_MINUTOS_POR_DIA[dia]
    return (tempo_leitura_min / tempo_disponivel) * 100

def extrair_metricas_questao_json(questao_json: Dict[str, Any]) -> Dict[str, int]:
    """Extrai CARACTERES de UMA questão (CATEGORIA 1: Enunciado + 5 Alternativas)
    
    Retorna: dict com 'caracteres' (int)
     Concatena enunciado + LETRAS + textos das 5 alternativas
    
    Estrutura JSON:
    ├─ "texto": "Enunciado da questão..."  ← Campo enunciado
    └─ "alternativas": [
         {"letra": "A", "texto": "Alternativa A..."},
         {"letra": "B", "texto": "Alternativa B..."},
         ...
       ]  ← Campo alternativas separadas
    
    Fórmula CATEGORIA_1:
    caracteres_total = len(texto_enunciado) + Σ(len(letra) + len(texto_alternativa))
    
    Apenas caracteres são necessários porque a velocidade de leitura
    é calculada em caracteres/minuto (não em palavras/minuto).
    """
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

def _extrair_questoes_categoria_1(dados: Dict[str, Any], dia: int, area: str) -> Tuple[Any, ...]:
    """Extrai características das questões (CATEGORIA 1 = Enunciado + 5 Alternativas).
    
     Filtra questões por NÚMERO (campo "questao" do JSON)
    - Dia 1, Area LC: Questões 1-45 (45 questões de Linguagens)
    - Dia 1, Area CH: Questões 46-90 (45 questões de Ciências Humanas)
    - Dia 2, Area CN: Questões 91-135 (45 questões de Ciências Naturais)
    - Dia 2, Area MT: Questões 136-180 (45 questões de Matemática)
    
    Pode haver questões duplicadas no JSON (especialmente questões 1-5 por serem de ingles e espanhol)
    Usamos dict para manter apenas PRIMEIRA ocorrência de cada número
    
    Reutiliza analisar_questao() de analyze_reading_time.py que:
    Concatena ENUNCIADO + LETRAS + TEXTOS das alternativas
    Usa contar_caracteres() que exclui espaços/tabs/quebras
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
            print(f"⚠️  Erro em {nome_pasta}: {e}")
    
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
    
    colunas_criticas = ['co_item', 'posicao_prova', 'parametro_b_tri',
                       'n_respostas', 'n_acertos', 'percentual_acertos']
    df_filtrado = df_filtrado.dropna(subset=colunas_criticas)
    print(f"✓ Após remover NULLs: {len(df_filtrado)} linhas")
    
    if 'dificuldade_tri' not in df_filtrado.columns:
        # Nulos de parametro_b_tri já foram removidos por dropna acima,
        # então aqui b_tri nunca é nulo.
        def classificar_dificuldade(b_tri):
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
    """SAÍDA 1: Resumo por Prova (~40 linhas)
    
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
    """SAÍDA 2: Métricas por Questão (~1800 linhas)
    
    Usa caracteres INDIVIDUAIS de cada questão, não o total da prova
    """
    df_questoes = cast(pd.DataFrame, df_combinado[[
        'ano', 'dia', 'area', 'co_prova', 'posicao',
        'caracteres_questao_individual',
        'porcentagem_acerto_questao', 'dificuldade_tri'
    ]].copy())
    
    df_questoes = cast(pd.DataFrame, df_questoes.rename(columns={
        'caracteres_questao_individual': 'caracteres',
    }))
    
    df_questoes = cast(pd.DataFrame, df_questoes.sort_values(
        ['ano', 'dia', 'area', 'co_prova', 'posicao']
    ).reset_index(drop=True))
    
    print(f"✓ Métricas por Questão: {len(df_questoes)} linhas")
    return df_questoes

def calcular_correlacao_spearman(x: List[float], y: List[float]) -> Dict[str, Any]:
    """Calcula correlação de Spearman entre X e Y (correlação não-paramétrica por ranks)"""
    dados_validos = [(xi, yi) for xi, yi in zip(x, y)
                    if pd.notna(xi) and pd.notna(yi) and
                    not np.isinf(xi) and not np.isinf(yi)]
    
    if len(dados_validos) < 3:
        return {'coeficiente_correlacao_spearman': np.nan, 'valor_p_significancia_estatistica': np.nan, 'quantidade_pares': len(dados_validos),
                'interpretacao': 'Dados insuficientes'}
    
    x_v = [d[0] for d in dados_validos]
    y_v = [d[1] for d in dados_validos]
    
    try:
        result = stats.spearmanr(x_v, y_v)
        # Usar indexação de tupla - SpearmanRResult suporta __getitem__
        rho = float(cast(Any, result[0]))
        p = float(cast(Any, result[1]))
    except (ValueError, ZeroDivisionError, RuntimeError) as e:
        print(f" Erro ao calcular correlação: {e}")
        return {'coeficiente_correlacao_spearman': np.nan, 'valor_p_significancia_estatistica': np.nan, 'quantidade_pares': len(dados_validos),
                'interpretacao': 'Erro no cálculo'}
    
    abs_rho = abs(rho)
    # Classificação conforme critérios de Guilford/Mukaka (estatística convencional)
    if abs_rho < 0.20: intens = "muito fraca / desprezível"
    elif abs_rho < 0.40: intens = "fraca"
    elif abs_rho < 0.70: intens = "moderada"
    elif abs_rho < 0.90: intens = "forte"
    else: intens = "muito forte"
    
    direcao = "positiva" if rho > 0 else "negativa"
    signif = "sig(p<0.05)" if p < 0.05 else "n_sig"
    
    return {
        'coeficiente_correlacao_spearman': rho, 'valor_p_significancia_estatistica': p, 'quantidade_pares': len(dados_validos),
        'interpretacao': f"{intens} {direcao}, {signif}"
    }

def gerar_correlacoes_resultado(df_questoes: pd.DataFrame, df_provas: pd.DataFrame) -> pd.DataFrame:
    """SAÍDA 3: Correlações Resultado com estratificação por ÁREA (controla confundidor)"""
    correlacoes = []
    
    # TIPO 1 ESTRATIFICADO POR ÁREA (controla confundidor ÁREA)
    for area in ['CH', 'LC', 'CN', 'MT']:
        df_area = cast(pd.DataFrame, df_provas[df_provas['area'] == area])
        if len(df_area) < 3:
            continue
        
        r = calcular_correlacao_spearman(df_area['tempo_leitura_cat1_min'].tolist(),
                                        df_area['porcentagem_acerto_media_prova'].tolist())
        correlacoes.append({
            'tipo_analise_correlacao': 'TIPO_1_tempo_leitura_categoria1_vs_desempenho',
            'nivel': 'por_prova', 'dificuldade': 'TODAS', 'area': area,
            'coeficiente_correlacao_spearman': r['coeficiente_correlacao_spearman'], 'valor_p_significancia_estatistica': r['valor_p_significancia_estatistica'], 'quantidade_pares': r['quantidade_pares'],
            'interpretacao': r['interpretacao']
        })
    
    # TIPO 2 ESTRATIFICADO POR ÁREA (controla confundidor ÁREA)
    for area in ['CH', 'LC', 'CN', 'MT']:
        df_area = cast(pd.DataFrame, df_provas[df_provas['area'] == area])
        if len(df_area) < 3:
            continue
        
        r = calcular_correlacao_spearman(df_area['tempo_leitura_cat2_min'].tolist(),
                                        df_area['porcentagem_acerto_media_prova'].tolist())
        correlacoes.append({
            'tipo_analise_correlacao': 'TIPO_2_tempo_leitura_categoria2_vs_desempenho',
            'nivel': 'por_prova', 'dificuldade': 'TODAS', 'area': area,
            'coeficiente_correlacao_spearman': r['coeficiente_correlacao_spearman'], 'valor_p_significancia_estatistica': r['valor_p_significancia_estatistica'], 'quantidade_pares': r['quantidade_pares'],
            'interpretacao': r['interpretacao']
        })
    
    # TIPO 4 & 5: Estratificado por dificuldade
    for dif in ['facil', 'media', 'dificil']:
        df_d = cast(pd.DataFrame, df_questoes[df_questoes['dificuldade_tri'] == dif])
        if len(df_d) < 3:
            continue
        
        # TIPO 4: Caracteres vs Taxa_acerto
        # (Caracteres é proxy para complexidade da questão que impacta tempo de leitura)
        r = calcular_correlacao_spearman(df_d['caracteres'].tolist(),
                                       df_d['porcentagem_acerto_questao'].tolist())
        correlacoes.append({
            'tipo_analise_correlacao': 'TIPO_4_quantidade_caracteres_vs_desempenho',
            'nivel': 'por_questao', 'dificuldade': dif, 'area': 'TODAS',
            'coeficiente_correlacao_spearman': r['coeficiente_correlacao_spearman'], 'valor_p_significancia_estatistica': r['valor_p_significancia_estatistica'], 'quantidade_pares': r['quantidade_pares'],
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


def _calcular_diferenca_caracteres(df_questoes, dif, impacta, r_valor):
    """Calcula diferença de acerto entre questões com menos vs mais caracteres.
    """
    df_dif = cast(pd.DataFrame, df_questoes[df_questoes['dificuldade_tri'] == dif])
    
    if len(df_dif) == 0:
        return "Dados insuficientes", "Dados insuficientes"
    
    mediana = df_dif['caracteres'].median()
    menos = df_dif[df_dif['caracteres'] <= mediana]['porcentagem_acerto_questao'].mean()
    mais = df_dif[df_dif['caracteres'] > mediana]['porcentagem_acerto_questao'].mean()
    diff = mais - menos
    
    ref_dados = f"Menos: {menos:.1f}% | Mais: {mais:.1f}% (+{diff:.1f}%)"
    
    sentido = "positiva" if r_valor > 0 else "negativa"
    intensidade = _intensidade_correlacao(r_valor)
    conclusao = (f"Correlação {sentido} {intensidade} (rho={r_valor:.3f}); "
                 f"diferença entre metades por caracteres: {diff:+.1f} p.p.")
    
    return ref_dados, conclusao


def _construir_entrada_tipo_1_3(tipo_label, area, r_valor, pval_valor, qtd_valor):
    """Constrói entrada do relatório para TIPOS 1, 2, 3.
    
    CRITÉRIOS PARA "IMPACTA = SIM" (3 métricas):
    coeficiente_r: abs(r) > 0.70 (correlação FORTE conforme Guilford/Mukaka)
    p_value: p < 0.05 (estatisticamente significativo)
    quantidade_pares: n >= 20 (amostra adequada)
    """
    # Critério 3: Verifica as 3 condições logicamente
    tem_r = r_valor is not None and not np.isnan(r_valor) if isinstance(r_valor, float) else r_valor is not None
    tem_p = pval_valor is not None and not np.isnan(pval_valor) if isinstance(pval_valor, float) else pval_valor is not None
    tem_n = qtd_valor is not None and qtd_valor >= 20
    
    r_forte = tem_r and abs(r_valor) > 0.70
    p_sig = tem_p and pval_valor < 0.05
    
    impacta = 'SIM' if (r_forte and p_sig and tem_n) else 'NÃO'
    
    # Construir conclusão mais informativa
    if not tem_r or not tem_p:
        conclusao = 'Dados insuficientes'
    elif not tem_n:
        conclusao = f'Amostra pequena (n={qtd_valor})'
    elif not r_forte:
        sentido = 'positiva' if r_valor > 0 else 'negativa'
        conclusao = (f'Correlação {sentido} {_intensidade_correlacao(r_valor)} '
                     f'(r={r_valor:.3f}); não atinge o critério de |r| > 0,70')
    elif not p_sig:
        conclusao = f'Não significativo (p={pval_valor:.4f})'
    else:
        conclusao = 'Impacta significativamente'
    
    ref_dados = f"r={r_valor:.3f}, p={pval_valor:.4f}, n={qtd_valor}" if tem_r and tem_p else "Dados insuficientes"
    
    return {
        'tipo_analise': tipo_label,
        'area': area,
        'dificuldade': 'TODAS',
        'coeficiente_r': r_valor if r_valor else '',
        'p_value': pval_valor if pval_valor else '',
        'impacta': impacta,
        'conclusao': conclusao,
        'referencia_dados': ref_dados,
        'quantidade_pares': qtd_valor
    }


def _construir_entrada_tipo_4(dif, r_valor, pval_valor, qtd_valor, ref_dados, conclusao):
    """Constrói entrada do relatório para TIPO 4.
    
    CRITÉRIOS PARA "IMPACTA = SIM" (3 métricas):
    coeficiente_r: abs(r) > 0.70 (correlação FORTE conforme Guilford/Mukaka)
    p_value: p < 0.05 (estatisticamente significativo)
    quantidade_pares: n >= 20 (amostra adequada)
    """
    # Verifica as 3 condições logicamente
    tem_r = r_valor is not None and not np.isnan(r_valor) if isinstance(r_valor, float) else r_valor is not None
    tem_p = pval_valor is not None and not np.isnan(pval_valor) if isinstance(pval_valor, float) else pval_valor is not None
    tem_n = qtd_valor is not None and qtd_valor >= 20
    
    r_forte = tem_r and abs(r_valor) > 0.70
    p_sig = tem_p and pval_valor < 0.05
    
    impacta = 'SIM' if (r_forte and p_sig and tem_n) else 'NÃO'
    
    return {
        'tipo_analise': 'Quantidade de Caracteres',
        'area': 'TODAS',
        'dificuldade': str(dif).upper(),
        'coeficiente_r': r_valor if r_valor else '',
        'p_value': pval_valor if pval_valor else '',
        'impacta': impacta,
        'conclusao': conclusao,
        'referencia_dados': ref_dados,
        'quantidade_pares': qtd_valor
    }


def _extrair_valores_linha(row):
    """Extrai valores escalares de uma linha do DataFrame."""
    r_val = row.get('coeficiente_correlacao_spearman')
    pval = row.get('valor_p_significancia_estatistica')
    qtd = row.get('quantidade_pares')
    
    r_valor = _extrair_valor_escalar(r_val, tipo_esperado=float)
    pval_valor = _extrair_valor_escalar(pval, tipo_esperado=float)
    qtd_valor = _extrair_valor_escalar(qtd, tipo_esperado=int) or 0
    
    return r_valor, pval_valor, qtd_valor


def _processar_tipos_1_2_3(df_correlacoes):
    """Processa TIPOS 1 e 2 do relatório."""
    relatorio = []
    tipos_info = [
        ('TIPO_1', 'Tempo Leitura (Questões)'),
        ('TIPO_2', 'Tempo Leitura (Questões + Textos)')
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
        # Calcular impacta baseado no critério r_forte > 0.70
        tem_r = r_valor is not None and not np.isnan(r_valor) if isinstance(r_valor, float) else r_valor is not None
        tem_p = pval_valor is not None and not np.isnan(pval_valor) if isinstance(pval_valor, float) else pval_valor is not None
        tem_n = qtd_valor is not None and qtd_valor >= 20
        r_forte = tem_r and abs(r_valor) > 0.70
        p_sig = tem_p and pval_valor < 0.05
        impacta = 'SIM' if (r_forte and p_sig and tem_n) else 'NÃO'
        
        ref_dados, conclusao = _calcular_diferenca_caracteres(df_questoes, dif, impacta, r_valor)
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


def _extrair_valor_escalar(valor, tipo_esperado=float):
    """Extrai valor escalar de forma segura, evitando problemas com Series/NDArray.
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
    print("  GERADOR DE MÉTRICAS: IMPACTO DO TEMPO NO DESEMPENHO ENEM")
    
    # Carregar dados do pipeline
    df_combinado, df_provas, df_questoes, df_correlacoes = _carregar_dados_pipeline()
    
    print("  EXPORTANDO RELATÓRIOS")
    
    # Construir relatório consolidado
    relatorio = []
    relatorio.extend(_processar_tipos_1_2_3(df_correlacoes))
    relatorio.extend(_processar_tipo_4(df_correlacoes, df_questoes))
    
    # Exportar e exibir conclusões
    _exportar_e_exibir(relatorio, df_provas, df_questoes)

    # Exportar entradas por questão para o gráfico de tempo de leitura
    _exportar_questoes_grafico()

if __name__ == "__main__":
    main()
