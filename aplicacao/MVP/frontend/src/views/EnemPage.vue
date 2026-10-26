<template>
  <div class="enem-container">
    <div class="container">
      <h1 class="page-title"> Análises do ENEM</h1>
      <p class="page-subtitle">Explore as análises detalhadas das provas do ENEM disponíveis para identificar quais das caracteristicas esturturais consdieradas (formalismo, iame, distrator...pode ter tido mais influencia.. )</p>

      <!-- GRID DE ANOS -->
      <div class="years-grid">
        <div
          v-for="year in availableYears"
          :key="year"
          class="year-card"
          @click="selectYear(year)"
          :class="{ active: selectedYear === year }"
        >
          <div class="year-number">{{ year }}</div>
          <p class="year-label">ENEM {{ year }}</p>
        </div>

        <div class="year-card" v-if="false" style="display: none;">
          <div class="year-number">➕</div>
          <p class="year-label">Outro ENEM</p>
          <p class="add-description">Adicionar PDF</p>
        </div>
      </div>

      <!-- ANÁLISES DISPONÍVEIS -->
      <div v-if="selectedYear" class="analyses-section">
        <div class="analyses-header">
          <h2>Análises disponíveis para {{ selectedYear }}</h2>
          <div class="filter-wrapper">
            <button class="filter-btn" @click="showFilterMenu = !showFilterMenu">
              <FilterIcon />
              Filtro
            </button>
            <div v-if="showFilterMenu" class="filter-menu">
              <div class="filter-option" v-for="option in filterOptions" :key="option.id">
                <input 
                  type="checkbox" 
                  :id="option.id"
                  :checked="isFilterSelected(option.id)"
                  @change="toggleFilter(option.id)"
                />
                <label :for="option.id">{{ option.label }}</label>
              </div>
            </div>
          </div>
        </div>
        <ProvaInfoDisplay :ano="selectedYear" />
        <div class="analyses-grid">
          <div
            v-for="analysis in analysisTypes"
            :key="analysis.id"
            class="analysis-card"
            @click="viewAnalysis(analysis)"
          >
            <div class="analysis-icon">{{ analysis.icon }}</div>
            <h3>{{ analysis.title }}</h3>
            <p>{{ analysis.description }}</p>
            <button class="btn-view">Ver Análise →</button>
          </div>
        </div>
      </div>

      <!-- PLACEHOLDER SE NENHUM ANO SELECIONADO -->
      <div v-else class="placeholder">
        <p>Selecione um ano para ver as análises disponíveis</p>
      </div>

      <!-- Modal desativado para upload de novos ENEM -->
      <div v-if="false" style="display: none;">
        <!-- Será implementado futuramente -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import FilterIcon from '@/components/icons/FilterIcon.vue'
import ProvaInfoDisplay from '@/components/ProvaInfoDisplay.vue'

const availableYears = [2025, 2024, 2023, 2022, 2020]
const selectedYear = ref(null)
const showFilterMenu = ref(false)

const filterOptions = [
  { id: 'image', label: 'Análise da Presença de Imagens' },
  { id: 'formality', label: 'Análise do Formalismo' },
  { id: 'reading-time', label: 'Análise do Tempo de Prova' },
  { id: 'word-count', label: 'Análise do Tamanho das Questões' },
  { id: 'distractors', label: 'Análise de Distratores' },
  { id: 'position', label: 'Posição das Questões' }
]
const selectedFilters = ref(new Set())

const analysisTypes = [
  {
    id: 'position',
    icon: '.',
    title: 'Posição das Questões',
    description: 'Análise da distribuição espacial das questões ao longo da prova'
  },
  {
    id: 'image',
    icon: '.',
    title: 'Presença de Imagens',
    description: 'Análise quantitativa e qualitativa das imagens utilizadas'
  },
  {
    id: 'formality',
    icon: '.',
    title: 'Formalismo',
    description: 'Análise do nível de formalidade da linguagem utilizada'
  },
  {
    id: 'reading-time',
    icon: '.',
    title: 'Tempo de Prova',
    description: 'Estimativa de tempo necessário para resolver cada questão'
  },
  {
    id: 'word-count',
    icon: '.',
    title: 'Tamanho das Questões',
    description: 'Análise da quantidade de palavras por questão'
  },
  {
    id: 'distractors',
    icon: '.',
    title: 'Distratores',
    description: 'Análise da qualidade e similaridade dos distratores'
  }
]

const selectYear = (year) => {
  selectedYear.value = year
  showFilterMenu.value = false
}

const toggleFilter = (filterId) => {
  if (selectedFilters.value.has(filterId)) {
    selectedFilters.value.delete(filterId)
  } else {
    selectedFilters.value.add(filterId)
  }
}

const isFilterSelected = (filterId) => {
  return selectedFilters.value.has(filterId)
}

