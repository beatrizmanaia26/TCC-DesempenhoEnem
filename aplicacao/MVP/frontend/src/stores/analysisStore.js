import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAnalysisStore = defineStore('analysis', () => {
  // State
  const results = ref(null)
  const analysisConfig = ref(null)
  const analysisHistory = ref([])
  const currentAnalysisId = ref(null)
  
  // NOVO: Estado persistente para arquivo e formulário
  const selectedFile = ref(null)
  const totalQuestions = ref(0)
  const formData = ref({
    useDifficultyAnalysis: false,
    readingTimeAnalysis: false,
    distractorsAnalysis: false,
    questionDifficulties: {},
    estimatedReadingTime: 0
  })

  // Getters (implícitos com ref)
  const hasResults = () => results.value !== null
  const getTotalQuestions = () => results.value?.totalQuestions || 0

  // Actions
  function setResults(newResults) {
    results.value = newResults
    if (newResults?.id) {
      currentAnalysisId.value = newResults.id
      // Adicionar ao histórico
      analysisHistory.value.unshift({
        id: newResults.id,
        timestamp: new Date().toISOString(),
        config: analysisConfig.value,
        results: newResults
      })
    }
  }

  function setAnalysisConfig(config) {
    analysisConfig.value = config
  }

  // NOVO: Ações para persistir arquivo e formulário
  function setSelectedFile(file) {
    selectedFile.value = file
  }

  function setTotalQuestions(qty) {
    totalQuestions.value = qty
  }

  function setFormData(data) {
    formData.value = { ...formData.value, ...data }
  }

  function resetFileAndForm() {
    selectedFile.value = null
    totalQuestions.value = 0
    formData.value = {
      useDifficultyAnalysis: false,
      readingTimeAnalysis: false,
      distractorsAnalysis: false,
      questionDifficulties: {},
      estimatedReadingTime: 0
    }
  }

  function clearResults() {
    results.value = null
    analysisConfig.value = null
    currentAnalysisId.value = null
  }

  function getHistoryItem(id) {
    return analysisHistory.value.find(item => item.id === id)
  }

  function deleteHistoryItem(id) {
    const index = analysisHistory.value.findIndex(item => item.id === id)
    if (index > -1) {
      analysisHistory.value.splice(index, 1)
    }
  }

  function clearHistory() {
    analysisHistory.value = []
  }

  return {
    // State
    results,
    analysisConfig,
    analysisHistory,
    currentAnalysisId,
    selectedFile,
    totalQuestions,
    formData,
    // Getters
    hasResults,
    getTotalQuestions,
    // Actions
    setResults,
    setAnalysisConfig,
    setSelectedFile,
    setTotalQuestions,
    setFormData,
    resetFileAndForm,
    clearResults,
    getHistoryItem,
    deleteHistoryItem,
    clearHistory
  }
})
