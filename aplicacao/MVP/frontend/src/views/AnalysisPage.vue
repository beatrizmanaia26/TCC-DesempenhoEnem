<template>
  <div class="analysis-container">
    <header class="header">
      <h1>Análise suas provas com base no ENEM</h1>
      <p class="subtitle">Extraia métricas e análises detalhadas de arquivos PDF</p>
    </header>

    <main class="main-content">
      <!-- SEÇÃO 1: UPLOAD -->
      <section class="section upload-section" v-if="!USAR_JSON_TESTE && !isAnalyzing && !hasResults">
        <FileUpload :key="uploadKey" @file-selected="handleFileSelected" />
        <p v-if="isExtracting" class="extraction-status">Lendo o PDF para preparar os dados da análise...</p>
      </section>
      <section v-if="USAR_JSON_TESTE && isExtracting" class="section upload-section">
        <p class="extraction-status">Carregando JSON de teste...</p>
      </section>

      <!-- SEÇÃO 2: FORMULÁRIO DE ANÁLISE -->
      <section class="section form-section" v-if="selectedFile && !isAnalyzing && !hasResults && totalQuestions > 0">
        <AnalysisForm
          :file="selectedFile"
          :total-questions="totalQuestions"
          @analyze="handleAnalyze"
          @cancel="handleCancel"
          :is-loading="isFormLoading"
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
          <h3>Erro ao preparar a análise</h3>
          <p>{{ errorMessage }}</p>
          <button @click="retryExtraction" class="btn btn-primary">Tentar novamente</button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAnalysisStore } from '@/stores/analysisStore'
import FileUpload from '@/components/FileUpload.vue'
import AnalysisForm from '@/components/AnalysisForm.vue'
import ResultsDisplay from '@/components/ResultsDisplay.vue'
import { extractExamPdf } from '@/services/analysisApi'

// Ative para carregar os dados de public/json_teste/prova_teste.json sem enviar um PDF.
const USAR_JSON_TESTE = false
const CAMINHO_JSON_TESTE = '/json_teste/prova_teste.json'

// Store
const store = useAnalysisStore()
const router = useRouter()

// Estado local
const isAnalyzing = ref(false)
const isExtracting = ref(false)
const analysisProgress = ref('Iniciando...')
const progressPercentage = ref(0)
const errorMessage = ref('')
const extractionResults = ref(null)
const uploadKey = ref(0)
let extractionRequestId = 0

// Local refs para sincronizar com store
const localSelectedFile = ref(null)