const viewAnalysis = (analysis) => {
  console.log(`Viewing ${analysis.title} for year ${selectedYear.value}`)
  // TODO: Navegar para página de resultados
}

// Modal upload
const showUploadModal = ref(false)
const fileInput = ref(null)
const selectedFile = ref(null)
const newEnemYear = ref(null)

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file && file.type === 'application/pdf') {
    selectedFile.value = file
  } else {
    alert('Por favor, selecione um arquivo PDF válido')
  }
}

const uploadNewEnem = () => {
  if (!selectedFile.value || !newEnemYear.value) {
    alert('Selecione um arquivo e um ano')
    return
  }

  console.log(`Uploading ENEM ${newEnemYear.value}:`, selectedFile.value.name)
  // TODO: Enviar para backend

  // Limpar e fechar
  selectedFile.value = null
  newEnemYear.value = null
  showUploadModal.value = false
  alert('ENEM adicionado com sucesso!')
}
</script>

<style scoped>
.enem-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #E0F2FE 0%, #F0F9FF 100%);
  padding: 3rem 2rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  color: #0070C0;
  font-size: 2.5rem;
  margin: 0 0 0.5rem 0;
  font-weight: 700;
  text-align: center;
}

.page-subtitle {
  color: #0070C0;
  font-size: 1.1rem;
  text-align: center;
  margin-bottom: 3rem;
}

.years-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 3rem;
}

.year-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  border: 3px solid transparent;
}

.year-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.year-card.active {
  background: linear-gradient(135deg, #0070C0 0%, #10B981 100%);
  color: white;
  border-color: white;
}

.year-number {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.year-label {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.year-card.active .year-label {
  color: white;
}

.analyses-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

.analyses-section h2 {
  color: #333;
  font-size: 1.8rem;
  margin: 0 0 2rem 0;
  text-align: center;
}

.analyses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.analysis-card {
  background: #f9f9f9;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.analysis-card:hover {
  border-color: #0070C0;
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.2);
  transform: translateY(-5px);
}

.analysis-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.analysis-card h3 {
  color: #333;
  font-size: 1.2rem;
  margin: 1rem 0 0.5rem 0;
}

.analysis-card p {
  color: #666;
  font-size: 0.95rem;
  line-height: 1.5;
  margin-bottom: 1.5rem;
}

.btn-view {
  background: linear-gradient(135deg, #0070C0 0%, #10B981 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-view:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
}

.placeholder {
  background: white;
  border-radius: 12px;
  padding: 3rem;
  text-align: center;
  color: #999;
  font-size: 1.1rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

/* ADD CARD STYLES */
.add-card {
  background: #f0f4ff;
  border: 2px dashed #0070C0;
  opacity: 0.8;
  transition: all 0.3s ease;
}

.add-card:hover {
  opacity: 1;
  background: #e8ebff;
  border-color: #0056A0;
  transform: scale(1.05);
}

.add-icon {
  font-size: 2.5rem;
}

.add-description {
  font-size: 0.85rem;
  color: #0070C0;
  margin: 0;
  margin-top: 0.25rem;
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
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
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
  color: #333;
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
}

.modal-body p {
  color: #555;
  margin-bottom: 1.5rem;
}

.upload-section {
  margin-bottom: 1.5rem;
}

.btn-upload-file {
  background: linear-gradient(135deg, #0070C0 0%, #10B981 100%);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  width: 100%;
}

.btn-upload-file:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 112, 192, 0.5);
}

.file-selected {
  color: #10b981;
  font-weight: 600;
  margin-top: 0.75rem;
  font-size: 0.9rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  color: #333;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #0070C0;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e0e0e0;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
  border: 1px solid #ddd;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-primary {
  background: linear-gradient(135deg, #0070C0 0%, #10B981 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}


/* FILTER STYLES */
.analyses-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.analyses-header h2 {
  margin: 0;
  flex: 1;
  min-width: 200px;
}

.filter-wrapper {
  position: relative;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  color: #0070C0;
  border: 2px solid #0070C0;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.filter-btn:hover {
  background: #f0f7ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 112, 192, 0.2);
}

.filter-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  padding: 1rem;
  margin-top: 0.5rem;
  min-width: 280px;
  z-index: 100;
  max-height: 400px;
  overflow-y: auto;
}

.filter-option {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  margin: 0.25rem 0;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.filter-option:hover {
  background: #f5f5f5;
}

.filter-option input[type="checkbox"] {
  margin-right: 0.75rem;
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #0070C0;
}

.filter-option label {
  cursor: pointer;
  margin: 0;
  font-size: 0.95rem;
  color: #333;
  flex: 1;
}


@media (max-width: 768px) {
  .page-title {
    font-size: 1.8rem;
  }

  .page-subtitle {
    font-size: 1rem;
  }

  .years-grid {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }

  .analyses-grid {
    grid-template-columns: 1fr;
  }
}
</style>

