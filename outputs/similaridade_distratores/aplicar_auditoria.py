from pathlib import Path
import re
import pandas as pd


RAIZ = Path(r"C:\Users\Nuno\Downloads\TCCDistratores")

ANOS = [2020, 2022, 2023, 2024, 2025]

ARQUIVO_AUDITORIA = RAIZ / "auditoria_similaridades.txt"
ARQUIVO_SAIDA = RAIZ / "similaridades_auditadas.csv"


# ============================================================
# LER AUDITORIA MANUAL
# ============================================================

texto = ARQUIVO_AUDITORIA.read_text(encoding="utf-8")

padrao_bloco = re.compile(
    r"(?P<ano>\d{4}) \| "
    r"(?P<arquivo>.+?) \| QUESTÃO "
    r"(?P<questao>\d+) \| "
    r"(?P<idioma>[^\r\n]+)"
    r".*?"
    r"DECISÃO:\s*(?P<decisao>[^\r\n]+)",
    re.DOTALL
)

registros_auditoria = []

for match in padrao_bloco.finditer(texto):

    decisao = match.group("decisao")

    if "[X] EXCLUIR" in decisao:

        registros_auditoria.append({
            "ano": int(match.group("ano")),
            "arquivo": match.group("arquivo").strip(),
            "questao": int(match.group("questao")),
            "idioma": match.group("idioma").strip(),
        })


exclusoes = pd.DataFrame(registros_auditoria)

print("=== AUDITORIA ===")
print(f"Ocorrências marcadas para exclusão: {len(exclusoes)}")

if exclusoes.empty:
    raise ValueError(
        "Nenhuma ocorrência marcada como EXCLUIR foi encontrada."
    )

if exclusoes.duplicated(
    ["ano", "arquivo", "questao", "idioma"]
).any():
    raise ValueError(
        "Existem exclusões duplicadas no arquivo de auditoria."
    )


# ============================================================
# CARREGAR SIMILARIDADES ORIGINAIS
# ============================================================

dfs = []

for ano in ANOS:

    caminho = (
        RAIZ
        / "ResultadosTCC"
        / str(ano)
        / f"similaridade_alternativas_{ano}.csv"
    )

    df = pd.read_csv(
        caminho,
        sep=";",
        encoding="utf-8-sig"
    )

    df["ano"] = ano

    dfs.append(df)


similaridades = pd.concat(
    dfs,
    ignore_index=True
)

print(f"Similaridades originais: {len(similaridades)}")


# ============================================================
# MARCAR EXCLUSÕES
# ============================================================

chaves = [
    "ano",
    "arquivo",
    "questao",
    "idioma"
]

resultado = similaridades.merge(
    exclusoes.assign(_excluir=True),
    on=chaves,
    how="left",
    validate="one_to_one"
)


encontradas = resultado["_excluir"].fillna(False).sum()

print(f"Exclusões localizadas na base: {encontradas}")


# Validação importantíssima
if encontradas != len(exclusoes):

    faltantes = exclusoes.merge(
        similaridades[chaves],
        on=chaves,
        how="left",
        indicator=True
    )

    faltantes = faltantes[
        faltantes["_merge"] == "left_only"
    ]

    print("\nEXCLUSÕES NÃO ENCONTRADAS:")
    print(
        faltantes[chaves]
        .to_string(index=False)
    )

    raise ValueError(
        "Nem todas as exclusões da auditoria "
        "foram encontradas na base."
    )


# ============================================================
# REMOVER
# ============================================================

auditadas = resultado[
    resultado["_excluir"] != True
].copy()

auditadas.drop(
    columns="_excluir",
    inplace=True
)


# ============================================================
# VALIDAÇÕES
# ============================================================

esperado = (
    len(similaridades)
    - len(exclusoes)
)

if len(auditadas) != esperado:

    raise ValueError(
        "Quantidade final inesperada."
    )


# garante que nenhuma exclusão permaneceu
teste = auditadas.merge(
    exclusoes,
    on=chaves,
    how="inner"
)

if not teste.empty:

    raise ValueError(
        "Alguma questão excluída permaneceu na base."
    )


# ============================================================
# SALVAR
# ============================================================

auditadas.to_csv(
    ARQUIVO_SAIDA,
    sep=";",
    index=False,
    encoding="utf-8-sig"
)


print("\n=== RESULTADO ===")
print(f"Antes:      {len(similaridades)}")
print(f"Excluídas:  {len(exclusoes)}")
print(f"Depois:     {len(auditadas)}")

print(
    "\nQuestões restantes por ano:"
)

print(
    auditadas
    .groupby("ano")
    .size()
    .to_string()
)

print(
    f"\nArquivo salvo em:\n"
    f"{ARQUIVO_SAIDA}"
)

print("\nSUCESSO.")