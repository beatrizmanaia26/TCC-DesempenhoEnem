<template>
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" :aria-label="`Arquivo ${rotulo}`">
    <path d="M6 2h11l6 6v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" :fill="cor" />
    <path d="M17 2v6h6" fill="#FFFFFF" fill-opacity="0.35" />
    <text x="14" y="19" text-anchor="middle" font-size="7" font-weight="700" font-family="Arial, sans-serif" fill="#FFFFFF">{{ rotulo }}</text>
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  formato: {
    type: String,
    required: true
  }
})

// Cores de cada formato: vermelho para PDF, verde para Excel e azul para CSV
const CORES = {
  pdf: { rotulo: 'PDF', cor: '#D32F2F' },
  xlsx: { rotulo: 'XLS', cor: '#1D7044' },
  csv: { rotulo: 'CSV', cor: '#0070C0' }
}

const rotulo = computed(() => CORES[props.formato]?.rotulo ?? '')
const cor = computed(() => CORES[props.formato]?.cor ?? '#666666')
</script>
