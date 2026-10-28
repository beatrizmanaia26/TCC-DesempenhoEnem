<template>
  <div class="prova-info">
    <div class="info-item">
      <div class="info-label">Duração total da prova:</div>
      <div class="info-value">
        {{ provaInfo.duracao_total }}
        <span class="info-day-info">(Dia 1: {{ provaInfo.duracao_dia1 }} | Dia 2: {{ provaInfo.duracao_dia2 }})</span>
      </div>
    </div>

    <div class="info-item">
      <div class="info-label">Quantidade total de questões:</div>
      <div class="info-value">
        {{ provaInfo.questoes_total }} questões
        <span class="info-day-info">(Dia 1: {{ provaInfo.questoes_dia1 }} | Dia 2: {{ provaInfo.questoes_dia2 }})</span>
      </div>
    </div>

    <div class="info-item">
      <div class="info-label">Velocidade de leitura considerada:</div>
      <div class="info-value">
        {{ provaInfo.velocidade_leitura }} caracteres/minuto
        <span class="info-reference">(Referência: Messias et al., 2008)</span>
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
  padding: 1.5rem 0;
  margin: 1.5rem 0;
}

.info-item {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 0;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-label {
  min-width: 200px;
  color: #333;
  font-size: 0.95rem;
  font-weight: 600;
}

.info-value {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.3rem;
  color: #0070C0;
  font-weight: 600;
  font-size: 0.95rem;
}

.info-day-info {
  color: #666;
  font-size: 0.85rem;
  font-weight: 400;
  margin: 0;
}

.info-reference {
  color: #666;
  font-size: 0.85rem;
  font-weight: 400;
}

@media (max-width: 768px) {
  .prova-info {
    padding: 1rem 0;
  }

  .info-item {
    flex-direction: column;
    gap: 0.25rem;
    align-items: flex-start;
  }

  .info-label {
    min-width: auto;
  }

  .info-value {
    flex-direction: column;
    gap: 0.15rem;
  }
}
</style>
