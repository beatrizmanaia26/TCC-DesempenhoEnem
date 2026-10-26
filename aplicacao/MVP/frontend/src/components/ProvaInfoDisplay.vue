<template>
  <div class="prova-info">
    <div class="info-item">
      <div class="info-label">
        <strong>Duração total da prova:</strong>
      </div>
      <div class="info-value">
        {{ provaInfo.duracao_total }}
        <span class="info-details">(Dia 1: {{ provaInfo.duracao_dia1 }} | Dia 2: {{ provaInfo.duracao_dia2 }})</span>
      </div>
    </div>

    <div class="info-item">
      <div class="info-label">
        <strong>Quantidade total de questões:</strong>
      </div>
      <div class="info-value">
        {{ provaInfo.questoes_total }} questões
        <span class="info-details">(Dia 1: {{ provaInfo.questoes_dia1 }} | Dia 2: {{ provaInfo.questoes_dia2 }})</span>
      </div>
    </div>

    <div class="info-item">
      <div class="info-label">
        <strong>Velocidade de leitura considerada:</strong>
      </div>
      <div class="info-value">
        {{ provaInfo.velocidade_leitura }} caracteres/minuto
        <span class="info-details">(Referência: Messias et al., 2008)</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { obterInfoProva } from '@/config/enemConstants.js'

const props = defineProps({
  ano: {
    type: Number,
    required: true
  }
})

const provaInfo = computed(() => {
  return obterInfoProva(props.ano) || {
    duracao_total: 'N/A',
    duracao_dia1: 'N/A',
    duracao_dia2: 'N/A',
    questoes_total: 'N/A',
    questoes_dia1: 'N/A',
    questoes_dia2: 'N/A',
    velocidade_leitura: 'N/A'
  }
})
</script>

<style scoped>
.prova-info {
  background: linear-gradient(135deg, #f8fafb 0%, #f0f4f8 100%);
  border: 1px solid #e0e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1.5rem 0;
  box-shadow: 0 2px 8px rgba(0, 112, 192, 0.08);
}

.info-item {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e0e8f0;
}

.info-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.info-label {
  min-width: 200px;
  color: #333;
  font-size: 0.95rem;
  font-weight: 600;
}

.info-value {
  flex: 1;
  color: #0070C0;
  font-weight: 600;
  font-size: 0.95rem;
}

.info-details {
  display: block;
  color: #666;
  font-size: 0.85rem;
  font-weight: 400;
  margin-top: 0.25rem;
}

@media (max-width: 768px) {
  .prova-info {
    padding: 1rem;
  }

  .info-item {
    flex-direction: column;
    gap: 0.5rem;
  }

  .info-label {
    min-width: auto;
  }
}
</style>
