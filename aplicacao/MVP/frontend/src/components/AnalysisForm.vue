<template>
  <div class="analysis-form">
    <h2>Informe os dados de sua prova</h2>

    <form @submit.prevent="submitForm">
      <!-- PRIMEIRA LINHA: TIPO E DURAÇÃO -->
      <div class="form-row">
        <div class="form-group">
          <label for="analysisType">
            Escolha qual tipo de análise deseja realizar
            <span class="required">*</span>
          </label>
          <div class="analysis-type-dropdown" ref="dropdownTiposRef">
            <button
              type="button"
              id="analysisType"
              class="analysis-type-trigger"
              aria-haspopup="true"
              :aria-expanded="menuTiposAberto ? 'true' : 'false'"
              @click="menuTiposAberto = !menuTiposAberto"
            >
              {{ resumoTiposAnalise }}
            </button>
            <div v-if="menuTiposAberto" class="analysis-type-menu">
              <div class="analysis-type-option analysis-type-todos">
                <input
                  type="checkbox"
                  id="analysis-type-selecionar-tudo"
                  :checked="todosTiposSelecionados"
                  :indeterminate.prop="algunsTiposSelecionados"
                  @change="alternarTodosTipos"
                />
                <label for="analysis-type-selecionar-tudo">Selecionar tudo</label>
              </div>
              <div class="analysis-type-option" v-for="opcao in ANALYSIS_TYPE_OPTIONS" :key="opcao.value">
                <input
                  type="checkbox"
                  :id="'analysis-type-' + opcao.value"
                  :value="opcao.value"
                  v-model="formData.analysisTypes"
                />
                <label :for="'analysis-type-' + opcao.value">{{ opcao.label }}</label>
              </div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="duration">
            Informe a duração total da prova
            <span class="required">*</span>
          </label>
          <div class="time-input-container">
            <div class="time-group">
              <label for="hours">Horas</label>
              <input v-model.number="formData.hours" id="hours" type="number" min="0" max="23" placeholder="00" />
            </div>
            <span class="time-separator">:</span>
            <div class="time-group">
              <label for="minutes">Minutos</label>
              <input v-model.number="formData.minutes" id="minutes" type="number" min="0" max="59" placeholder="00" />
            </div>
            <span class="time-total">{{ formattedDuration }}</span>
          </div>
        </div>
      </div>

      <!-- SEGUNDA LINHA: TEMPO DE LEITURA + DIFICULDADE -->
      <div class="form-row">
        <div class="form-group reading-time-column">
          <label for="reading-time-group">
            Tempo de Leitura
            <span class="required">*</span>
            <div class="tooltip-wrapper">
              <InfoIcon fill="#0070C0" class="info-icon" />
              <span class="tooltip-text">Informe o tempo de leitura específico de seus alunos caso tenha essa informação. Caso contrário, utilize o tempo padrão de 1.100 caracteres por minuto, obtido em pesquisa com indivíduos jovens de 19 a 35 anos (Messias et al., 2008)</span>
            </div>
          </label>
          <div class="reading-speed-container" id="reading-time-group">
            <div class="speed-options-row">
              <div class="speed-option">
                <input v-model="formData.readingSpeedMode" type="radio" id="speed-default" value="default" @change="formData.customReadingSpeed = DEFAULT_READING_SPEED" />
                <label for="speed-default">Padrão ({{ DEFAULT_READING_SPEED }} caracteres/minuto)</label>
              </div>
              <div class="speed-option">
                <input v-model="formData.readingSpeedMode" type="radio" id="speed-custom" value="custom" @change="formData.customReadingSpeed = null" />
                <label for="speed-custom">Personalizado</label>
              </div>
            </div>
            <input
              v-if="formData.readingSpeedMode === 'custom'"
              id="custom-reading-speed"
              v-model.number="formData.customReadingSpeed"
              type="number"
              placeholder="Digite a velocidade de leitura em caracteres/minuto"
              min="100"
              max="2000"
              class="custom-input"
              aria-label="Velocidade customizada de leitura em caracteres por minuto"
            />
          </div>
        </div>

        <div class="form-group difficulty-column">
          <label for="difficulty-group">
            Deseja usar a dificuldade das questões para a análise?
            <span class="required">*</span>
            <div class="tooltip-wrapper">
              <InfoIcon fill="#ffc107" class="warning-icon" />
              <span class="tooltip-text">Informar a dificuldade de cada questão permite comparar os fatores da prova (tempo de leitura, formalismo, imagens, tamanho do texto, distratores e posição) entre questões fáceis, médias e difíceis. Um mesmo fator pode pesar de forma diferente em cada nível, então essa informação torna a análise mais precisa.</span>
            </div>
          </label>
          <div class="radio-group inline" id="difficulty-group">
            <div class="radio-option">
              <input v-model="useDifficultyAnalysis" :value="true" id="difficulty-yes" type="radio" />
              <label for="difficulty-yes">Sim</label>
            </div>
            <div class="radio-option">
              <input v-model="useDifficultyAnalysis" :value="false" id="difficulty-no" type="radio" />
              <label for="difficulty-no">Não</label>
            </div>
          </div>

          <!-- Aparecer embaixo quando selecionar "Sim" -->
          <div v-if="useDifficultyAnalysis" class="difficulty-step-inline" style="margin-top: 1rem; padding-top: 1rem;">
            <label for="difficulty-question-count">
              Quantas questões tem a prova?
            </label>
            <input
              id="difficulty-question-count"
              v-model.number="manualTotalQuestions"
              type="number"
              min="1"
              max="200"
              placeholder="Ex: 45"
              class="question-count-input"
            />
          </div>
        </div>
      </div>

      <!-- Seletor de dificuldade para cada questão - FULLWIDTH -->
      <QuestionDifficultySelector
        v-if="useDifficultyAnalysis && manualTotalQuestions > 0"
        :total-questions="manualTotalQuestions"
        :model-value="formData.questionDifficulties"
        @update:model-value="formData.questionDifficulties = { ...formData.questionDifficulties, ...$event }"
        :show-edit-button="true"
        @edit-questions="manualTotalQuestions = 0"
      />

      <!-- TERCEIRA LINHA: MÉTRICAS REAIS DOS ESTUDANTES -->
      <div class="form-row">
        <div class="form-group difficulty-column">
          <label for="metrics-group">
            Deseja incluir métricas reais dos estudantes?
            <InfoIcon
            :tooltip="'As métricas dos estudantes ajudam a correlacionar a dificuldade da questão com o desempenho real. Fornece a quantidade de participantes e os acertos por questão, quando essas informações estiverem disponíveis.'"
            :warning="true"
          />
          </label>
          <div class="radio-group inline" id="metrics-group">
            <div class="radio-option">
              <input v-model="formData.includeStudentMetrics" :value="true" id="metrics-yes" type="radio" />
              <label for="metrics-yes">Sim</label>
            </div>
            <div class="radio-option">
              <input v-model="formData.includeStudentMetrics" :value="false" id="metrics-no" type="radio" />
              <label for="metrics-no">Não</label>
            </div>
          </div>

          <!-- Aparecer embaixo quando selecionar "Sim" -->
          <div v-if="formData.includeStudentMetrics" class="difficulty-step-inline" style="margin-top: 1rem; padding-top: 1rem;">
            <label for="student-count">
              Quantas pessoas realizaram essa avaliação?
            </label>
            <input
              id="student-count"
              v-model.number="formData.studentCount"
              type="number"
              min="1"
              max="10000"
              value="0"
              class="question-count-input"
            />

            <label style="margin-top: 1rem;" for="metrics-question-count">
              Quantas questões tem a prova?
            </label>
            <input
              id="metrics-question-count"
              v-model.number="formData.studentMetricsQuestionCount"
              type="number"
              min="1"
              max="200"
              value="0"
              class="question-count-input"
            />
          </div>
        </div>
      </div>

      <!-- Seletor de acertos por questão - FULLWIDTH (para métricas dos estudantes) -->
      <QuestionAccuracySelector
        v-if="formData.studentMetricsQuestionCount > 0 && formData.includeStudentMetrics"
        :total-questions="formData.studentMetricsQuestionCount"
        :max-accuracy="formData.studentCount || null"
        :model-value="formData.studentMetricsAccuracy"
        @update:model-value="formData.studentMetricsAccuracy = { ...formData.studentMetricsAccuracy, ...$event }"
      />

      <!-- AVISO -->
      <div v-if="showDurationWarning" class="warning-section">
        <div class="warning-box">
          ⚠️ <strong>Aviso:</strong> A duração da prova ({{ formattedDuration }}) excede {{ MAX_EXAM_DURATION_HOURS }}h.
          Recomendamos revisar o valor inserido.
        </div>
      </div>

      <div class="form-actions" style="display: flex; justify-content: center; margin-top: 2rem;">
        <button type="submit" class="btn btn-primary" :disabled="isLoading || !isFormValid" style="padding: 1rem 3rem; font-size: 1.1rem; min-width: 300px;">
          {{ isLoading ? 'Analisando...' : 'Iniciar Análise ver comentario no código (SE FALHAR A ANÁLISE POR FALHA AO CARREGAR BERT OU ROBERTA, DAR FEEDBACK CLARO SOBRE ESSAS FALHAS)' }}
        </button>
        <!--
        1 usuário clica "Iniciar Análise",VERIFICAR se os modelos estão baixados,Verificar RAM e espaço disco ANTES de iniciar análise. Feedback claro: barra de progresso com % e tempo estimado durante download de modelos
        2 fazer funcionar offline após 1ª execução (modelos em cache);
        3 tipos de erro:RAM Insuficiente,Disco Cheio,Internet desconectou,Modelo corrompido,Versão PyTorch incompatível,Permissão negada	-->
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import InfoIcon from '@/components/icons/InfoIcon.vue'
import QuestionDifficultySelector from '@/components/QuestionDifficultySelector.vue'
import QuestionAccuracySelector from '@/components/QuestionAccuracySelector.vue'
import {
  ANALYSIS_TYPE_OPTIONS,
  DEFAULT_READING_SPEED,
  MAX_EXAM_DURATION_HOURS,
  TODOS_TIPOS_ANALISE
} from '@/constants/analysisConfig'

