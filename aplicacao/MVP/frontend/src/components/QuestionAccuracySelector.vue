<template>
  <div class="accuracy-selector">
    <div class="header">
      <div class="header-left">
        <h3>Acertos por Questão</h3>
        <p class="subtitle">Informe a quantidade de acertos por questão</p>
      </div>
    </div>

    <div class="questions-grid">
      <div v-for="q in currentQuestions" :key="q.id" class="question-item">
        <div class="question-number">Questão {{ q.id }}</div>
        <div class="accuracy-input">
          <label :for="`accuracy-input-${q.id}`" class="sr-only">
            Acertos para Questão {{ q.id }}
          </label>
          <input
            :id="`accuracy-input-${q.id}`"
            :value="accuracies[q.id] || 0"
            @input="setAccuracy(q.id, $event.target.value, $event)"
            type="number"
            min="0"
            :max="limiteAcertos ?? 10000"
            placeholder="0"
            class="input-accuracy"
            :class="{ 'input-invalid': ultrapassaLimite(q.id) }"
            :aria-label="`Acertos para Questao ${q.id}`"
          />
        </div>
      </div>
    </div>

    <p v-if="possuiAcertoAcimaDoLimite" class="error-message" role="alert">
      O número de acertos de cada questão não pode ser maior que o número de pessoas que realizaram a avaliação ({{ limiteAcertos }}).
    </p>

    <div class="navigation">
      <button
        type="button"
        @click="previousGroup"
        :disabled="currentGroup === 1"
        class="btn-nav"
      >
        ←
      </button>
      <span class="group-indicator">{{ currentGroup }} / {{ totalGroups }}</span>
      <button
        type="button"
        @click="nextGroup"
        :disabled="currentGroup === totalGroups"
        class="btn-nav"
      >
       →
      </button>
    </div>

    <div class="progress-bar">
      <div class="progress" :style="{ width: progressPercentage + '%' }"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  totalQuestions: {
    type: Number,
    required: true
  },
  questionsPerGroup: {
    type: Number,
    default: 6
  },
  modelValue: {
    type: Object,
    default: () => ({})
  },
  // Número de pessoas que realizaram a avaliação: nenhuma questão pode ter mais acertos que isso
  maxAccuracy: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const currentGroup = ref(1)
const accuracies = ref({ ...props.modelValue })

const limiteAcertos = computed(() => (props.maxAccuracy > 0 ? props.maxAccuracy : null))

const ultrapassaLimite = (questionId) => {
  return limiteAcertos.value !== null && Number(accuracies.value[questionId] || 0) > limiteAcertos.value
}

const possuiAcertoAcimaDoLimite = computed(() => {
  return Object.keys(accuracies.value).some((questionId) => ultrapassaLimite(questionId))
})

const totalGroups = computed(() => {
  return Math.ceil(props.totalQuestions / props.questionsPerGroup)
})

const currentQuestions = computed(() => {
  const start = (currentGroup.value - 1) * props.questionsPerGroup + 1
  const end = Math.min(start + props.questionsPerGroup - 1, props.totalQuestions)
  const questions = []

  for (let i = start; i <= end; i++) {
    questions.push({ id: i })
  }

  return questions
})

const progressPercentage = computed(() => {
  const answered = Object.keys(accuracies.value).filter(key => accuracies.value[key] && accuracies.value[key] > 0).length
  return (answered / props.totalQuestions) * 100
})

const setAccuracy = (questionId, value, event) => {
  let numValue = Math.max(Number.parseInt(value) || 0, 0)

  // Limita o valor ao número de pessoas que realizaram a avaliação
  if (limiteAcertos.value !== null && numValue > limiteAcertos.value) {
    numValue = limiteAcertos.value
  }

  accuracies.value[questionId] = numValue

  // Atualiza o próprio input, pois o Vue não re-renderiza se o valor do model não mudou
  if (event && event.target) {
    event.target.value = String(numValue)
  }

  emit('update:modelValue', accuracies.value)
}

const nextGroup = () => {
  if (currentGroup.value < totalGroups.value) {
    currentGroup.value++
  }
}

const previousGroup = () => {
  if (currentGroup.value > 1) {
    currentGroup.value--
  }
}
</script>

<style scoped>
.accuracy-selector {
  border: none;
  border-radius: 8px;
  padding: 0;
  margin-top: 1rem;
  background: transparent;
}

.header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
  position: relative;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  text-align: center;
}

.header h3 {
  color: #333;
  font-size: 1.2rem;
  margin: 0;
}

.subtitle {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
}

.questions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.question-item {
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.question-number {
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
}

.accuracy-input {
  display: flex;
  gap: 0.75rem;
}

.input-accuracy {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 2px solid #ddd;
  border-radius: 6px;
  background: white;
  color: #333;
  font-weight: 500;
  font-size: 0.9rem;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.input-accuracy:hover {
  border-color: #0070C0;
}

.input-accuracy:focus {
  outline: none;
  border-color: #0070C0;
  box-shadow: 0 0 0 3px rgba(0, 112, 192, 0.1);
}

.input-accuracy.input-invalid {
  border-color: #ef4444;
}

.error-message {
  color: #ef4444;
  font-size: 0.9rem;
  font-weight: 500;
  text-align: center;
  margin: 0 0 1rem;
}

/* Screen reader only: oculta visualmente mas mantém acessivel para leitores de tela */
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

.navigation {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 0;
}

.btn-nav {
  padding: 0.75rem 1.5rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  color: #333;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.3s ease, color 0.3s ease, background-color 0.3s ease;
}

.btn-nav:hover:not(:disabled) {
  border-color: #0070C0;
  color: #0070C0;
  background: #f9f9f9;
}

.btn-nav:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.group-indicator {
  color: #666;
  font-weight: 600;
  font-size: 1rem;
}

.progress-bar {
  display: none;
}

.progress {
  height: 100%;
  background: linear-gradient(90deg, #10b981 0%, #0070C0 50%, #ef4444 100%);
  transition: width 0.3s ease;
}

@media (max-width: 768px) {
  .accuracy-selector {
    padding: 1.5rem;
  }

  .questions-grid {
    grid-template-columns: 1fr;
  }

  .navigation {
    gap: 1rem;
  }

  .btn-nav {
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
  }
}
</style>
