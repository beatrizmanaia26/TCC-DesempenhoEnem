<template>
  <div class="results-display">
    <div v-if="results" class="results-content">
      <section class="result-section">
        <h3>📋 Resumo Geral</h3>
        <div class="summary-grid">
          <div class="summary-card">
            <span class="card-label">Total de Questões</span>
            <span class="card-value">{{ results.totalQuestions || 0 }}</span>
          </div>
          <div class="summary-card">
            <span class="card-label">Questões com Imagem</span>
            <span class="card-value">{{ results.questionsWithImages || 0 }}</span>
          </div>
          <div class="summary-card">
            <span class="card-label">Tempo Médio de Leitura</span>
            <span class="card-value">{{ results.avgReadingTime || 'N/A' }}</span>
          </div>
          <div class="summary-card">
            <span class="card-label">Nível Médio de Formalismo</span>
            <span class="card-value">{{ results.avgFormality || 'N/A' }}</span>
          </div>
        </div>
      </section>

      <section class="result-section" v-if="results.distractors">
        <h3>🎯 Análise de Distratores</h3>
        <p>Análise de distratores e similaridade entre alternativas.</p>
      </section>

      <section class="result-section" v-if="results.formality">
        <h3>📝 Análise de Formalismo</h3>
        <p>Questões Formais: {{ results.formality.formalCount || 0 }} | Informais: {{ results.formality.informalCount || 0 }}</p>
      </section>

      <section class="result-section" v-if="results.readingTime">
        <h3>⏱️ Análise de Tempo de Leitura</h3>
        <p>Tempo médio por questão: {{ results.readingTime.avgTimePerQuestion || 'N/A' }} min</p>
      </section>

      <section class="result-section actions-section">
        <button class="btn btn-primary">📥 Baixar JSON</button>
        <button class="btn btn-secondary">📊 Exportar CSV</button>
      </section>
    </div>
    <div v-else class="no-results">
      <p>Nenhum resultado disponível</p>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  results: {
    type: Object,
    required: true
  }
})
</script>

<style scoped>
.results-display {
  width: 100%;
}

.results-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.result-section {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  background: #fafafa;
}

.result-section h3 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.2rem;
}

.result-section p {
  color: #555;
  margin: 0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.summary-card {
  background: white;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card-label {
  font-size: 0.85rem;
  color: #999;
  font-weight: 500;
}

.card-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0070C0;
}

.actions-section {
  display: flex;
  gap: 1rem;
  justify-content: center;
  background: white;
  padding: 1.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  flex: 1;
}

.btn-primary {
  background: linear-gradient(135deg, #0070C0 0%, #10B981 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 112, 192, 0.5);
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
  border: 1px solid #ddd;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.no-results {
  text-align: center;
  padding: 3rem;
  color: #999;
}
</style>