const store = useAnalysisStore()

const props = defineProps({
  file: { type: File, required: true },
  isLoading: { type: Boolean, default: false },
  totalQuestions: { type: Number, default: 0 }
})

const emit = defineEmits(['analyze', 'cancel'])

const useDifficultyAnalysis = ref(false)
const manualTotalQuestions = ref(0)
const manualStudentMetricsQuestions = ref(0)

// Dropdown de tipos de análise (seleção múltipla, no mesmo padrão do filtro da página do ENEM)
const menuTiposAberto = ref(false)
const dropdownTiposRef = ref(null)

const todosTiposSelecionados = computed(() => formData.value.analysisTypes.length === TODOS_TIPOS_ANALISE.length)
const algunsTiposSelecionados = computed(() => formData.value.analysisTypes.length > 0 && !todosTiposSelecionados.value)

const resumoTiposAnalise = computed(() => {
  const quantidade = formData.value.analysisTypes.length
  if (quantidade === 0) return 'Selecione ao menos um tipo de análise'
  if (todosTiposSelecionados.value) return 'Análise Completa'
  if (quantidade === 1) {
    return ANALYSIS_TYPE_OPTIONS.find((opcao) => opcao.value === formData.value.analysisTypes[0]).label
  }
  return `${quantidade} tipos de análise selecionados`
})

