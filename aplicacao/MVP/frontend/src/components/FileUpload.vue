<template>
  <div class="file-upload">
    <div class="upload-area" @drop="handleDrop" @dragover.prevent @dragenter.prevent @dragleave="isDragging = false"
      :class="{ 'is-dragging': isDragging }">
      <input type="file" ref="fileInput" accept=".pdf,.json" @change="handleFileChange" style="display: none" />

      <div class="upload-content">
        <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>

        <h3>Selecione ou arraste um arquivo</h3>
        <p>Formato aceito: PDF de até xxxx </p>
        <button @click="triggerFileInput" class="btn btn-upload">Escolher arquivo</button>
      </div>

      <div v-if="selectedFile" class="file-info">
        <div class="file-header">
          <div class="file-details">
            <p class="file-name">{{ selectedFile.name }} <span class="file-size">{{ formatFileSize(selectedFile.size) }}</span></p>
          </div>
          <button @click="removeFile" class="btn-delete" title="Remover arquivo">✕</button>
        </div>
      </div>
    </div>

    <!-- Modal de Erro -->
    <div v-if="showErrorModal" class="modal-overlay" @click="closeErrorModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Formato Inválido</h3>
          <button @click="closeErrorModal" class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <p>O arquivo <strong>"{{ invalidFileName }}"</strong> não é um PDF válido.</p>
          <p>Por favor, selecione apenas arquivos em formato <strong>PDF</strong>.</p>
        </div>
        <div class="modal-footer">
          <button @click="closeErrorModal" class="btn-confirm">Entendido</button>
        </div>
      </div>
    </div>
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
  fileInput.value.click()
}

const handleFileChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    if (isValidFile(file)) {
      selectedFile.value = file
      emit('file-selected', file)
    } else {
      showError(file.name)
    }
  }
}

const handleDrop = (event) => {
  event.preventDefault()
  isDragging.value = false
  const file = event.dataTransfer.files[0]
  if (file) {
    if (isValidFile(file)) {
      selectedFile.value = file
      emit('file-selected', file)
    } else {
      showError(file.name)
    }
  }
}

const isValidFile = (file) => {
  const validTypes = ['application/pdf']
  return validTypes.includes(file.type)
}

const showError = (fileName) => {
  invalidFileName.value = fileName
  showErrorModal.value = true
}

const closeErrorModal = () => {
  showErrorModal.value = false
  invalidFileName.value = ''
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
  border: 2px dashed #667eea;
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f8f9ff;
}

.upload-area:hover {
  border-color: #764ba2;
  background: #f0f2ff;
}

.upload-area.is-dragging {
  border-color: #764ba2;
  background: #e8ebff;
  transform: scale(1.02);
}

.upload-icon {
  width: 48px;
  height: 48px;
  color: #667eea;
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

.btn-upload {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
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

/* MODAL STYLES */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  width: 90%;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
  margin: 0;
  color: #ff6b6b;
  font-size: 1.2rem;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
  transition: color 0.3s ease;
}

.modal-close:hover {
  color: #333;
}

.modal-body {
  padding: 1.5rem;
  color: #555;
  line-height: 1.6;
}

.modal-body p {
  margin: 0.75rem 0;
}

.modal-body strong {
  color: #333;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e0e0e0;
  text-align: right;
}

.btn-confirm {
  background: #667eea;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-confirm:hover {
  background: #764ba2;
  transform: translateY(-2px);
}
</style>
