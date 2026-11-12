<template>
  <div class="file-upload">
    <div class="upload-area" @drop="handleDrop" @dragover.prevent @dragenter.prevent @dragleave="isDragging = false"
      :class="{ 'is-dragging': isDragging }">
      <label for="file-input" class="sr-only">Selecione um arquivo PDF para extração</label>
      <input
        id="file-input"
        type="file"
        ref="fileInput"
        accept=".pdf"
        @change="handleFileChange"
        style="display: none"
      />

      <div class="upload-content">
        <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" role="img" aria-label="Ícone de upload">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>

        <h3>Selecione ou arraste um arquivo</h3>
        <p>Formato aceito: PDF de até 10 MB</p>
        <div class="upload-guidance">
          <p>Envie uma prova com questões numeradas (ex.: “Questão 1”) e alternativas de A a E.</p>
          <p>PDFs escaneados como imagem não são reconhecidos.</p>
        </div>
        <button @click="triggerFileInput" class="btn btn-upload">Escolher arquivo</button>
      </div>

      <div v-if="selectedFile" class="file-info">
        <div class="file-header">
          <div class="file-details">
            <p class="file-name">{{ selectedFile.name }} <span class="file-size">{{ formatFileSize(selectedFile.size) }}</span></p>
          </div>
          <button @click="removeFile" class="btn-delete" title="Remover arquivo" aria-label="Cancelar arquivo"><span aria-hidden="true">✕</span></button>
        </div>
      </div>
    </div>
    <section class="error-section" v-if="showErrorModal">
      <div class="error-box">
        <h3>{{ errorType === 'size' ? 'Arquivo muito grande' : 'Formato Inválido' }}</h3>
        <template v-if="errorType === 'size'">
          <p>O arquivo <strong>"{{ invalidFileName }}"</strong> tem <strong>{{ formatFileSize(invalidFileSize) }}</strong>, acima do limite de <strong>10 MB</strong>.</p>
          <p>Por favor, selecione um arquivo <strong>PDF</strong> de até 10 MB.</p>
        </template>
        <template v-else>
          <p>O arquivo <strong>"{{ invalidFileName }}"</strong> não é um PDF válido.</p>
          <p>Por favor, selecione apenas arquivos em formato <strong>PDF</strong>.</p>
        </template>
        <button @click="tentarNovamenteArquivo" class="btn btn-primary">Tentar novamente</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'

const store = useAnalysisStore()
const fileInput = ref(null)
const selectedFile = ref(null)
const isDragging = ref(false)
const showErrorModal = ref(false)
const invalidFileName = ref('')
const invalidFileSize = ref(0)
const errorType = ref('format')


const MAX_FILE_SIZE = 10 * 1024 * 1024

const emit = defineEmits(['file-selected'])

// Sincronizar com store ao montar
onMounted(() => {
  if (store.selectedFile) {
    selectedFile.value = store.selectedFile
  }
})

// Sincronizar quando store muda
watch(() => store.selectedFile, (newValue) => {
  selectedFile.value = newValue
}, { immediate: true })

const triggerFileInput = () => {
  // Limpa o valor para que o mesmo arquivo possa ser escolhido de novo após um erro
  fileInput.value.value = ''
  fileInput.value.click()
}

const tentarNovamenteArquivo = () => {
  closeErrorModal()
  triggerFileInput()
}

defineExpose({ triggerFileInput })

const handleFileChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    processFile(file)
  }
}

const handleDrop = (event) => {
  event.preventDefault()
  isDragging.value = false
  const file = event.dataTransfer.files[0]
  if (file) {
    processFile(file)
  }
}

// Ponto único de validação para seleção e arrastar
const processFile = (file) => {
  if (!isValidFile(file)) {
    showError(file, 'format')
  } else if (!isWithinSizeLimit(file)) {
    showError(file, 'size')
  } else {
    selectedFile.value = file
    emit('file-selected', file)
  }
}

const isValidFile = (file) => {
  const validTypes = ['application/pdf']
  return validTypes.includes(file.type)
}

const isWithinSizeLimit = (file) => {
  return file.size <= MAX_FILE_SIZE
}

const showError = (file, type) => {
  invalidFileName.value = file.name
  invalidFileSize.value = file.size
  errorType.value = type
  showErrorModal.value = true
}

const closeErrorModal = () => {
  showErrorModal.value = false
  invalidFileName.value = ''
  invalidFileSize.value = 0
  errorType.value = 'format'
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

const removeFile = () => {
  selectedFile.value = null
  emit('file-selected', null)
}
</script>

<style scoped>
.file-upload {
  width: 100%;
}

.upload-area {
  border: 2px dashed #0070C0;
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f8f9ff;
}

.upload-area:hover {
  border-color: #0056A0;
  background: #f0f2ff;
}

.upload-area.is-dragging {
  border-color: #0056A0;
  background: #e8ebff;
  transform: scale(1.02);
}

.upload-icon {
  width: 48px;
  height: 48px;
  color: #0070C0;
  margin-bottom: 1rem;
}

.upload-content h3 {
  color: #333;
  margin: 0.5rem 0;
  font-size: 1.3rem;
}

.upload-content p {
  color: #666;
  margin: 0.5rem 0;
}

.upload-guidance {
  max-width: 680px;
  margin: 1rem auto;
  color: #555;
  text-align: center;
}

.btn-upload {
  background: linear-gradient(135deg, #0070C0 0%, #10B981 100%);
  color: white;
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 600;
  margin-top: 1rem;
  transition: all 0.3s ease;
}

.btn-upload:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 112, 192, 0.5);
}

.file-info {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #ddd;
}

.file-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.file-name {
  color: #333;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-size {
  color: #999;
  font-size: 0.9rem;
  font-weight: 400;
}

.btn-delete {
  background: #ff6b6b;
  color: white;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.btn-delete:hover {
  background: #ff5252;
  transform: scale(1.1);
}

/* ERRO DE FORMATO INVÁLIDO (mesmo padrão visual do bloco "Erro ao preparar a análise") */
.error-section {
  margin-top: 1.5rem;
  border: 2px solid #ff6b6b;
  background: #fff5f5;
  border-radius: 12px;
  padding: 2rem;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-box {
  text-align: center;
}

.error-box h3 {
  color: #ff6b6b;
  margin-bottom: 0.5rem;
}

.error-box p {
  color: #d32f2f;
  margin-bottom: 1.5rem;
}

.error-box strong {
  color: #d32f2f;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease, border-color 0.3s ease;
  font-weight: 600;
}

.btn-primary {
  background: linear-gradient(135deg, #0070C0 0%, #047857 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 112, 192, 0.5);
}

/* Screen reader only: oculta visualmente mas mantem acessivel para leitores de tela */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
