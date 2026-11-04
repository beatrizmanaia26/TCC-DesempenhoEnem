<template>
  <div class="enem-container">
    <div class="container">
      <div class="cabecalho-pagina">
        <div class="topo-acoes" ref="menuExportarRef">
          <button
            type="button"
            class="btn-exportar"
            :disabled="!selectedYear || exportando"
            :aria-expanded="menuExportarAberto ? 'true' : 'false'"
            aria-haspopup="menu"
            :title="selectedYear ? 'Exportar os dados do ENEM ' + selectedYear : 'Selecione um ano para exportar'"
            @click="menuExportarAberto = !menuExportarAberto"
          >
            <svg class="icone-exportar" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            {{ exportando ? 'Exportando...' : 'Exportar' }}
          </button>
          <ul v-if="menuExportarAberto" class="menu-exportar" role="menu">
            <li v-for="opcao in opcoesExportacao" :key="opcao.formato" role="none">
              <button type="button" class="item-exportar" role="menuitem" @click="escolherExportacao(opcao.formato)">
                <ArquivoIcon :formato="opcao.formato" class="icone-arquivo" />
                Exportar em {{ opcao.nome }}
              </button>
            </li>
          </ul>
        </div>
        <h1 class="page-title">

          Análises do ENEM
          <InfoIcon
            warning
            :tooltip="'O ENEM 2021 não está nas análises porque os dados não puderam ser extraídos: o arquivo da prova estava corrompido.'"
          />
        </h1>
      </div>
      <p class="page-subtitle">Explore as análises estruturais das provas do ENEM para identificar o impacto de fatores como tempo, formalismo, presença de imagens, tamanho do texto, distratores e posição das questões no desempenho do exame.</p>

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
            <button class="filter-btn" @click="alternarMenuFiltro">
              <FilterIcon />
              Filtro
            </button>
            <div v-if="showFilterMenu" class="filter-menu">
              <div class="filter-option filter-todos">
                <input
                  type="checkbox"
                  id="filter-selecionar-tudo"
                  :checked="todasMarcadas"
                  :indeterminate.prop="algumaMarcada"
                  @change="alternarTodosFiltros"
                />
                <label for="filter-selecionar-tudo">Selecionar tudo</label>
              </div>
              <div class="filter-option" v-for="option in filterOptions" :key="option.id">
                <input 
                  type="checkbox" 
                  :id="option.id"
                  :checked="isFilterSelected(option.id)"
                  @change="toggleFilter(option.id)"
                />
                <label :for="option.id">{{ option.label }}</label>
              </div>
              <div class="filter-rodape">
                <button type="button" class="filter-aplicar" @click="aplicarFiltros">Aplicar</button>
              </div>
            </div>
          </div>
        </div>
        <ProvaInfoDisplay :ano="selectedYear" />
        <template v-if="selectedFilters.has('reading-time')">
          <ResumoTempoProva ref="resumoRef" :ano="selectedYear" />
          <GraficoTempoLeitura ref="graficoTempoRef" :ano="selectedYear" />
        </template>
        <template v-if="selectedFilters.has('word-count')">
          <PalavrasQuestoesGrafico ref="graficoPalavrasRef" :ano="selectedYear" />
          <MapaCalorCorrelacoes />
          <CorrelacaoDificuldadeMapa />
          <CorrelacaoMetadesCaracteres :ano="selectedYear" />
          <!-- ========GRAFICO DISPERSAO_ITENS - uso na página -->
          <CorrelacaoDispersaoItens :ano="selectedYear" />
          <!-- =======grafico DISPERSAO_ITENS -->
        </template>
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { exportarAnalises, analisesSelecionadas } from '@/services/exportacaoEnem.js'
import { capturarCartoesCorrelacao } from '@/services/capturaCorrelacoes.js'
import FilterIcon from '@/components/icons/FilterIcon.vue'
import ProvaInfoDisplay from '@/components/ProvaInfoDisplay.vue'
import GraficoTempoLeitura from '@/components/GraficoTempoLeitura.vue'
import ResumoTempoProva from '@/components/ResumoTempoProva.vue'
import MapaCalorCorrelacoes from '@/components/MapaCalorCorrelacoes.vue'
import CorrelacaoDificuldadeMapa from '@/components/CorrelacaoDificuldadeMapa.vue'
import CorrelacaoMetadesCaracteres from '@/components/CorrelacaoMetadesCaracteres.vue'
// ========GRAFICO DISPERSAO_ITENS - import
import CorrelacaoDispersaoItens from '@/components/CorrelacaoDispersaoItens.vue'
// =======grafico DISPERSAO_ITENS
import PalavrasQuestoesGrafico from '@/components/PalavrasQuestoesGrafico.vue'
import InfoIcon from '@/components/icons/InfoIcon.vue'
import ArquivoIcon from '@/components/icons/ArquivoIcon.vue'
import http from '@/services/http.js'

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
// Todas as análises marcadas: é o padrão ao escolher um ano
const todasAnalises = filterOptions.map((option) => option.id)

