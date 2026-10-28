# Backend - Constantes centralizadas do ENEM
# Mantêm sincronização com frontend/src/config/enemConstants.js

# Velocidade de leitura padrão (caracteres por minuto)
# Referência: Messias et al., 2008
VELOCIDADE_LEITURA_CPM = 1100

# Tempo total da prova por dia (em minutos)
# Dia 1 (CH, LC): 5h30min (330 min)
# Dia 2 (CN, MT): 5h (300 min)
TEMPO_TOTAL_PROVA = {
    1: 330,  # Dia 1: 5h30min
    2: 300   # Dia 2: 5h00min
}

# Tempo reservado para redação (apenas no Dia 1)
# 1h15min (75 minutos)
TEMPO_REDACAO = 75

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
