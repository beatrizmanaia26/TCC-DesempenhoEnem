# 📚 Análise de Tempo de Leitura - `analyze_reading_time.py`

## I. OBJETIVO

Calcular quanto **tempo um candidato leva para ler cada questão do ENEM** e quanto tempo restará para resolver a prova, baseado em pesquisa científica sobre velocidade de leitura.

### Por que isso importa?
- Permite avaliar se o tempo total disponível na prova é suficiente para leitura + resolução
- Identifica se certas provas ou áreas têm questões com excesso de texto
- Fornece métricas para comparar dificuldade de leitura entre diferentes anos do ENEM

### Métrica Científica Base
- **Velocidade de leitura média:** 1.100 caracteres/minuto (Messias et al., 2008)
- **Tempo total Dia 1:** 5h30min (incluindo redação)
- **Tempo total Dia 2:** 5h00min
- **Tempo estimado redação:** 1h15min (apenas Dia 1)

---

## II. COMO FUNCIONA

### A. ENTRADA

O script recebe como entrada:
- **JSONs das provas do ENEM** localizados em `dados/enems_json_md/`
- Cada JSON contém estrutura com:
  - `questoes`: array de questões
    - `questao`: número da questão
    - `texto`: enunciado da questão
    - `alternativas`: array com opções
      - `letra`: (A, B, C, D, E)
      - `texto`: conteúdo da alternativa
  - `textos_introdutorios`: textos informativos da prova

**Exemplo de estrutura JSON:**
```json
{
  "questoes": [
    {
      "questao": 1,
      "texto": "Uma empresa produz...",
      "alternativas": [
        {"letra": "A", "texto": "10 unidades"},
        {"letra": "B", "texto": "20 unidades"}
      ]
    }
  ],
  "textos_introdutorios": ["Texto introdutório da prova..."]
}
```

---

### B. PROCESSAMENTO DO CÓDIGO

O script realiza as seguintes transformações:

#### **1. Contagem de Caracteres Efetivos**

Para cada questão, o código:
- Extrai o **texto principal** (enunciado) da questão
- Concatena **todas as alternativas** (letra + texto de cada opção)
- **Remove espaços, tabulações e quebras de linha** da contagem
- Resultado: total de **caracteres úteis** que precisam ser lidos

```python
# Exemplo de contagem:
Enunciado: "Qual é o resultado?" (17 caracteres úteis)
Alternativa A: "A) 10" (3 caracteres úteis)
Alternativa B: "B) 20" (3 caracteres úteis)
─────────────────────────────
Total: 23 caracteres
```

#### **2. Conversão em Tempo de Leitura**

Usando a fórmula científica:
```
Tempo de Leitura (min) = Total de Caracteres ÷ 1.100
```

Exemplo:
- Uma questão com **2.750 caracteres** = 2.750 ÷ 1.100 = **2,5 minutos** para ler

#### **3. Agregação por Categoria**

O script calcula **duas categorias** de análise:

**CATEGORIA 1: Apenas Questões**
- Enunciado + alternativas
- Sem textos introdutórios da prova

**CATEGORIA 2: Caderno Completo**
- Textos introdutórios + enunciado + alternativas
- Representa a experiência real do candidato

#### **4. Cálculo de Tempo Disponível para Resolver**

```
Tempo Disponível = Tempo Total - Tempo de Redação - Tempo Total de Leitura
```

Exemplo (Dia 1):
- Tempo total: 5h30min (330 min)
- Menos redação: -1h15min (75 min)
- Menos leitura: -45,8 min
- **Tempo para resolver: 209,2 minutos**

#### **5. Percentual Gasto em Leitura**

```
% Leitura = (Tempo Total Leitura ÷ Tempo Disponível) × 100
```

Exemplo:
- Tempo leitura: 45,8 min
- Tempo disponível: 254,2 min
- **% Leitura: 18%**

---

### C. SAÍDA

O script gera **4 tipos de saídas** por prova:

#### **SAÍDA 1: Tempo de Leitura por Questão**

Arquivo: `enem_[ano]_[dia]_tempo.json`

Contém análise detalhada de cada questão:
```json
{
  "questoes": [
    {
      "questao": 1,
      "categoria1_enunciado_alternativas": {
        "total_caracteres": 2750,
        "tempo_leitura_min": 2.5,
        "tempo_formatado": "2min 30s"
      },
      "categoria2_caderno_completo": {
        "total_caracteres": 3120,
        "tempo_leitura_min": 2.84,
        "tempo_formatado": "2min 50s"
      }
    }
  ]
}
```

---

#### **SAÍDA 2: Tempo Total de Leitura da Prova**

Agregação de todas as questões:

```json
{
  "provas": [
    {
      "nome": "enem_2023_dia1",
      "dia": 1,
      "opcao1_apenas_questoes": {
        "total_caracteres": 125000,
        "leitura_total_min": 113.6,
        "pct_leitura": 22.5
      },
      "opcao2_caderno_completo": {
        "total_caracteres": 128500,
        "leitura_total_min": 116.8,
        "pct_leitura": 23.1
      }
    }
  ]
}
```

---

#### **SAÍDA 3: Tempo Disponível para Resolver**

Calculado para ambas as categorias:

```json
{
  "opcao1_apenas_questoes": {
    "tempo_total_prova_min": 330,
    "tempo_leitura_min": 113.6,
    "resolucao_total_min": 216.4,
    "media_por_questao_min": 2.16
  },
  "opcao2_caderno_completo": {
    "tempo_total_prova_min": 330,
    "tempo_leitura_min": 116.8,
    "resolucao_total_min": 213.2,
    "media_por_questao_min": 2.13
  }
}
```