// Filtros aplicados (valem só depois de clicar em Aplicar)
const selectedFilters = ref(new Set(todasAnalises))
// Rascunho: muda enquanto o usuário marca as opções
const rascunhoFiltros = ref(new Set(todasAnalises))

// Ao escolher um ano, todas as análises ficam selecionadas e aplicadas
const selectYear = (year) => {
  selectedYear.value = year
  selectedFilters.value = new Set(todasAnalises)
  rascunhoFiltros.value = new Set(todasAnalises)
  showFilterMenu.value = false
}

// Abrir o menu copia o aplicado para o rascunho; fechar sem aplicar descarta as mudanças
const alternarMenuFiltro = () => {
  if (!showFilterMenu.value) {
    rascunhoFiltros.value = new Set(selectedFilters.value)
  }
  showFilterMenu.value = !showFilterMenu.value
}

const aplicarFiltros = () => {
  selectedFilters.value = new Set(rascunhoFiltros.value)
  showFilterMenu.value = false
}

// Estado do "Selecionar tudo" no rascunho: marcado, parcial (traço) ou desmarcado
const todasMarcadas = computed(() => rascunhoFiltros.value.size === todasAnalises.length)
const algumaMarcada = computed(() => rascunhoFiltros.value.size > 0 && !todasMarcadas.value)

// Se estiver tudo marcado, desmarca tudo; caso contrário, marca tudo. Só vale após Aplicar
const alternarTodosFiltros = () => {
  rascunhoFiltros.value = todasMarcadas.value ? new Set() : new Set(todasAnalises)
}

const toggleFilter = (filterId) => {
  if (rascunhoFiltros.value.has(filterId)) {
    rascunhoFiltros.value.delete(filterId)
  } else {
    rascunhoFiltros.value.add(filterId)
  }
}

const isFilterSelected = (filterId) => {
  return rascunhoFiltros.value.has(filterId)
}

// Exportar: junta os dados que a tela ja mostra para o ano selecionado
const exportando = ref(false)
const menuExportarAberto = ref(false)
const menuExportarRef = ref(null)
const resumoRef = ref(null)
const graficoTempoRef = ref(null)
const graficoPalavrasRef = ref(null)

const opcoesExportacao = [
  { formato: 'pdf', rotulo: 'PDF', nome: 'PDF' },
  { formato: 'xlsx', rotulo: 'XLS', nome: 'Excel' },
  { formato: 'csv', rotulo: 'CSV', nome: 'CSV' }
]

// Fecha o menu ao clicar fora dele
const fecharMenuAoClicarFora = (evento) => {
  if (menuExportarRef.value && !menuExportarRef.value.contains(evento.target)) {
    menuExportarAberto.value = false
  }
}

onMounted(() => document.addEventListener('click', fecharMenuAoClicarFora))
onBeforeUnmount(() => document.removeEventListener('click', fecharMenuAoClicarFora))

