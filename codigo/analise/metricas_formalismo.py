"""ENEM: análise completa de formalidade, acertos e dificuldade TRI.

Uso: python analisar_enem_completo.py --projeto "CAMINHO/TCC-DesempenhoEnem"
Opcional: --saida "CAMINHO/RESULTADOS"
Saídas: base_completa.csv e correlacoes.csv.
A base contém scores, acertos, b e status de disponibilidade.
Correlações por ano e área, com acertos em todos os itens e na amostra com b.
Análise exploratória, sem valores-p, IC ou ajuste por confundidores.
Faixas ilustrativas de score: baixo <0,40; intermediário 0,50 a 0,60; alto >0,90.
Os coeficientes agregados entre áreas e anos são apenas descritivos.
Scores concentrados perto de 1 e empates limitam a interpretação.
Uma execução substitui os dois CSVs; arquivos antigos de outras versões
na pasta de destino não são apagados automaticamente.
"""
# Bibliotecas padrão: argumentos de terminal, arquivos CSV/JSON, validação
# numérica, estatística, normalização de textos e manipulação de caminhos.
import argparse
import csv
import json
import math
import statistics as st
import unicodedata
from collections import defaultdict
from pathlib import Path

# Recorte do projeto: 2021 foi excluído por falhas na extração.
ANOS = (2020, 2022, 2023, 2024, 2025)


# Padroniza idiomas para a junção: remove espaços nas extremidades,
# converte para minúsculas e retira acentos ("Inglês" torna-se "ingles").
def normalizar(texto):
    return ''.join(c for c in unicodedata.normalize('NFD', texto.lower().strip())
                   if not unicodedata.combining(c))


# Converte a posição no caderno azul em área: Linguagens, Humanas,
# Natureza ou Matemática. Em main(), a posição já é validada entre 1 e 180.
def area(posicao):
    if 1 <= posicao <= 45:
        return 'LC'
    if posicao <= 90:
        return 'CH'
    if posicao <= 135:
        return 'CN'
    if posicao <= 180:
        return 'MT'
    raise ValueError(f'Posição inválida: {posicao}')


# Constrói os rankings usados em Spearman, preservando a ordem original
# dos registros para que cada score continue pareado com seu desfecho.
def postos(valores):
    # Empates recebem a média das posições, como exige Spearman.
    # Ordena índices, e não a lista original de valores.
    ordem = sorted(range(len(valores)), key=valores.__getitem__)
    resultado = [0.0] * len(valores)
    i = 0
    while i < len(ordem):
        # Percorre um bloco de valores iguais na lista ordenada.
        fim = i + 1
        while fim < len(ordem) and valores[ordem[fim]] == valores[ordem[i]]:
            fim += 1
        # Os postos começam em 1. O bloco ocupa de i+1 até fim (inclusive).
        # Sua média é atribuída a todos os valores empatados.
        # Exemplo: [10, 10, 30] recebe postos [1.5, 1.5, 3].
        for k in ordem[i:fim]:
            resultado[k] = (i + 1 + fim) / 2
        i = fim
    return resultado


# Pearson é calculado nos valores originais; para obter Spearman,
# a mesma função será aplicada aos postos de x e y.
def correlacao(x, y):
    # Uma série constante não permite calcular correlação. O script também
    # adota um mínimo de 3 pares. Vazio significa indisponível, não zero.
    if len(x) < 3 or len(set(x)) < 2 or len(set(y)) < 2:
        return ''
    return st.correlation(x, y)


# Exporta uma lista de dicionários: as chaves viram o cabeçalho do CSV.
def salvar_csv(caminho, linhas):
    if not linhas:
        caminho.write_text('', encoding='utf-8-sig')
        return
    # UTF-8 com BOM facilita a leitura de acentos no Excel. newline=''
    # evita linhas extras no Windows; o delimitador padrão é a vírgula.
    # O modo 'w' substitui o arquivo existente.
    with caminho.open('w', newline='', encoding='utf-8-sig') as f:
        w = csv.DictWriter(f, fieldnames=list(linhas[0]))
        w.writeheader()
        w.writerows(linhas)


