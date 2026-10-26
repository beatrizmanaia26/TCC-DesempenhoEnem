<template>
  <div class="difficulty-selector">
    <div class="header">
      <div class="header-left">
        <h3>Dificuldade das Questões</h3>
        <p class="subtitle">Informe o nível de dificuldade de cada questão</p>
      </div>
    </div>

    <div class="questions-grid">
      <div v-for="q in currentQuestions" :key="q.id" class="question-item">
        <div class="question-number">Questão {{ q.id }}</div>
        <div class="difficulty-buttons">
          <button
            type="button"
            @click="setDifficulty(q.id, 'facil')"
            :class="['btn-difficulty', { active: difficulties[q.id] === 'facil' }]"
            class-name="btn-easy"
          >
            Fácil
          </button>
          <button
            type="button"
            @click="setDifficulty(q.id, 'medio')"
            :class="['btn-difficulty', { active: difficulties[q.id] === 'medio' }]"
            class-name="btn-medium"
          >
            Médio
          </button>
          <button
            type="button"
            @click="setDifficulty(q.id, 'dificil')"
            :class="['btn-difficulty', { active: difficulties[q.id] === 'dificil' }]"
            class-name="btn-hard"
          >
            Difícil
          </button>
        </div>
      </div>
    </div>

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
  showEditButton: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'edit-questions'])

const currentGroup = ref(1)
const difficulties = ref({ ...props.modelValue })

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
  const answered = Object.keys(difficulties.value).length
  return (answered / props.totalQuestions) * 100
})

const setDifficulty = (questionId, level) => {
  difficulties.value[questionId] = level
  emit('update:modelValue', difficulties.value)
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
.difficulty-selector {
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

.btn-edit-qty {
  background: transparent;
  color: #666;
  border: none;
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.3s;
  flex-shrink: 0;
  position: absolute;
  right: 0;
  top: 0;
}

.btn-edit-qty:hover {
  color: #333;
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

.difficulty-buttons {
  display: flex;
  gap: 0.75rem;
}

.btn-difficulty {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 2px solid #ddd;
  border-radius: 6px;
  background: white;
  color: #666;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.8rem;
}

.btn-difficulty:hover {
  border-color: #0070C0;
  color: #0070C0;
}

.btn-difficulty.active {
  color: #0070C0;
  border-color: #0070C0;
  background: white;
}

.btn-difficulty.active.btn-easy {
  background: white;
  border-color: #059669;
  color: #059669;
}

.btn-difficulty.active.btn-medium {
  background: white;
  border-color: #d97706;
  color: #d97706;
}

.btn-difficulty.active.btn-hard {
  background: white;
  border-color: #dc2626;
  color: #dc2626;
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
  transition: all 0.3s ease;
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
  .difficulty-selector {
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