const escolherExportacao = async (formato) => {
  menuExportarAberto.value = false
  if (!selectedYear.value || exportando.value) return
  exportando.value = true
  try {
    const ano = selectedYear.value
    const [resumo, tempo, palavras] = await Promise.all([
      http.get('/metricas/tempo-resumo', { params: { ano } }),
      http.get('/metricas/tempo-leitura-questoes', { params: { ano } }),
      http.get('/metricas/palavras-questoes', { params: { ano } })
    ])

    // Os cartões de correlação só são fotografados ao exportar PDF, na tela atual (filtro e página)
    const cartoes = formato === 'pdf' ? await capturarCartoesCorrelacao() : []

    await exportarAnalises(
      formato,
      ano,
      {
        resumo: resumo.data,
        tempo: tempo.data,
        palavras: palavras.data
      },
      {
        resumo: resumoRef.value?.obterFiltros(),
        tempo: graficoTempoRef.value?.obterFiltros(),
        palavras: graficoPalavrasRef.value?.obterFiltros()
      },
      analisesSelecionadas(selectedFilters.value),
      cartoes
    )
  } catch (erro) {
    console.error('Erro ao exportar dados:', erro)
    alert('Não foi possível exportar os dados deste ano. Tente novamente.')
  } finally {
    exportando.value = false
  }
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

.cabecalho-pagina {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  margin-bottom: 0.5rem;
}

.cabecalho-pagina .page-title {
  grid-column: 2;
  grid-row: 1;
  margin: 0;
}

.topo-acoes {
  display: flex;
  justify-content: flex-end;
  grid-column: 3;
  grid-row: 1;
  position: relative;
}

.btn-exportar {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  color: #0070C0;
  border: 2px solid #0070C0;
  padding: 0.6rem 1.25rem;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.btn-exportar:hover:not(:disabled) {
  background: #0070C0;
  color: white;
}

.topo-acoes {
  position: relative;
}

.menu-exportar {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  z-index: 10;
  list-style: none;
  margin: 0;
  padding: 0.5rem;
  min-width: 240px;
  background: white;
  border: 2px solid #0070C0;
  border-radius: 8px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.item-exportar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.6rem 0.75rem;
  background: none;
  border: none;
  border-radius: 6px;
  color: #0070C0;
  font-size: 1rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.item-exportar:hover,
.item-exportar:focus-visible {
  background: #E0F2FE;
  outline: none;
}

.icone-arquivo {
  flex-shrink: 0;
}

.btn-exportar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icone-exportar {
  width: 18px;
  height: 18px;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
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
  transition: transform 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease, border-color 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  border: 3px solid transparent;
}

.year-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.year-card.active {
  background: linear-gradient(135deg, #0070C0 0%, #047857 100%);
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

.placeholder {
  background: white;
  border-radius: 12px;
  padding: 3rem;
  text-align: center;
  color: var(--color-neutral-gray-muted);
  font-size: 1.1rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

/* ADD CARD STYLES */
.add-card {
  background: #f0f4ff;
  border: 2px dashed #0070C0;
  opacity: 0.8;
  transition: opacity 0.3s ease, background-color 0.3s ease;
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
  background: linear-gradient(135deg, #0070C0 0%, #047857 100%);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  width: 100%;
}

.btn-upload-file:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 112, 192, 0.5);
}

@media (prefers-reduced-motion: no-preference) {
  .btn-upload-file {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
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
  transition: background-color 0.3s ease;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-primary {
  background: linear-gradient(135deg, #0070C0 0%, #047857 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (prefers-reduced-motion: no-preference) {
  .btn-primary {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
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
  transition: background-color 0.3s ease;
  white-space: nowrap;
}

.filter-btn:hover {
  background: #f0f7ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 112, 192, 0.2);
}

@media (prefers-reduced-motion: no-preference) {
  .filter-btn {
    transition: background-color 0.3s ease, transform 0.3s ease;
  }
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

.filter-rodape {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e0e0e0;
}

.filter-aplicar {
  background: #0070C0;
  color: white;
  border: none;
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.3s ease;
}

.filter-aplicar:hover {
  background: #005a9e;
}

.filter-todos {
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid #e0e0e0;
}


@media (max-width: 768px) {
  .cabecalho-pagina {
    grid-template-columns: 1fr;
  }

  .cabecalho-pagina .page-title {
    grid-column: 1;
    grid-row: 1;
  }

  .topo-acoes {
    grid-column: 1;
    grid-row: 2;
    justify-content: center;
    margin: 0.5rem 0 1rem;
  }

  .page-title {
    font-size: 1.8rem;
  }

  .page-subtitle {
    font-size: 1rem;
  }

  .years-grid {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }
}
</style>

