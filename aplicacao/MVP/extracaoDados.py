#programa tera 2 “partes”
#1-analise do formato com base no enem 
#2-com base na anaise  do enem, fzerem upload de provas para analisarmos elas, para isso 
#TODO
#1-extrair a ordem das questoes com base nas areas (lingugens, matematica…) mas considerando que futuramente as pessoas podem fazer upload de qqr prov n sei…
#2-se seria mlhr a gnt ver a poiscao das questoes de msneira mais generica 
#3- fazer os 2, filtras pra se for enem extrair com base nas areas e pro upload da pessoa fazer generico (pq p mjim o nosso tcc tem 2 partes: o estudo q eh com base no enem e o mvp q eh geral 

#TODO 
#extrair todos os dados de todos os enems (regular ppl todas as cores) e salvar infos em algum lugar


#deteccao de questoes no enem: ler pdf e achar onde ta escrito "QUESTAO 0....""

#pip install pdfplumber#extrai texto de forma estruturada 
import pdfplumber #extrai texto e imagens do pdf
import os #interage com so (permite ver arquivos,pastas,navegar entre diretorios...)
import re #permite usar padroes de texto (regex)

pasta = "../enems"

#modo especifico (um arquivo)
arquivo = "enem2025Dia1RegularAzul.pdf"
caminhoCompleto = os.path.join(pasta, arquivo)

print(f"\n Lendo: {arquivo}")

paginas = [] #guarda texto + info de cada pagina

with pdfplumber.open(caminhoCompleto) as pdf: #com with abre arquivo, usa como pdf, executa o bloco e fecha automaticamente
    
    for i, pagina in enumerate(pdf.pages): #percorre cada pagina do pdf
        texto = pagina.extract_text() #extrai texto da pagina

        paginas.append({
            "numero_pagina": i,
            "texto": texto if texto else "",
            "tem_imagem": bool(pagina.images)
        })

#junta todo texto
texto_total = "\n".join(p["texto"] for p in paginas)

#separa questoes
questoes = re.split(r'QUESTÃO\s+\d+', texto_total, flags=re.IGNORECASE)
questoes = [q.strip() for q in questoes if q.strip()]

# quantidade total de questões
print(f"\nTotal de questões: {len(questoes)}")

# info por questão
for i, questao in enumerate(questoes):
    numero_questao = i + 1

    qtd_palavras = len(questao.split())

    # tenta descobrir se a questão tem imagem
    tem_imagem = False
    for p in paginas:
        if questao[:100] in p["texto"]:
            if p["tem_imagem"]:
                tem_imagem = True
                break

    print(f"\nQuestão {numero_questao}")
    print(f"Quantidade de palavras: {qtd_palavras}")
    print(f"Tem imagem: {tem_imagem}")