const alternarTodosTipos = () => {
  formData.value.analysisTypes = todosTiposSelecionados.value ? [] : [...TODOS_TIPOS_ANALISE]
}

// Fecha o menu ao clicar fora dele
const fecharMenuTiposAoClicarFora = (event) => {
  if (dropdownTiposRef.value && !dropdownTiposRef.value.contains(event.target)) {
    menuTiposAberto.value = false
  }
}

onMounted(() => document.addEventListener('click', fecharMenuTiposAoClicarFora))
onUnmounted(() => document.removeEventListener('click', fecharMenuTiposAoClicarFora))

// Inicia a parte do input das questões com a qtde detectada no pdf
watch(() => props.totalQuestions, (total) => {
  manualTotalQuestions.value = total || 0
}, { immediate: true })

// Sincronizar quantidade de questoes entre dificuldade e metricas
// Se uma esta preenchida, usa a mesma para a outra
const questionCountForDifficulty = computed(() => {
  return Math.max(Number(manualTotalQuestions.value) || 0, 0)
})

const questionCountForMetrics = computed(() => {
  return Math.max(Number(formData.value.studentMetricsQuestionCount) || 0, 0)
})

const showDurationWarning = computed(() => {
  const totalMinutes = (formData.value.hours || 0) * 60 + (formData.value.minutes || 0)
  return totalMinutes > MAX_EXAM_DURATION_HOURS * 60
})

