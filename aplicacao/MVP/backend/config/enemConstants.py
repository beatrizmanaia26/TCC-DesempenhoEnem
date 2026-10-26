# Backend - Constantes centralizadas do ENEM
# Mantêm sincronização com frontend/src/config/enemConstants.js

# Velocidade de leitura padrão (caracteres por minuto)
# Referência: Messias et al., 2008
VELOCIDADE_LEITURA_CPM = 1100

# Tempo disponível por dia (em minutos)
# Dia 1 (CH, LC): 330 min - 75 min redação = 255 min
# Dia 2 (CN, MT): 300 min completos
TEMPO_DISPONIVEL_MINUTOS_POR_DIA = {
    1: 255,
    2: 300
}

# Dados por ano ENEM
ENEM_YEARS = {
    2025: {
        'ano': 2025,
        'questoes_dia1': 90,
        'questoes_dia2': 90,
        'questoes_total': 180,
        'areas_dia1': ['CH', 'LC'],  # Ciências Humanas, Linguagens e Códigos
        'areas_dia2': ['CN', 'MT']   # Ciências da Natureza, Matemática
    },
    2024: {
        'ano': 2024,
        'questoes_dia1': 90,
        'questoes_dia2': 90,
        'questoes_total': 180,
        'areas_dia1': ['CH', 'LC'],
        'areas_dia2': ['CN', 'MT']
    },
    2023: {
        'ano': 2023,
        'questoes_dia1': 90,
        'questoes_dia2': 90,
        'questoes_total': 180,
        'areas_dia1': ['CH', 'LC'],
        'areas_dia2': ['CN', 'MT']
    },
    2022: {
        'ano': 2022,
        'questoes_dia1': 90,
        'questoes_dia2': 90,
        'questoes_total': 180,
        'areas_dia1': ['CH', 'LC'],
        'areas_dia2': ['CN', 'MT']
    },
    2020: {
        'ano': 2020,
        'questoes_dia1': 90,
        'questoes_dia2': 90,
        'questoes_total': 180,
        'areas_dia1': ['CH', 'LC'],
        'areas_dia2': ['CN', 'MT']
    }
}


def formatar_duracao(minutos):
    """
    Formata duração em minutos para string legível (ex: "4h 15min")
    
    Args:
        minutos (int): Quantidade de minutos
        
    Returns:
        str: Duração formatada
    """
    horas = minutos // 60
    mins = minutos % 60
    return f"{horas}h {mins}min"


def obter_info_prova(ano):
    """
    Obtém informações formatadas da prova para um ano específico
    
    Args:
        ano (int): Ano do ENEM (ex: 2025)
        
    Returns:
        dict: Dicionário com informações formatadas da prova ou None se ano inválido
    """
    dados_ano = ENEM_YEARS.get(ano)
    
    if not dados_ano:
        print(f"Aviso: Dados do ENEM {ano} não encontrados")
        return None

    dia1 = TEMPO_DISPONIVEL_MINUTOS_POR_DIA[1]
    dia2 = TEMPO_DISPONIVEL_MINUTOS_POR_DIA[2]
    duracao_total = dia1 + dia2

    return {
        'duracao_total': formatar_duracao(duracao_total),
        'duracao_dia1': formatar_duracao(dia1),
        'duracao_dia2': formatar_duracao(dia2),
        'questoes_total': dados_ano['questoes_total'],
        'questoes_dia1': dados_ano['questoes_dia1'],
        'questoes_dia2': dados_ano['questoes_dia2'],
        'velocidade_leitura': VELOCIDADE_LEITURA_CPM,
        'areas_dia1': ', '.join(dados_ano['areas_dia1']),
        'areas_dia2': ', '.join(dados_ano['areas_dia2'])
    }


def eh_ano_valido(ano):
    """
    Valida se um ano é um ENEM válido
    
    Args:
        ano (int): Ano a validar
        
    Returns:
        bool: True se ano é válido, False caso contrário
    """
    return ano in ENEM_YEARS
