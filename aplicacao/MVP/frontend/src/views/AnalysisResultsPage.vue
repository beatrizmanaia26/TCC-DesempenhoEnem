<template>
  <main class="results-page">
    <header class="page-header">
      <h1>Resultados da análise</h1>
      <p v-if="payload">Dados extraídos de {{ payload.fileName }}</p>
    </header>

    <section v-if="!payload" class="panel empty-state">
      <p>Não há dados de análise nesta sessão. Envie uma prova e preencha os parâmetros primeiro.</p>
      <button class="button primary" @click="goToForm">Ir para o formulário</button>
    </section>

    <template v-else>
      <section class="panel">
        <h2>Resumo da prova</h2>
        <div class="metrics-grid">
          <article class="metric-card">
            <span>Questões extraídas</span>
            <strong>{{ questions.length }}</strong>
          </article>
          <article class="metric-card">
            <span>Questões com imagem</span>
            <strong>{{ questionsWithImages }}</strong>
          </article>
          <article class="metric-card">
            <span>Palavras extraídas</span>
            <strong>{{ totalWords }}</strong>
          </article>
        </div>
      </section>

      <section class="panel">
        <h2>Parâmetros usados</h2>
        <dl class="config-grid">
          <div><dt>Tipo de análise</dt><dd>{{ analysisTypeLabel }}</dd></div>
          <div><dt>Duração informada</dt><dd>{{ formatMinutes(examDurationMinutes) }}</dd></div>
          <div><dt>Velocidade de leitura</dt><dd>{{ readingSpeed }} caracteres/minuto</dd></div>
          <div><dt>Dificuldade por questão</dt><dd>{{ config.useDifficultyAnalysis ? 'Incluída no JSON' : 'Não informada' }}</dd></div>
          <div><dt>Métricas dos estudantes</dt><dd>{{ config.includeStudentMetrics ? `${config.studentCount} estudantes` : 'Não informadas' }}</dd></div>
        </dl>
      </section>

      <section class="panel">
        <h2>{{ analysisTypeLabel }}</h2>
      </section>

      <section v-if="config.useDifficultyAnalysis" class="panel">
        <h2>Distribuição de dificuldade</h2>
        <div class="metrics-grid">
          <article v-for="level in difficultyLevels" :key="level.key" class="metric-card">
            <span>{{ level.label }}</span>
            <strong>{{ difficultyCounts[level.key] }}</strong>
          </article>
        </div>
      </section>

      <section v-if="config.includeStudentMetrics" class="panel">
        <h2>Desempenho informado dos estudantes</h2>
        <p>{{ studentCorrectCount }} acertos registrados de {{ studentPossibleCount }} possíveis ({{ studentAccuracyPercent }}%).</p>
      </section>

      <section class="panel json-panel">
        <div class="json-heading">
          <div>
            <h2>JSON da prova</h2>
            <p>Inclui as dificuldades e, quando habilitado, os acertos informados por questão.</p>
          </div>
        </div>
        <pre>{{ JSON.stringify(examJson, null, 2) }}</pre>
      </section>

      <button class="button secondary back-button" @click="goToForm">Voltar ao formulário</button>
    </template>
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAnalysisStore } from '@/stores/analysisStore'
import { DEFAULT_READING_SPEED, TODOS_TIPOS_ANALISE } from '@/constants/analysisConfig'

const store = useAnalysisStore()
const router = useRouter()
/*
 * `store.analysisPayload` é o objeto que mantém os dados entre as duas telas.
 * Estrutura: { fileName, textos_introdutorios, questions, config }.
 * - fileName: nome do PDF enviado.
 * - textos_introdutorios: textos que aparecem antes da primeira questão,
 *   cada um com id, texto e quantidade_palavras.
 * - questions: lista que é exposta como `questoes` no JSON, cada questão contém:
 *    questao, texto, texto_contado, alternativas, tem_imagem e quantidade_palavras.
 *    Se as opções forem usadas, também contém dificuldade e/ou acertos, total_estudantes e taxa_acerto_percentual.
 * - config: inputs originais do formulário: analysisType, hours, minutes,
 *   readingSpeedMode, customReadingSpeed, useDifficultyAnalysis,
 *   questionDifficulties, includeStudentMetrics, studentCount,
 *   studentMetricsQuestionCount e studentMetricsAccuracy.
 * 'payload' abaixo é um computed que lê esse objeto do Pinia; no template Vue
 * o valor é acessado diretamente, e no script usamos payload.value.
 */
const payload = computed(() => store.analysisPayload)
const questions = computed(() => payload.value?.questions ?? [])
const introductoryTexts = computed(() => payload.value?.textos_introdutorios ?? [])
// Formato compatível com as rotinas de análise: textos_introdutorios e questoes.
const examJson = computed(() => ({ textos_introdutorios: introductoryTexts.value, questoes: questions.value }))
const config = computed(() => payload.value?.config ?? {})