const formData = ref({
  analysisTypes: [...TODOS_TIPOS_ANALISE],
  hours: 0,
  minutes: 0,
  readingSpeedMode: 'default',
  customReadingSpeed: null,
  questionDifficulties: {},
  includeStudentMetrics: false,
  studentCount: 0,
  studentMetricsQuestionCount: 0,
  studentMetricsAccuracy: {}
})

// Sincronizar com store ao montar
onMounted(() => {
  // Se store tem dados, carrega; se não, usa defaults
  if (store.formData && Object.keys(store.formData).length > 0) {
    formData.value = {
      analysisTypes: store.formData.analysisTypes ? [...store.formData.analysisTypes] : [...TODOS_TIPOS_ANALISE],
      hours: store.formData.hours || 0,
      minutes: store.formData.minutes || 0,
      readingSpeedMode: store.formData.readingSpeedMode || 'default',
      customReadingSpeed: store.formData.customReadingSpeed || null,
      questionDifficulties: store.formData.questionDifficulties || {},
      includeStudentMetrics: store.formData.includeStudentMetrics !== undefined ? store.formData.includeStudentMetrics : false,
      studentCount: store.formData.studentCount !== undefined && store.formData.studentCount !== null ? store.formData.studentCount : 0,
      studentMetricsQuestionCount: store.formData.studentMetricsQuestionCount !== undefined && store.formData.studentMetricsQuestionCount !== null ? store.formData.studentMetricsQuestionCount : 0,
      studentMetricsAccuracy: store.formData.studentMetricsAccuracy || {}
    }
    useDifficultyAnalysis.value = store.formData.useDifficultyAnalysis || false
  } else {
    // Primeira vez: usa defaults (NAO salva automaticamente)
    formData.value = {
      analysisTypes: [...TODOS_TIPOS_ANALISE],
      hours: 0,
      minutes: 0,
      readingSpeedMode: 'default',
      customReadingSpeed: null,
      questionDifficulties: {},
      includeStudentMetrics: false,
      studentCount: 0,
      studentMetricsQuestionCount: 0,
      studentMetricsAccuracy: {}
    }
    useDifficultyAnalysis.value = false
  }
})

// Sincronizar quantidade de questoes bidirecionalmente
// Sempre usa o maior valor entre os dois, ou se um esta preenchido e o outro vazio
const totalQuestionsCount = computed({
  get() {
    return manualTotalQuestions.value || formData.value.studentMetricsQuestionCount || 0
  },
  set(newValue) {
    // Atualiza ambos com o mesmo valor
    manualTotalQuestions.value = newValue
    formData.value.studentMetricsQuestionCount = newValue
  }
})

// Watch para sincronizar quantidade de questoes da dificuldade para metricas
watch(() => manualTotalQuestions.value, (newValue) => {
  if (newValue > 0) {
    formData.value.studentMetricsQuestionCount = newValue
  }
})

// Watch para sincronizar quantidade de questoes das metricas para dificuldade
watch(() => formData.value.studentMetricsQuestionCount, (newValue) => {
  if (newValue > 0) {
    manualTotalQuestions.value = newValue
  }
})

