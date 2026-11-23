import json
import mmap
import os
import sys
import warnings
from contextlib import redirect_stdout
from math import prod
from pathlib import Path

MODELO = "iara-project/e5-large-matryoshka-sts-pt"


def carregar_modelo():
    token = os.getenv("HF_TOKEN") or None
    if os.name == "nt":
        return _carregar_modelo_windows(MODELO, token)

    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(MODELO, token=token)


def calcular_matriz(modelo, textos):
    return next(calcular_matrizes(modelo, [textos]))


def calcular_matrizes(modelo, grupos_de_textos):
    textos = [texto for grupo in grupos_de_textos for texto in grupo]
    embeddings = modelo.encode(textos, batch_size=16, show_progress_bar=False)
    inicio = 0
    for grupo in grupos_de_textos:
        fim = inicio + len(grupo)
        alternativas = embeddings[inicio:fim]
        yield modelo.similarity(alternativas, alternativas)
        inicio = fim


def _mapear_pesos(caminho):
    import torch

    # O mapeamento somente leitura mantém os pesos FP32 no arquivo e evita
    # reservar no arquivo de paginação uma cópia privada de todo o checkpoint.
    with caminho.open("rb") as arquivo:
        tamanho = int.from_bytes(arquivo.read(8), "little")
        if not 0 < tamanho <= 100_000_000:
            raise ValueError("Cabeçalho safetensors inválido.")
        cabecalho = json.loads(arquivo.read(tamanho))
        dados = mmap.mmap(arquivo.fileno(), 0, access=mmap.ACCESS_READ)

    pesos = {}
    inicio_dados = 8 + tamanho
    with warnings.catch_warnings():
        # Em inferência, os parâmetros mapeados são usados somente para leitura.
        warnings.filterwarnings(
            "ignore", message="The given buffer is not writable.*", category=UserWarning
        )
        for nome, tensor in cabecalho.items():
            if nome == "__metadata__":
                continue
            inicio, fim = tensor["data_offsets"]
            forma = tensor["shape"]
            if (
                tensor["dtype"] != "F32"
                or not 0 <= inicio < fim <= len(dados) - inicio_dados
                or fim - inicio != 4 * prod(forma)
            ):
                raise ValueError(f"Peso incompatível no checkpoint: {nome}.")

            pesos[nome] = torch.frombuffer(
                dados,
                dtype=torch.float32,
                count=(fim - inicio) // 4,
                offset=inicio_dados + inicio,
            ).reshape(forma)
    return pesos


def _carregar_modelo_windows(modelo, token):
    from huggingface_hub import snapshot_download
    from huggingface_hub.errors import LocalEntryNotFoundError
    from sentence_transformers import SentenceTransformer
    from sentence_transformers.sentence_transformer.modules import Normalize, Pooling, Transformer
    from transformers import XLMRobertaModel

    class TransformerWindows(Transformer):
        def _load_model(
            self, model_name_or_path, transformer_task, config, backend, is_peft_model, **model_kwargs
        ):
            pesos = _mapear_pesos(Path(model_name_or_path) / "model.safetensors")
            return XLMRobertaModel.from_pretrained(None, config=config, state_dict=pesos, **model_kwargs)

    arquivos = [
        "modules.json",
        "config.json",
        "config_sentence_transformers.json",
        "sentence_bert_config.json",
        "model.safetensors",
        "tokenizer.json",
        "tokenizer_config.json",
        "1_Pooling/config.json",
    ]
    try:
        pasta = Path(snapshot_download(modelo, local_files_only=True))
    except LocalEntryNotFoundError:
        pasta = None
    if pasta is None or not all((pasta / arquivo).is_file() for arquivo in arquivos):
        pasta = Path(snapshot_download(modelo, token=token, allow_patterns=arquivos))

    configuracao = json.loads(
        (pasta / "config_sentence_transformers.json").read_text(encoding="utf-8")
    )
    modulos = json.loads((pasta / "modules.json").read_text(encoding="utf-8"))
    classes = {"Transformer": TransformerWindows, "Pooling": Pooling, "Normalize": Normalize}
    return SentenceTransformer(
        modules=[
            classes[modulo["type"].rsplit(".", 1)[-1]].load(str(pasta / modulo["path"]))
            for modulo in modulos
        ],
        prompts=configuracao.get("prompts"),
        default_prompt_name=configuracao.get("default_prompt_name"),
        similarity_fn_name=configuracao.get("similarity_fn_name"),
    )


def servir_questoes():
    modelo = None
    for linha in sys.stdin:
        textos = json.loads(linha)
        with redirect_stdout(sys.stderr):
            if modelo is None:
                modelo = carregar_modelo()
            matriz = None if textos is None else calcular_matriz(modelo, textos).tolist()
        print(json.dumps(matriz, allow_nan=False), flush=True)


def main():
    questoes = json.load(sys.stdin)
    matrizes = [[[None] * len(alternativas) for _ in alternativas] for alternativas in questoes]
    comparaveis = []
    grupos_de_textos = []
    for posicao, alternativas in enumerate(questoes):
        indices = [i for i, texto in enumerate(alternativas) if texto]
        if len(indices) >= 2:
            comparaveis.append((posicao, indices))
            grupos_de_textos.append([alternativas[i] for i in indices])

    with redirect_stdout(sys.stderr):
        if grupos_de_textos:
            modelo = carregar_modelo()
            valores_por_questao = calcular_matrizes(modelo, grupos_de_textos)
            for (posicao, indices), valores in zip(comparaveis, valores_por_questao, strict=True):
                matriz = matrizes[posicao]
                valores = valores.tolist()
                for linha, i in enumerate(indices):
                    for coluna, j in enumerate(indices):
                        if i != j:
                            matriz[i][j] = valores[linha][coluna]

    json.dump(matrizes, sys.stdout, allow_nan=False)


if __name__ == "__main__":
    if "--worker" in sys.argv:
        servir_questoes()
    else:
        main()
