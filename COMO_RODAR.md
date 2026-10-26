# 📊 COMO RODAR A APLICAÇÃO MVP

## ⚙️ PASSO 1: Instalar dependências do Frontend

```bash
cd /Users/beatrizmanaia/Documents/FEI/TCC/TCC-DesempenhoEnem/aplicacao/MVP/frontend
npm install
```

## ⚙️ PASSO 2: Rodar o Frontend (Vite dev server)

```bash
npm run dev
```

A aplicação estará disponível em: **http://localhost:5173**

## 🎯 TESTANDO A INTERFACE

1. **Abrir a página**: http://localhost:5173
2. **Upload de arquivo**: Clique em "Escolher arquivo" e selecione qualquer PDF ou JSON
3. **Configurar análise**: 
   - Selecione o tipo de análise
   - Defina o tipo de prova
   - Marque as opções que desejar
4. **Iniciar análise**: Clique no botão "Iniciar Análise"
5. **Ver resultados**: Após 2 segundos, você verá os resultados com dados mock

## 📁 ESTRUTURA CRIADA

```
frontend/src/
├── views/
│   └── AnalysisPage.vue          
├── components/
│   ├── FileUpload.vue           
│   ├── AnalysisForm.vue        
│   └── ResultsDisplay.vue        
├── services/
│   └── analysisApi.js            
├── stores/
│   └── analysisStore.js          
└── App.vue                        
```

## 🔧 PRÓXIMOS PASSOS

### Opção A: Usar backend (futura)
- Backend Node.js está parcialmente criado
- Precisaria instalar dependências: `npm install multer uuid`
- Rodar: `npm run dev`
- Ajustar `.env` do frontend para usar API real

### Opção B: Continuar com mock data (MVP)
- Funciona 100% no frontend
- Sem dependências de backend
- Perfeito para apresentação/prototipagem

## ❓ DÚVIDAS?

Se houver erro, verifique:
- Node.js versão >= 18: `node --version`
- npm >= 9: `npm --version`