// Debounce para auto-salvar dados do formulario no store
let saveTimeout
const autoSaveToStore = () => {
  clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    store.setFormData({
      ...formData.value,
      useDifficultyAnalysis: useDifficultyAnalysis.value
    })
  }, 500)
}

// Watch deep: salvar dados do formulario no store automaticamente enquanto o usuario preenche
watch(
  () => formData.value,
  () => {
    autoSaveToStore()
  },
  { deep: true }
)

// Watch para useDifficultyAnalysis tambem
watch(() => useDifficultyAnalysis.value, () => {
  autoSaveToStore()
})

// Watch para manualTotalQuestions tambem
watch(() => manualTotalQuestions.value, () => {
  autoSaveToStore()
})

const formattedDuration = computed(() => {
  const h = formData.value.hours || 0
  const m = formData.value.minutes || 0
  const total = h * 60 + m
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
  if (hours > 0) return `${hours}h`
  if (mins > 0) return `${mins}m`
  return '00'
})

const isFormValid = computed(() => {
  // Validação apenas dos campos obrigatórios: tipo, duração e tempo de leitura
  const baseValid =
    formData.value.analysisTypes.length > 0 &&
    formData.value.hours !== null &&
    formData.value.hours >= 0 &&
    formData.value.minutes !== null &&
    formData.value.minutes >= 0 &&
    (formData.value.hours > 0 || formData.value.minutes > 0)

  // Se ativar dificuldade, precisa preencher todas as questões
  if (useDifficultyAnalysis.value && manualTotalQuestions.value > 0) {
    // Conta quantas questões têm dificuldade preenchida
    const answeredCount = Object.keys(formData.value.questionDifficulties).filter(
      key => formData.value.questionDifficulties[key]
    ).length

    const allAnswered = answeredCount === manualTotalQuestions.value

    if (!baseValid || !allAnswered) return false
  }

  // Se ativar metricas dos estudantes, precisa preencher os campos obrigatorios
  if (formData.value.includeStudentMetrics) {
    const metricsValid =
      formData.value.studentCount && formData.value.studentCount > 0 &&
      formData.value.studentMetricsQuestionCount && formData.value.studentMetricsQuestionCount > 0

    // Acertos por questão: questão sem valor gravado conta como 0 (é o que o campo mostra)
    // Nenhuma questão pode ter mais acertos do que o número de pessoas que realizaram a avaliação
    if (metricsValid) {
      const numeroDeQuestoes = Number(formData.value.studentMetricsQuestionCount)
      const numeroDeEstudantes = Number(formData.value.studentCount)
      const todosValidos = Array.from({ length: numeroDeQuestoes }, (_, indice) => indice + 1).every((numero) => {
        const acertos = Number(formData.value.studentMetricsAccuracy[numero] ?? 0)
        return Number.isInteger(acertos) && acertos >= 0 && acertos <= numeroDeEstudantes
      })

      if (!todosValidos) return false
    }

    return baseValid && metricsValid
  }

  return baseValid
})

const submitForm = () => {
  // Salva no store antes de emitir a análise
  store.setFormData({
    ...formData.value,
    useDifficultyAnalysis: useDifficultyAnalysis.value
  })
  // Emite para iniciar análise
  emit('analyze', formData.value)
}
</script>

<style scoped>
.analysis-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.analysis-form h2 {
  margin: 0;
  color: #333;
  font-size: 1.5rem;
  font-weight: 700;
}

form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.form-group label {
  color: #333;
  font-weight: 600;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.1rem;
  flex-wrap: wrap;
}

.required {
  color: #e74c3c;
  margin-left: 0.25rem;
}

.form-group input[type='text'],
.form-group input[type='number'],
.form-group select {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  width: 100%;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #0070C0;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.analysis-type-dropdown {
  position: relative;
  margin-top: 1.25rem;
}

.analysis-type-trigger {
  width: 100%;
  padding: 0.6rem 3.5rem 0.6rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
  text-align: left;
  color: #333;
  background-color: white;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5l5 5 5-5' fill='none' stroke='%23333' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 1.5rem center;
  cursor: pointer;
  transition: border-color 0.3s ease;
}