def analisar_tri(projeto, base):
    """Consolida b por item e analisa a base em memória, sem CSV intermediário."""
    # Copia os registros para acrescentar TRI sem alterar a lista recebida.
    base = [dict(r) for r in base]
    # Cada chave reúne as ocorrências do mesmo item em diferentes cadernos.
    # A posição em cada caderno não participa desta segunda junção.
    itens=defaultdict(list)
    with (projeto/'outputs/ordem/desempenho_questoes_por_prova.csv').open(encoding='utf-8-sig',newline='') as f:
        for r in csv.DictReader(f):
            if int(r['ano']) in ANOS:
                # O código do item veio da tabela de referência, já associada
                # aos scores. Ano, área e idioma completam sua identificação.
                k=(r['ano'],r['area'],r['co_item'],normalizar(r['lingua_estrangeira']))
                itens[k].append(r)
    # Detecta duplicidades na base antes de acrescentar o parâmetro b.
    vistos=set()
    for r in base:
        # O leitor CSV retorna o ano como texto; convertemos o ano da base
        # para texto para que os dois lados tenham chaves idênticas.
        k=(str(r['ano']),r['area'],r['co_item'],r['lingua_estrangeira'])
        if k in vistos: raise ValueError(f'Item duplicado na base: {k}')
        vistos.add(k)
        registros=itens.get(k,[])
        # O conjunto elimina repetições de b e revela divergências.
        # Contagens de ausentes/inválidos referem-se às linhas dos cadernos.
        valores=set(); ausentes=invalidos=0
        for t in registros:
            bruto=t['parametro_b_tri'].strip()
            # Ausência não é dificuldade zero: apenas registramos a falta.
            if not bruto:
                ausentes+=1
                continue
            try:
                b=float(bruto)
                # NaN e infinitos são rejeitados mesmo sendo convertíveis
                # para float. Valores negativos de b podem ser válidos.
                if not math.isfinite(b): raise ValueError()
                valores.add(b)
            except ValueError: invalidos+=1
        # Prioridade: sem item correspondente, valor inválido, divergência,
        # ausência total de b ou ok. Um único b consistente pode ser usado
        # mesmo se outras ocorrências estiverem vazias. Um inválido bloqueia
        # o uso do item, ainda que outra ocorrência tenha b numérico.
        status=('sem_correspondencia' if not registros else 'b_invalido' if invalidos else
                'b_divergente' if len(valores)>1 else 'b_ausente' if not valores else 'ok')
        # Preserva os rótulos de dificuldade fornecidos no CSV. Eles não
        # entram nas correlações e nenhum limiar é estimado aqui.
        categorias=sorted({t['dificuldade_tri'].strip() for t in registros if t['dificuldade_tri'].strip()})
        # Acrescenta b e indicadores de cobertura ao próprio registro.
        # O item continua aparecendo uma vez, independentemente dos cadernos.
        r.update(parametro_b_tri=next(iter(valores)) if status=='ok' else '',status_tri=status,
                 dificuldade_tri=';'.join(categorias),n_linhas_tri=len(registros),
                 n_cadernos_tri=len({t['co_prova'] for t in registros}),n_b_ausentes=ausentes,n_b_invalidos=invalidos)
    # Interrompe se houver itens da tabela TRI que não pertencem à base
    # cruzada; essa situação exige revisar a cobertura dos arquivos.
    extras=set(itens)-vistos
    if extras: raise ValueError(f'Itens TRI fora da base: {sorted(extras)}')
    # Produz quatro recortes: conjunto, cada ano, cada área e ano/área.
    # "todos" identifica as dimensões agregadas.
    grupos=defaultdict(list)
    for r in base:
        for g in [('todos','todos'),(str(r['ano']),'todos'),('todos',r['area']),(str(r['ano']),r['area'])]:
            grupos[g].append(r)
    resultados=[]
    for (ano,area),todos in sorted(grupos.items()):
        # Somente status ok participa das análises que exigem b.
        # Os demais itens continuam na análise geral de taxa de acerto.
        validos=[r for r in todos if r['status_tri']=='ok']
        # Três análises por recorte: acertos em toda a base, dificuldade b
        # e acertos na mesma amostra com b. A terceira permite comparar
        # os desfechos sem mudar o conjunto de questões utilizado.
        for alvo, amostra, registros in (
                ('taxa_acerto', 'todos_itens_validos', todos),
                ('parametro_b_tri', 'itens_com_b_valido', validos),
                ('taxa_acerto', 'itens_com_b_valido', validos)):
            # Calcula separadamente para formalidade e informalidade.
            # Scores aproximadamente complementares geram resultados
            # essencialmente redundantes, com sinais opostos.
            for score in ('formal_score','informal_score'):
                x=[float(r[score]) for r in registros]; y=[float(r[alvo]) for r in registros]
                # n_base: total do recorte; n_questoes: pares usados;
                # n_excluidos: diferença entre esses tamanhos.
                # n_scores_distintos ajuda a identificar muitos empates.
                # Spearman é Pearson aplicado aos rankings.
                resultados.append(dict(ano=ano,area=area,score=score,variavel_alvo=alvo,
                    amostra=amostra,n_questoes=len(registros),n_base=len(todos),
                    n_excluidos=len(todos)-len(registros),pearson_r=correlacao(x,y),
                    spearman_rho=correlacao(postos(x),postos(y)),
                    n_scores_distintos=len(set(x)),n_alvo_distintos=len(set(y)),))
    return base, resultados


