<template>
  <div class="analysis-container">
    <header class="header">
      <h1>Análise suas provas com base no ENEM</h1>
      <p class="subtitle">Extraia métricas e análises detalhadas de arquivos PDF</p>
    </header>

    <main class="main-content">
      <!-- SEÇÃO 1: UPLOAD -->
      <section class="section upload-section" v-if="!isAnalyzing && !hasResults">
        <FileUpload @file-selected="handleFileSelected" />
      </section>

      <!-- SEÇÃO 2: FORMULÁRIO DE ANÁLISE -->
      <section class="section form-section" v-if="selectedFile && !isAnalyzing && !hasResults">
        <AnalysisForm
          :file="selectedFile"
          :total-questions="totalQuestions"
          @analyze="handleAnalyze"
          @cancel="handleCancel"
          :is-loading="isAnalyzing"
        />
      </section>

      <!-- SEÇÃO 3: LOADING -->
      <section class="section loading-section" v-if="isAnalyzing">
        <div class="loading-container">
          <div class="spinner"></div>
          <h2>Analisando arquivo...</h2>
          <p>{{ analysisProgress }}</p>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
          </div>
        </div>
      </section>

      <!-- SEÇÃO 4: RESULTADOS -->
      <section class="section results-section" v-if="hasResults && !isAnalyzing">
        <div class="results-header">
          <h2>📈 Resultados da Análise</h2>
          <button @click="handleReset" class="btn btn-secondary">Realizar nova análise</button>
        </div>
        <ResultsDisplay :results="analysisResults" />
      </section>

      <!-- SEÇÃO 5: ERRO -->
      <section class="section error-section" v-if="errorMessage">
        <div class="error-box">
          <h3>⚠️ Erro na análise</h3>
          <p>{{ errorMessage }}</p>
          <button @click="handleReset" class="btn btn-primary">Tentar novamente</button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import FileUpload from '@/components/FileUpload.vue'
import AnalysisForm from '@/components/AnalysisForm.vue'
import ResultsDisplay from '@/components/ResultsDisplay.vue'
import { uploadAndAnalyze } from '@/services/analysisApi'

// Store
const store = useAnalysisStore()

// Estado local
const isAnalyzing = ref(false)
const analysisProgress = ref('Iniciando...')
const progressPercentage = ref(0)
const errorMessage = ref('')

// Local refs para sincronizar com store
const localSelectedFile = ref(null)

// Resetar store ao montar para evitar dados antigos dispararem análise
onMounted(() => {
  store.clearResults()
  store.resetFileAndForm()
})

// Sincronizar com store
watch(() => store.selectedFile, (newValue) => {
  localSelectedFile.value = newValue
}, { immediate: true, deep: true })

// Computados - para reatividade
const selectedFile = computed(() => localSelectedFile.value)
const totalQuestions = computed(() => store.totalQuestions)
const hasResults = computed(() => store.results !== null)
const analysisResults = computed(() => store.results)

// Handlers
const handleFileSelected = (file) => {
  store.setSelectedFile(file)
  store.setTotalQuestions(0)
  errorMessage.value = ''
}

const handleAnalyze = async (analysisConfig) => {
  isAnalyzing.value = true
  errorMessage.value = ''
  progressPercentage.value = 0
  analysisProgress.value = 'Preparando arquivo...'

  try {
    progressPercentage.value = 25
    analysisProgress.value = 'Enviando arquivo...'

    const results = await uploadAndAnalyze(selectedFile.value, analysisConfig)

    progressPercentage.value = 75
    analysisProgress.value = 'Processando resultados...'

    // Use actions
    store.setResults(results)
    store.setAnalysisConfig(analysisConfig)

    progressPercentage.value = 100
    analysisProgress.value = 'Concluído!'

    selectedFile.value = null
  } catch (error) {
    console.error('Erro na análise:', error)
    errorMessage.value = error.message || 'Erro ao analisar arquivo. Tente novamente.'
  } finally {
    isAnalyzing.value = false
  }
}

const handleCancel = () => {
  store.resetFileAndForm()
}

const handleReset = () => {
  store.clearResults()
  store.resetFileAndForm()
}
</script>

<style scoped>
.analysis-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.header {
  text-align: center;
  color: white;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2.5rem;
  margin: 0 0 0.5rem 0;
  font-weight: 700;
}

.subtitle {
  font-size: 1.1rem;
  margin: 0;
  opacity: 0.9;
}

.main-content {
  max-width: 1000px;
  margin: 0 auto;
}

.section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
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

.loading-section {
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-container {
  text-align: center;
  width: 100%;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-container h2 {
  color: #333;
  margin-bottom: 0.5rem;
}

.loading-container p {
  color: #666;
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  margin-top: 1rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 1rem;
}

.results-header h2 {
  margin: 0;
  color: #333;
  font-size: 1.8rem;
}

.error-section {
  border: 2px solid #ff6b6b;
  background: #fff5f5;
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

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
  border: 2px solid #ddd;
}

.btn-secondary:hover {
  background: #e0e0e0;
  border-color: #bbb;
}

@media (max-width: 768px) {
  .header h1 {
    font-size: 1.8rem;
  }

  .section {
    padding: 1.5rem;
  }

  .results-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .results-header .btn {
    width: 100%;
  }
}
</style>