.analysis-type-trigger:focus {
  outline: none;
  border-color: #0070C0;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.analysis-type-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  padding: 1rem;
  margin-top: 0.5rem;
  z-index: 100;
  max-height: 400px;
  overflow-y: auto;
}

.analysis-type-option {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  margin: 0.25rem 0;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.analysis-type-option:hover {
  background: #f5f5f5;
}

.analysis-type-option input[type='checkbox'] {
  margin-right: 0.75rem;
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #0070C0;
}

.analysis-type-option label {
  cursor: pointer;
  margin: 0;
  font-size: 0.95rem;
  font-weight: 500;
  color: #333;
  flex: 1;
}

.analysis-type-todos {
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.info-icon {
  width: 18px;
  height: 18px;
  margin-left: 0.5rem;
  cursor: pointer;
  vertical-align: middle;
  display: inline-block;
}

.reading-speed-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.4rem;
}

.speed-options-row {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.speed-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.speed-option input[type='radio'] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #0070C0;
}

.speed-option label {
  margin: 0;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
}

.form-group .reading-speed-container .custom-input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  margin-top: 0.5rem;
}

.time-input-container {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
}

.time-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
}

.time-group label {
  font-size: 0.75rem;
  color: #999;
  font-weight: 500;
  margin: 0;
}

.form-group .time-input-container .time-group input {
  padding: 0.6rem 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
  font-weight: 600;
}

.time-separator {
  font-weight: 600;
  color: #333;
  margin-bottom: 0.35rem;
}

.time-total {
  background: #f0f0f0;
  padding: 0.6rem 0.75rem;
  border-radius: 4px;
  font-weight: 600;
  color: #0070C0;
  min-width: 45px;
  text-align: center;
  font-size: 0.9rem;
  margin-bottom: 0.35rem;
}

.warning-box {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-left: 4px solid #ffc107;
  padding: 1rem;
  border-radius: 6px;
  color: #856404;
  font-size: 0.95rem;
  margin: 0;
}

.warning-box strong {
  font-weight: 600;
}

.difficulty-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e0e0e0;
}

.difficulty-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.1rem;
  font-weight: 600;
}

.question-count {
  background: #0070C0;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.difficulty-toggle-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.difficulty-label-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.difficulty-label-container label {
  margin: 0;
  color: #333;
  font-weight: 500;
}

.radio-group {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  margin-top: 0.4rem;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.radio-option input[type='radio'] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #0070C0;
}

.radio-option label {
  margin: 0;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
}

.tooltip-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.warning-icon {
  width: 20px;
  height: 20px;
  cursor: help;
}

.tooltip-text {
  visibility: hidden;
  width: 240px;
  background: #333;
  color: white;
  text-align: center;
  border-radius: 6px;
  padding: 0.75rem;
  position: absolute;
  z-index: 1000;
  bottom: 125%;
  left: 50%;
  margin-left: -120px;
  opacity: 0;
  transition: opacity 0.3s ease;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: normal;
  line-height: 1.3;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.tooltip-wrapper:hover .tooltip-text {
  visibility: visible;
  opacity: 1;
}

.difficulty-column,
.reading-time-column {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.difficulty-step-inline {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}

.difficulty-step-inline label {
  color: #333;
  font-weight: 600;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.1rem;
  flex-wrap: wrap;
  margin: 0;
  max-width: 100%;
}

.form-group .difficulty-step-inline .question-count-input {
  padding: 0.6rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
  width: 100px;
}

.form-group .difficulty-step-inline .question-count-input:focus {
  border-color: #0070C0;
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.btn-edit-questions {
  background: transparent;
  color: #666;
  border: none;
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  font-size: 1.1rem;
  transition: color 0.3s ease, background-color 0.3s ease;
  margin-left: 0.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease;
  font-weight: 600;
}

.btn-primary {
  background: linear-gradient(135deg, #0070C0 0%, #047857 100%);
  color: white;
  flex: 1;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 112, 192, 0.5);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .time-input-container {
    flex-wrap: wrap;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