---

#### **SAÍDA 4: Percentual Gasto em Leitura**

Comparação entre categorias:

```json
{
  "categoria1": {
    "pct_leitura": 22.5,
    "interpretacao": "22.5% do tempo é gasto em leitura"
  },
  "categoria2": {
    "pct_leitura": 23.1,
    "interpretacao": "23.1% do tempo é gasto em leitura (com intros)"
  }
}
```

---

#### **SAÍDA EXTRA: Arquivo Markdown (.md)**

Resumo formatado para visualização:

```markdown
# ENEM 2023 - Dia 1: Análise de Tempo de Leitura

## Resumo Geral
- **Total de Questões:** 45
- **Velocidade de Leitura:** 1.100 caracteres/min

## Categoria 1: Apenas Questões
- Tempo total de leitura: **113,6 minutos** (1h53min)
- Percentual do tempo: **22,5%**
- Tempo disponível para resolver: **216,4 minutos** (3h36min)

## Categoria 2: Caderno Completo
- Tempo total de leitura: **116,8 minutos** (1h56min)
- Percentual do tempo: **23,1%**
- Tempo disponível para resolver: **213,2 minutos** (3h33min)
```

---

#### **SAÍDA COMPARATIVA: Entre Múltiplos ENEMs**

Arquivo: `resumo_comparativo.json`

```json
{
  "comparativo": [
    {
      "nome": "enem_2020_dia1",
      "opcao1_apenas_questoes": {
        "leitura_total_min": 110.2,
        "pct_leitura": 21.8
      },
      "opcao2_caderno_completo": {
        "leitura_total_min": 113.5,
        "pct_leitura": 22.5
      }
    },
    {
      "nome": "enem_2023_dia1",
      "opcao1_apenas_questoes": {
        "leitura_total_min": 113.6,
        "pct_leitura": 22.5
      },
      "opcao2_caderno_completo": {
        "leitura_total_min": 116.8,
        "pct_leitura": 23.1
      }
    }
  ]
}
```

---

## III. ESTRUTURA TÉCNICA

### Funções Principais

| Função | Entrada | Saída | Descrição |
|--------|---------|-------|-----------|
| `contar_caracteres(texto)` | String | int | Conta apenas caracteres úteis (sem espaços/tabs/quebras) |
| `tempo_leitura_minutos(caracteres)` | int | float | Converte caracteres em minutos (÷ 1.100) |
| `analisar_questao(dados)` | dict JSON | dict | Analisa uma questão individual |
| `analisar_prova(caminho)` | Path | dict | Processa toda a prova |
| `salvar_json(prova, destino)` | dict, Path | None | Salva resultado em JSON |
| `salvar_md(prova, destino)` | dict, Path | None | Gera resumo em Markdown |

---

## IV. COMO USAR

### Opção 1: Executar com valores padrão
```bash
cd /Users/beatrizmanaia/Documents/FEI/TCC/TCC-DesempenhoEnem/codigo/analise
python3 analyze_reading_time.py
```
- Input: `../../dados/enems_json_md`
- Output: `../../outputs/tempo_leitura`

### Opção 2: Especificar caminhos customizados
```bash
python3 analyze_reading_time.py /caminho/para/enems_json_md --out-dir /caminho/para/output
```

### Opção 3: Executar silenciosamente
```bash
python3 analyze_reading_time.py -s
```

---

## V. INTERPRETAÇÃO DOS RESULTADOS

### O que significam os dados?

**Se pct_leitura < 20%**
- ✅ Tempo de leitura razoável
- Candidato tem bastante tempo para resolver

**Se pct_leitura está entre 20-25%**
- ⚠️ Tempo de leitura moderado
- Candidato precisa equilibrar bem leitura e resolução

**Se pct_leitura > 25%**
- 🚨 Tempo de leitura elevado
- Prova pode ser desafiadora para candidatos com velocidade de leitura menor

### Comparação entre categorias

**Diferença Category 1 vs Category 2 > 5%**
- Textos introdutórios somam tempo significativo
- Candidato deve ter cuidado ao ler instruções

---

## VI. REQUISITOS E DEPENDÊNCIAS

- **Python:** 3.7+
- **Bibliotecas:** Nenhuma (usa apenas stdlib: json, pathlib, argparse)
- **Dados:** JSONs estruturados do ENEM

---

## VII. REFERÊNCIAS CIENTÍFICAS

- Messias et al., 2008 - Velocidade de leitura ~1.100 caracteres/minuto
- Brasil Escola - Tempo estimado para redação: 1h15min
- ENEM oficial - Tempo de prova: 5h30min (Dia 1) e 5h00min (Dia 2)

---

## VIII. EXEMPLO COMPLETO DE USO

```bash
# 1. Navegar até o diretório
cd /Users/beatrizmanaia/Documents/FEI/TCC/TCC-DesempenhoEnem/codigo/analise

# 2. Executar análise
python3 analyze_reading_time.py

# 3. Arquivos gerados em: ../../outputs/tempo_leitura/
#    - enem_2023_dia1_tempo.json
#    - enem_2023_dia1_tempo.md
#    - enem_2023_dia2_tempo.json
#    - enem_2023_dia2_tempo.md
#    - resumo_comparativo.json

# 4. Visualizar resultado
cat ../../outputs/tempo_leitura/enem_2023_dia1_tempo.md
```

---

**Última atualização:** 23/10/2026
**Status:** ✅ Pronto para MVP
