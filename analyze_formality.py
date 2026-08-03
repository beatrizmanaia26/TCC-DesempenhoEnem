"""
Análise de Formalismo de Questões do ENEM usando XLM-RoBERTa
Utiliza o modelo 's-nlp/xlmr_formality_classifier' para classificar
o texto de cada questão do ENEM como formal ou informal.

Saída: Para cada questão, gera scores de probabilidade:
  - formal_score: probabilidade de ser formal (0.0 a 1.0)
  - informal_score: probabilidade de ser informal (0.0 a 1.0)
  - classificacao: "formal" ou "informal" (baseado no maior score)

Instalação de dependências:
  pip install transformers torch
"""

import json
import os
import glob
from pathlib import Path

import torch
from transformers import XLMRobertaTokenizerFast, XLMRobertaForSequenceClassification


def load_model():
    """Carrega o tokenizer e modelo XLM-RoBERTa para classificação de formalidade."""
    tokenizer = XLMRobertaTokenizerFast.from_pretrained('s-nlp/xlmr_formality_classifier')
    model = XLMRobertaForSequenceClassification.from_pretrained('s-nlp/xlmr_formality_classifier')
    model.eval()  # Modo de inferência
    print("Modelo carregado com sucesso!")
    return tokenizer, model


def classify_formality(texts, tokenizer, model, batch_size=8):
    """
    Classifica uma lista de textos quanto à formalidade.
    
    Args:
        texts: Lista de strings para classificar
        tokenizer: Tokenizer do XLM-RoBERTa
        model: Modelo de classificação
        batch_size: Tamanho do batch para inferência, para gerenciamento de memória (valor padrão mais usado na comunidade de NLP)
    
    Returns:
        Lista de dicionários com scores de formalidade para cada texto
    """
    id2formality = {0: "formal", 1: "informal"}
    results = []
    
    # Processar em batches para eficiência de memória
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i:i + batch_size]
        
        # Tokenizar o batch
        encoding = tokenizer(
            batch_texts,
            add_special_tokens=True,
            return_token_type_ids=True,
            truncation=True,
            padding="max_length",
            max_length=512,  # Limite máximo de tokens QUE MODELO xlm-RoBERTa aceita como entrada
            return_tensors="pt",
        )
        
        # Inferência sem gradientes (mais eficiente)
        with torch.no_grad():
            output = model(**encoding)
        
        # Calcular probabilidades via softmax (converte valores brutos do modelo em probabilidade)
        probabilities = output.logits.softmax(dim=1)
        
        for text_scores in probabilities:
            scores = {id2formality[idx]: round(score.item(), 4) for idx, score in enumerate(text_scores)}
            classificacao = "formal" if scores["formal"] > scores["informal"] else "informal"
            results.append({
                "formal_score": scores["formal"],
                "informal_score": scores["informal"],
                "classificacao": classificacao
            })
    
    return results


def extract_question_text(questao):
    """
    Extrai o texto relevante de uma questão para análise de formalidade.
    Usa o campo 'texto' da questão (que contém enunciado + texto de apoio).
    """
    return questao.get("texto", "")


def process_enem_json(json_path, tokenizer, model):
    """
    Processa um arquivo JSON do ENEM e retorna análise de formalidade.
    
    Args:
        json_path: Caminho para o arquivo JSON
        tokenizer: Tokenizer do modelo
        model: Modelo de classificação
    
    Returns:
        Dicionário com resultados da análise
    """
    print(f"\nProcessando: {json_path}")
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    questoes = data.get("questoes", [])
    
    if not questoes:
        print(f"  Nenhuma questão encontrada em {json_path}")
        return None
    
    # Extrair textos das questões
    texts = []
    questoes_info = []
    
    for q in questoes:
        texto = extract_question_text(q)
        if texto.strip():
            texts.append(texto)
            questoes_info.append({
                "questao": q.get("questao"),
                "idioma": q.get("idioma", None),
                "quantidade_palavras": q.get("quantidade_palavras", None),
                "tem_imagem": q.get("tem_imagem", False)
            })
    
    print(f"  Total de questões para análise: {len(texts)}")
    
    # Classificar formalidade
    formality_results = classify_formality(texts, tokenizer, model)
    
    # Montar resultado final
    resultado_questoes = []
    for info, formality in zip(questoes_info, formality_results):
        resultado_questoes.append({
            **info,
            **formality
        })
    
    # Estatísticas gerais
    formal_count = sum(1 for r in formality_results if r["classificacao"] == "formal")
    informal_count = sum(1 for r in formality_results if r["classificacao"] == "informal")
    avg_formal_score = sum(r["formal_score"] for r in formality_results) / len(formality_results)
    avg_informal_score = sum(r["informal_score"] for r in formality_results) / len(formality_results)
    
    resultado = {
        "arquivo_origem": os.path.basename(json_path),
        "total_questoes": len(resultado_questoes),
        "estatisticas": {
            "questoes_formais": formal_count,
            "questoes_informais": informal_count,
            "percentual_formal": round(formal_count / len(resultado_questoes) * 100, 2),
            "percentual_informal": round(informal_count / len(resultado_questoes) * 100, 2),
            "media_score_formal": round(avg_formal_score, 4),
            "media_score_informal": round(avg_informal_score, 4)
        },
        "questoes": resultado_questoes
    }
    
    print(f"  Formais: {formal_count} | Informais: {informal_count}")
    print(f"  Média score formal: {avg_formal_score:.4f} | Média score informal: {avg_informal_score:.4f}")
    
    return resultado


