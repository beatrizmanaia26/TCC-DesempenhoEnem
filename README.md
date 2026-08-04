# Trabalho de Conclusão de Curso - Correlação entre o formato da prova do ENEM e p desempenho dos participantes

Este repositório contém o código-fonte, a bibliografia em pdf, as provas do ENEM que serão analisadas bem como a documentação do Trabalho de Conclusão de Curso (TCC) em Ciência da Computação no Centro Universitário FEI que fiz em conjunto com [Nuno Martins Guilhermino da Silva](https://github.com/nunomgs136) e [Luana Bortko Rodrigues](https://github.com/LuaBortko) 

O objetivo principal desta pesquisa é investigar como as características estruturais e de formatação das questões do ENEM influenciam o desempenho dos candidatos. Em vez de focar apenas no conteúdo (matemática, física, etc.), o estudo analisa como a forma como a pergunta é apresentada pode tornar uma questão mais fácil ou mais difícil, independentemente do conhecimento do aluno sobre o assunto.

Também será desenvolvida uma interface que, a partir do upload de uma prova, analisa suas características estruturais e, utilizando as
correlações observadas no ENEM, estima seu nível potencial de dificuldade.

Organização interna (monday): https://rafaelaaltheman2005s-team.monday.com/boards/18399149251

## Para rodar o projeto localmente:


no terminal, instale as bibliotecas

1- PyMuPDF (pip3 install PyMuPDF 2>&1) e instalar Tesseract pelo terminal, utilizados na etapa de identificação de texto e imagens das provas em formato pdf.

2- transformers (pip3 install transformers), necessária para utilizar o modelo fine-tuned XLM-R, utilizado para detecção de formalismo multilíngue.

3 - tabulate(pip3 install tabulate), necessário para print de resultados dos distratores em tabelas de Markdown

4 - Sentence Transformer (pip3 install U- sentence_transformer ou pip install git+https://github.com/huggingface/sentence-transformers.git), necessário para poder utilizar o SBERT para comparação de similaridade semântica entre distratores