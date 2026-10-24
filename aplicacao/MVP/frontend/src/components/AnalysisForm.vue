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
          <select v-model="formData.analysisType" id="analysisType" required>
            <option value="all">✓ Análise Completa</option>
            <option value="position">Análise da Posição das Questões</option>
            <option value="image">Análise da Presença de Imagens</option>
            <option value="formality">Análise do Formalismo</option>
            <option value="reading-time">Análise do Tempo de Prova</option>
            <option value="word-count">Análise do Tamanho das Questões</option>
            <option value="distractors">Análise de Distratores</option>
          </select>
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
        <div class="form-group">
          <label>
            Tempo de Leitura
            <span class="required">*</span>
            <div class="tooltip-wrapper">
              <InfoIcon fill="#667eea" class="info-icon" />
              <span class="tooltip-text">TEMPO CALCULADO COM BASE EM PESQUISA</span>
            </div>
          </label>
          <div class="reading-speed-container">
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
            <input v-if="formData.readingSpeedMode === 'custom'" v-model.number="formData.customReadingSpeed" type="number" placeholder="Digite a velocidade de leitura em caracteres/minuto" min="100" max="2000" class="custom-input" />
          </div>
        </div>

        <div class="form-group difficulty-column">
          <label>
            Deseja utilizar a dificuldade das questões para a análise?
            <span class="required">*</span>
            <div class="tooltip-wrapper">
              <InfoIcon fill="#ffc107" class="warning-icon" />
              <span class="tooltip-text">É IMPORTANTE PRAS ANÁLISES</span>
            </div>
          </label>
          <div class="radio-group inline">
            <div class="radio-option">
              <input v-model="useDifficultyAnalysis" :value="true" id="difficulty-yes" type="radio" />
              <label for="difficulty-yes">Sim</label>
            </div>
            <div class="radio-option">
              <input v-model="useDifficultyAnalysis" :value="false" id="difficulty-no" type="radio" />
              <label for="difficulty-no">Não</label>
            </div>
          </div>
        </div>
      </div>


      <!-- AVISO -->
      <div v-if="showDurationWarning" class="warning-section">
        <div class="warning-box">
          ⚠️ <strong>Aviso:</strong> A duração da prova ({{ formattedDuration }}) excede {{ MAX_EXAM_DURATION_HOURS }}h.
          Recomendamos revisar o valor inserido.
        </div>
      </div>

      <!-- DIFICULDADE DAS QUESTÕES -->
      <div v-if="useDifficultyAnalysis" class="difficulty-section">
        <!-- PASSO 1: Digitar quantidade de questões -->
        <div v-if="!manualTotalQuestions || manualTotalQuestions === 0" class="difficulty-step-inline">
          <label>
            Quantas questões tem a prova? REMOVER QND UPLOAD JA EXTRAIR QTD DE QUESTOES E JA APARECER DIRETO O CLASSIFICAR DIFICULDADE
            <span class="required">*</span>
          </label>
          <input
            v-model.number="manualTotalQuestions"
            type="number"
            min="1"
            max="200"
            placeholder="Ex: 45"
            class="question-count-input"
          />
        </div>

        <!-- PASSO 2: Selecionar dificuldade das questões -->
        <QuestionDifficultySelector
          v-if="manualTotalQuestions > 0"
          :total-questions="manualTotalQuestions"
          :model-value="formData.questionDifficulties"
          @update:model-value="formData.questionDifficulties = $event"
          :show-edit-button="true"
          @edit-questions="manualTotalQuestions = 0"
        />
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary" :disabled="isLoading || !isFormValid">
          {{ isLoading ? 'Analisando...' : 'Iniciar Análise' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import InfoIcon from '@/components/InfoIcon.vue'
import QuestionDifficultySelector from '@/components/QuestionDifficultySelector.vue'
import { DEFAULT_READING_SPEED, MAX_EXAM_DURATION_HOURS } from '@/constants/analysisConfig'

const store = useAnalysisStore()

const props = defineProps({
  file: { type: File, required: true },
  isLoading: { type: Boolean, default: false },
  totalQuestions: { type: Number, default: 0 }
})

const emit = defineEmits(['analyze', 'cancel'])

const useDifficultyAnalysis = ref(false)
const manualTotalQuestions = ref(0)

const showDurationWarning = computed(() => {
  const totalMinutes = (formData.value.hours || 0) * 60 + (formData.value.minutes || 0)
  return totalMinutes > MAX_EXAM_DURATION_HOURS * 60
})

const formData = ref({
  analysisType: 'all',
  hours: 0,
  minutes: 0,
  readingSpeedMode: 'default',
  customReadingSpeed: null,
  questionDifficulties: {}
})

// Sincronizar com store ao montar
onMounted(() => {
  // Se store tem dados, carrega; se não, usa defaults
  if (store.formData && Object.keys(store.formData).length > 0) {
    formData.value = {
      analysisType: store.formData.analysisType || 'all',
      hours: store.formData.hours || 0,
      minutes: store.formData.minutes || 0,
      readingSpeedMode: store.formData.readingSpeedMode || 'default',
      customReadingSpeed: store.formData.customReadingSpeed || null,
      questionDifficulties: store.formData.questionDifficulties || {}
    }
    useDifficultyAnalysis.value = store.formData.useDifficultyAnalysis || false
  } else {
    // Primeira vez: usa defaults (NÃO salva automaticamente)
    formData.value = {
      analysisType: 'all',
      hours: 0,
      minutes: 0,
      readingSpeedMode: 'default',
      customReadingSpeed: null,
      questionDifficulties: {}
    }
    useDifficultyAnalysis.value = false
  }
})

// NÃO sincronizar automaticamente durante preenchimento
// Apenas salvar quando enviar (no submitForm)

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
    formData.value.analysisType &&
    formData.value.hours !== null &&
    formData.value.hours >= 0 &&
    formData.value.minutes !== null &&
    formData.value.minutes >= 0 &&
    (formData.value.hours > 0 || formData.value.minutes > 0)

  // Se ativar dificuldade, precisa preencher todas as questões
  if (useDifficultyAnalysis.value && manualTotalQuestions.value > 0) {
    const allAnswered = Object.keys(formData.value.questionDifficulties).length === manualTotalQuestions.value
    return baseValid && allAnswered
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
  gap: 0.5rem;
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
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
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
  margin-top: 0.5rem;
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
}

.speed-option label {
  margin: 0;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
}

.custom-input {
  padding: 0.75rem !important;
  border: 1px solid #ddd !important;
  border-radius: 6px !important;
  font-size: 1rem !important;
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

.time-group input {
  padding: 0.6rem 0.5rem !important;
  border: 1px solid #ddd !important;
  border-radius: 4px !important;
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
  color: #667eea;
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

.difficulty-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
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
  background: #667eea;
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
  accent-color: #667eea;
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

.difficulty-column {
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

.question-count-input {
  padding: 0.6rem 0.75rem !important;
  border: 1px solid #ddd !important;
  border-radius: 6px !important;
  font-size: 0.95rem !important;
  width: 100px !important;
}

.question-count-input:focus {
  border-color: #667eea !important;
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
  transition: all 0.3s;
  margin-left: 0.5rem;
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
  flex: 1;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
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