def process_enem_json_inplace(json_path, tokenizer, model):
    """
    Processa um arquivo JSON do ENEM e adiciona os campos de formalidade
    diretamente em cada questão do JSON original.
    
    Campos adicionados em cada questão:
      - formal_score: probabilidade de ser formal (0.0 a 1.0)
      - informal_score: probabilidade de ser informal (0.0 a 1.0)
      - classificacao_formalidade: "formal" ou "informal"
    """
    print(f"\nProcessando: {json_path}")
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    questoes = data.get("questoes", [])
    
    if not questoes:
        print(f"  Nenhuma questão encontrada em {json_path}")
        return None
    
    # Extrair textos das questões
    texts = []
    valid_indices = []
    
    for idx, q in enumerate(questoes):
        texto = extract_question_text(q)
        if texto.strip():
            texts.append(texto)
            valid_indices.append(idx)
    
    print(f"  Total de questões para análise: {len(texts)}")
    
    # Classificar formalidade
    formality_results = classify_formality(texts, tokenizer, model)
    
    # Adicionar resultados diretamente nas questões do JSON original
    for idx, formality in zip(valid_indices, formality_results):
        questoes[idx]["formal_score"] = formality["formal_score"]
        questoes[idx]["informal_score"] = formality["informal_score"]
        questoes[idx]["classificacao_formalidade"] = formality["classificacao"]
    
    # Salvar o JSON original atualizado (no mesmo arquivo)
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    # Estatísticas
    formal_count = sum(1 for r in formality_results if r["classificacao"] == "formal")
    informal_count = sum(1 for r in formality_results if r["classificacao"] == "informal")
    avg_formal_score = sum(r["formal_score"] for r in formality_results) / len(formality_results)
    
    print(f"  Formais: {formal_count} | Informais: {informal_count}")
    print(f"  Média score formal: {avg_formal_score:.4f}")
    print(f"  JSON atualizado: {json_path}")
    
    return {
        "arquivo": os.path.basename(json_path),
        "total_questoes": len(texts),
        "questoes_formais": formal_count,
        "questoes_informais": informal_count,
        "media_score_formal": round(avg_formal_score, 4)
    }


def main():
    """Função principal que processa todos os JSONs do ENEM e adiciona formalidade diretamente neles."""
    
    # Diretório base dos JSONs
    base_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "enems_json_md")
    
    # Encontrar todos os arquivos JSON
    json_files = sorted(glob.glob(os.path.join(base_dir, "*", "*.json")))
    
    if not json_files:
        print("Nenhum arquivo JSON encontrado!")
        return
    
    print(f"Encontrados {len(json_files)} arquivos JSON para processar.")
    print("Os campos de formalidade serão adicionados diretamente nos JSONs originais.")
    print("=" * 60)
    
    # Carregar modelo uma única vez
    tokenizer, model = load_model()
    
    # Processar cada arquivo
    resultados = []
    
    for json_path in json_files:
        resultado = process_enem_json_inplace(json_path, tokenizer, model)
        if resultado:
            resultados.append(resultado)
    
    print("\n" + "=" * 60)
    print(f"Processamento concluído!")
    print(f"Campos adicionados em cada questão dos JSONs originais:")
    print(f"  - formal_score (0.0 a 1.0)")
    print(f"  - informal_score (0.0 a 1.0)")
    print(f"  - classificacao_formalidade ('formal' ou 'informal')")
    
    # Imprimir resumo no terminal
    print("\n RESUMO GERAL ")
    for r in resultados:
        print(f"  {r['arquivo']}: "
              f"{r['questoes_formais']} formais, "
              f"{r['questoes_informais']} informais "
              f"(média formal: {r['media_score_formal']:.4f})")


if __name__ == "__main__":
    main()
