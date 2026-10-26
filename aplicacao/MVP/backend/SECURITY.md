# Configuracoes de Seguranca

## Limites de Arquivo (S5693)

### Tamanho Maximo: 10 MB
- **Racional**: Arquivos de prova ENEM em PDF tipicamente variam de 2-5 MB
- **Margem de seguranca**: 10 MB = 2x o tamanho tipico maximo
- **Protecao contra**: Ataques DoS via upload de arquivos grandes
- **Aplicavel a**: fileSize e contentLength

### Justificativa Tecnica
- PDFs de provas: ~2-5 MB
- JSONs de dados: ~1-2 MB
- Limite de 10 MB oferece margem sem permitir abuso

### Configuracao
\`\`\`javascript
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
limits: { 
  fileSize: MAX_FILE_SIZE,
  contentLength: MAX_FILE_SIZE
}
\`\`\`

## PATH Variable (S4036)

- Usa caminho absoluto: /usr/bin/python3
- Configuravel via PYTHON_PATH env var
- Valida: caminho absoluto + sem ..
- Verifica: existencia do executavel

## Framework Security (S5689)

- Desabilita header X-Powered-By
- Oculta versao do framework
- Reduz surface de ataque