// Ao montar: se a análise já foi feita nesta sessão, volta direto para a página de resultados
// (ex.: trocar de aba e voltar em "Análise"). Só lê o arquivo quando não há análise salva.
onMounted(() => {
  if (store.analysisPayload) {
    router.replace({ name: 'analysis-results' })
    return
  }
  if (USAR_JSON_TESTE) {
    iniciarModoTeste()
  } else if (store.selectedFile) {
    prepareExtraction(store.selectedFile)
  }
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
const isFormLoading = computed(() => isExtracting.value || isAnalyzing.value)

const iniciarModoTeste = () => {
  const arquivoTeste = new File([], 'prova_teste.json', { type: 'application/json' })
  localSelectedFile.value = arquivoTeste
  prepareExtraction(arquivoTeste)
}

// Handlers
const handleFileSelected = (file) => {
  extractionRequestId += 1
  store.setSelectedFile(file)
  store.setTotalQuestions(0)
  extractionResults.value = null
  errorMessage.value = ''
  store.setAnalysisPayload(null)
  if (file) {
    prepareExtraction(file)
  } else {
    isExtracting.value = false
  }
}

const prepareExtraction = async (file) => {
  const requestId = ++extractionRequestId
  isExtracting.value = true
  errorMessage.value = ''

  try {
    const extracted = USAR_JSON_TESTE
      ? await carregarJsonTeste()
      : await extractExamPdf(file)
    if (requestId !== extractionRequestId) return
    // O idioma é omitido no JSON do site, que trabalha com uma única prova.
    const questoesExtraidas = extracted.questions ?? extracted.questoes ?? []
    const questions = questoesExtraidas.map(({ idioma, ...question }) => question)
    if (questions.length === 0) {
      throw new Error(USAR_JSON_TESTE
        ? `Nenhuma questão foi encontrada em ${CAMINHO_JSON_TESTE}. Confira se o arquivo contém uma lista questions ou questoes.`
        : 'Nenhuma questão foi encontrada neste PDF. Envie a prova do ENEM em PDF (não o relatório de análises).')
    }
    extractionResults.value = {
      fileName: extracted.fileName ?? file?.name ?? 'prova_teste.json',
      questions,
      textos_introdutorios: extracted.textos_introdutorios ?? []
    }
    store.setTotalQuestions(questions.length)
  } catch (error) {
    if (requestId !== extractionRequestId) return
    errorMessage.value = error.message || (USAR_JSON_TESTE ? 'Erro ao ler o JSON de teste.' : 'Erro ao ler o PDF.')
  } finally {
    if (requestId === extractionRequestId) isExtracting.value = false
  }
}

const carregarJsonTeste = async () => {
  const response = await fetch(CAMINHO_JSON_TESTE)
  if (!response.ok) {
    throw new Error(`Não foi possível carregar ${CAMINHO_JSON_TESTE}. Coloque o JSON de teste nesse caminho.`)
  }
  try {
    return await response.json()
  } catch {
    throw new Error(`O arquivo ${CAMINHO_JSON_TESTE} não contém um JSON válido.`)
  }
}

const handleAnalyze = async (formValues) => {
  if (!extractionResults.value || isExtracting.value) return
  isAnalyzing.value = true
  errorMessage.value = ''
  progressPercentage.value = 0
  analysisProgress.value = 'Preparando os dados da prova...'

  try {
    progressPercentage.value = 25
    analysisProgress.value = 'Organizando questões e parâmetros...'

    // O submit do AnalysisForm salva o estado no Pinia antes de emitir o evento.
    // `hours`/`minutes` guardam a duração; `analysisType` escolhe o recorte;
    // `readingSpeedMode`/`customReadingSpeed` definem a velocidade de leitura.
    // `useDifficultyAnalysis`/`questionDifficulties` e os campos de estudantes
    // enriquecem as questões no JSON final.
    const analysisConfig = {
      ...store.formData,
      ...formValues,
      useDifficultyAnalysis: store.formData.useDifficultyAnalysis
    }

    // Os seletores usam a posição sequencial da questão na lista extraída (1, 2, 3...).
    const questions = extractionResults.value.questions.map((question, index) => {
      const formIndex = String(index + 1)
      const enrichedQuestion = { ...question }
      if (analysisConfig.useDifficultyAnalysis) {
        enrichedQuestion.dificuldade = analysisConfig.questionDifficulties?.[formIndex] ?? null
      }
      if (analysisConfig.includeStudentMetrics) {
        const correctCount = Number(analysisConfig.studentMetricsAccuracy?.[formIndex] || 0)
        enrichedQuestion.acertos = correctCount
        enrichedQuestion.total_estudantes = Number(analysisConfig.studentCount || 0)
        enrichedQuestion.taxa_acerto_percentual = analysisConfig.studentCount
          ? Number(((correctCount / analysisConfig.studentCount) * 100).toFixed(2))
          : null
      }
      return enrichedQuestion
    })

    progressPercentage.value = 75
    analysisProgress.value = 'Abrindo a tela de resultados...'
    store.setAnalysisConfig(analysisConfig)
    // analysisPayload reúne nome, textos introdutórios, questões enriquecidas e inputs.
    store.setAnalysisPayload({
      fileName: extractionResults.value.fileName,
      textos_introdutorios: extractionResults.value.textos_introdutorios,
      questions,
      config: analysisConfig
    })

    progressPercentage.value = 100
    analysisProgress.value = 'Concluído!'
    await router.push({ name: 'analysis-results' })
  } catch (error) {
    console.error('Erro ao preparar análise:', error)
    errorMessage.value = error.message || 'Não foi possível abrir os resultados.'
    isAnalyzing.value = false
  } finally {
    if (router.currentRoute.value.name !== 'analysis-results') isAnalyzing.value = false
  }
}

const handleCancel = () => {
  extractionRequestId += 1
  isExtracting.value = false
  store.resetFileAndForm()
  extractionResults.value = null
  errorMessage.value = ''
  uploadKey.value += 1
  if (USAR_JSON_TESTE) iniciarModoTeste()
}

const handleReset = () => {
  store.clearResults()
  store.resetFileAndForm()
  extractionResults.value = null
  errorMessage.value = ''
  uploadKey.value += 1
  if (USAR_JSON_TESTE) iniciarModoTeste()
}

const retryExtraction = () => {
  if (selectedFile.value) prepareExtraction(selectedFile.value)
}
</script>

<style scoped>
.analysis-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #E0F2FE 0%, #F0F9FF 100%);
  padding: 2rem;
}

.header {
  text-align: center;
  color: #0070C0;
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

.extraction-status {
  margin-top: 1rem;
  color: #0070C0;
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
  border-top: 4px solid #0070C0;
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
  background: linear-gradient(90deg, #0070C0 0%, #10B981 100%);
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