# Executa a leitura dos arquivos originais, as duas junções e a exportação.
# Não utiliza bases intermediárias nem importa outros scripts do projeto.
def main():
    # --projeto aponta para a raiz TCC-DesempenhoEnem.
    # --saida é opcional e, por padrão, fica ao lado deste script.
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--projeto', type=Path, required=True)
    parser.add_argument('--saida', type=Path, default=Path(__file__).parent / 'resultados')
    args = parser.parse_args()
    # Cria a pasta de resultados e seus pais, se necessário.
    args.saida.mkdir(parents=True, exist_ok=True)
    # itens indexa as questões dos JSONs; problemas acumula avisos
    # que serão exibidos no terminal, sem criar um arquivo de auditoria.
    itens, problemas = {}, []
    # Lê os cadernos azuis da aplicação regular, dias 1 e 2.
    for ano in ANOS:
        for dia in (1, 2):
            nome = f'enem{ano}Dia{dia}RegularAzul'
            arquivo = args.projeto / 'dados/enems_json_md' / nome / (nome + '.json')
            # Arquivo ausente gera aviso; os demais arquivos são processados.
            if not arquivo.exists():
                problemas.append(dict(origem='json', chave=nome, motivo='arquivo ausente'))
                continue
            doc = json.loads(arquivo.read_text(encoding='utf-8-sig'))
            for q in doc['questoes']:
                pos = int(q['questao'])
                # Evita associar questões fora do intervalo esperado ao dia: 
                # dia 1 contém 1 a 90; dia 2 contém 91 a 180.
                if not 1 <= pos <= 180 or (dia == 1) != (pos <= 90):
                    raise ValueError(f'Posição incompatível com dia: {arquivo}: {pos}')
                # As posições 1 a 5 se repetem para inglês e espanhol.
                # Nas demais questões, o idioma não diferencia o item.
                idioma = normalizar(q.get('idioma', '')) if pos <= 5 else ''
                # Primeira junção: ano + área + posição no azul + idioma.
                # O JSON não precisa conter o código oficial do item.
                chave = (ano, area(pos), pos, idioma)
                if chave in itens:
                    raise ValueError(f'Chave duplicada nos JSONs: {chave}')
                itens[chave] = (q, nome + '/' + arquivo.name)

    # Esta tabela fornece a posição de referência e o co_item que será
    # usado posteriormente para buscar a dificuldade na tabela TRI.
    csv_origem = args.projeto / 'outputs/qtde_acertos/tabela_qtde_de_acertos/desempenho_questoes.csv'
    # vistos detecta chaves repetidas no CSV; usados registra JSONs que
    # encontraram correspondência, mesmo que seus valores sejam inválidos.
    base, vistos, usados = [], set(), set()
    with csv_origem.open(encoding='utf-8-sig', newline='') as f:
        for r in csv.DictReader(f):
            ano = int(r['ano'])
            if ano not in ANOS:
                continue
            pos = int(r['posicao_prova_azul'])
            idioma = normalizar(r['lingua_estrangeira']) if pos <= 5 else ''
            chave = (ano, r['area'], pos, idioma)
            if chave in vistos:
                raise ValueError(f'Chave duplicada no desempenho: {chave}')
            vistos.add(chave)
            # Evita cruzamentos aproximados: só uma chave exata é aceita.
            if chave not in itens:
                problemas.append(dict(origem='csv', chave=str(chave), motivo='sem correspondência no JSON'))
                continue
            usados.add(chave)
            q, fonte = itens[chave]
            # Converte e valida scores, denominador e numerador antes
            # de calcular a taxa. Scores devem estar em [0,1], n deve ser
            # positivo e a quantidade de acertos deve estar entre 0 e n.
            try:
                formal, informal = float(q['formal_score']), float(q['informal_score'])
                n, acertos = int(r['n_respostas']), int(r['n_acertos'])
                if not (math.isfinite(formal) and math.isfinite(informal)
                        and 0 <= formal <= 1 and 0 <= informal <= 1
                        and n > 0 and 0 <= acertos <= n):
                    raise ValueError('Score ou contagem fora do domínio')
            except (KeyError, TypeError, ValueError, AssertionError):
                problemas.append(dict(origem='par', chave=str(chave), motivo='score ou contagem ausente/inválido'))
                continue
            # Regra efetivamente executada: baixo < 0,40; intermediário
            # de 0,40 a 0,90 (inclusive); alto > 0,90.
            # ATENÇÃO: o cabeçalho descreve outra faixa intermediária.
            # Mantivemos a lógica recebida; os cortes são ilustrativos
            # e não alteram as correlações, que usam scores contínuos.
            faixa = 'baixo' if formal < .4 else 'intermediario' if formal <= .9 else 'alto'
            # Uma linha por questão/idioma, com rastreabilidade ao JSON.
            # taxa_acerto usa as contagens, evitando o arredondamento
            # do percentual de acertos já presente no CSV original.
            base.append(dict(ano=ano, area=r['area'], co_item=r['co_item'],
                posicao_prova_azul=pos, lingua_estrangeira=idioma,
                formal_score=formal, informal_score=informal,
                faixa_score=faixa, n_respostas=n, n_acertos=acertos,
                taxa_acerto=acertos/n, percentual_acertos=100*acertos/n,
                json_origem=fonte))
    # JSONs sem correspondência são avisados. A causa não é inferida: 
    # por exemplo, não se presume que sejam questões anuladas.
    for chave in sorted(itens.keys() - usados):
        problemas.append(dict(origem='json', chave=str(chave), motivo='sem correspondência no CSV; causa não determinada'))
    if not base:
        raise ValueError('Nenhuma questão válida foi cruzada.')

    # A segunda junção e os cálculos recebem a base diretamente em memória.
    base_completa, resultados = analisar_tri(args.projeto, base)
    # Únicos arquivos de saída: base com TRI e tabela de correlações.
    # O status de disponibilidade de b permanece na própria base.
    salvar_csv(args.saida / 'base_completa.csv', base_completa)
    salvar_csv(args.saida / 'correlacoes.csv', resultados)
    print(f"Base completa: {len(base_completa)} itens")
    print(f"Com b válido: {sum(r['status_tri'] == 'ok' for r in base_completa)}")
    print(f"Correlações: {len(resultados)} linhas")
    for problema in problemas:
        print(f"AVISO: {problema['origem']} {problema['chave']}: {problema['motivo']}")
    print(f"Resultados salvos em: {args.saida.resolve()}")


# Executa main() ao chamar o arquivo pelo terminal. Importar o módulo
# permite reutilizar funções sem iniciar a análise automaticamente.
if __name__ == '__main__':
    main()