// O JSON usa `quantidade_palavras`, `tem_imagem`, `texto_contado` e `alternativas`
// do extrator; os demais cálculos usam os inputs salvos no campo `config`.
const questionsWithImages = computed(() => questions.value.filter((question) => question.tem_imagem).length)
const totalWords = computed(() => questions.value.reduce((sum, question) => sum + (Number(question.quantidade_palavras) || 0), 0))
const questionsWithFiveAlternatives = computed(() => questions.value.filter((question) => question.alternativas?.length === 5).length)
const averageWords = computed(() => questions.value.length ? Math.round(totalWords.value / questions.value.length) : 0)
// O tempo de leitura usa a velocidade escolhida; 
const readingSpeed = computed(() => config.value.readingSpeedMode === 'custom'
  ? Number(config.value.customReadingSpeed) || DEFAULT_READING_SPEED
  : DEFAULT_READING_SPEED)
const estimatedReadingMinutes = computed(() => readingCharacters.value / readingSpeed.value)
const examDurationMinutes = computed(() => (Number(config.value.hours) || 0) * 60 + (Number(config.value.minutes) || 0))

const difficultyLevels = [
  { key: 'facil', label: 'Fácil' },
  { key: 'medio', label: 'Médio' },
  { key: 'dificil', label: 'Difícil' }
]
const difficultyCounts = computed(() => Object.fromEntries(difficultyLevels.map(({ key }) => [
  key,
  questions.value.filter((question) => question.dificuldade === key).length
])))

// Acertos são valores por questão; o total possível usa o número de estudantes
// e de questões informado pelo usuário, e a porcentagem é ponderada por questão.
const studentCorrectCount = computed(() => Object.values(config.value.studentMetricsAccuracy ?? {})
  .reduce((sum, value) => sum + (Number(value) || 0), 0))
const studentPossibleCount = computed(() => (Number(config.value.studentMetricsQuestionCount) || 0)
  * (Number(config.value.studentCount) || 0))
const studentAccuracyPercent = computed(() => studentPossibleCount.value
  ? ((studentCorrectCount.value / studentPossibleCount.value) * 100).toFixed(2)
  : '0.00')

const analysisTypeLabels = {
  all: 'Análise Completa',
  image: 'Presença de imagens',
  formality: 'Formalismo',
  'reading-time': 'Tempo de prova',
  'word-count': 'Tamanho das questões',
  distractors: 'Distratores'
}
const analysisTypeLabel = computed(() => {
  const tipos = config.value.analysisTypes ?? []
  const todos = tipos.includes('all') || tipos.length === TODOS_TIPOS_ANALISE.length
  if (todos) return analysisTypeLabels.all
  const nomes = tipos.map((tipo) => analysisTypeLabels[tipo]).filter(Boolean)
  return nomes.length ? nomes.join(', ') : 'Análise'
})

const formatMinutes = (minutes) => {
  const safeMinutes = Number(minutes) || 0
  const wholeMinutes = Math.floor(safeMinutes)
  const seconds = Math.round((safeMinutes - wholeMinutes) * 60)
  return `${wholeMinutes} min ${seconds} s`
}

const goToForm = () => router.push('/')
</script>

<style scoped>
.results-page {
  min-height: 100vh;
  padding: 2rem;
  background: linear-gradient(135deg, #E0F2FE 0%, #F0F9FF 100%);
}
.page-header, .panel, .back-button { max-width: 1000px; margin-left: auto; margin-right: auto; }
.page-header { text-align: center; color: #0070C0; margin-bottom: 2rem; }
.page-header h1 { margin-bottom: .5rem; }
.panel { padding: 1.5rem; margin-bottom: 1.5rem; border-radius: 12px; background: white; box-shadow: 0 8px 28px #00000012; }
.panel h2 { margin: 0 0 1rem; color: #263238; font-size: 1.25rem; }
.metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 1rem; }
.metric-card { display: flex; flex-direction: column; gap: .5rem; padding: 1rem; border: 1px solid #e0e0e0; border-radius: 8px; }
.metric-card span, dt { color: #667085; font-size: .9rem; }
.metric-card strong { color: #0070C0; font-size: 1.5rem; }
.config-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; }
.config-grid div { padding: .75rem; border-radius: 8px; background: #f7f9fc; }
dt { margin-bottom: .35rem; }
dd { margin: 0; color: #263238; font-weight: 600; }
.note p, .json-heading p, .empty-state p { color: #566; line-height: 1.5; }
.json-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.json-heading h2, .json-heading p { margin-bottom: .4rem; }
.json-panel pre { max-height: 65vh; overflow: auto; padding: 1rem; border-radius: 8px; background: #f5f7fa; white-space: pre-wrap; overflow-wrap: anywhere; }
.button { padding: .75rem 1.25rem; border: 0; border-radius: 6px; cursor: pointer; font-weight: 600; }
.primary { color: white; background: linear-gradient(135deg, #0070C0, #10B981); }
.secondary { color: #333; background: #f0f0f0; border: 1px solid #ddd; }
.back-button { display: block; margin-top: 1rem; }
.empty-state { text-align: center; }
@media (max-width: 600px) {
  .results-page { padding: 1rem; }
  .json-heading { align-items: flex-start; flex-direction: column; }
}
</style>
