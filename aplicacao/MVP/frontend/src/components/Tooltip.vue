<template>
  <div class="tooltip-container">
    <div class="tooltip-trigger" @mouseenter="show = true" @mouseleave="show = false">
      <slot />
      <span class="info-icon">ℹ️</span>
    </div>
    <div v-if="show" class="tooltip-content">
      {{ content }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  content: {
    type: String,
    required: true
  }
})

const show = ref(false)
</script>

<style scoped>
.tooltip-container {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.tooltip-trigger {
  display: flex;
  align-items: center;
  cursor: help;
}

.info-icon {
  font-size: 1.1rem;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.tooltip-trigger:hover .info-icon {
  opacity: 1;
}

.tooltip-content {
  position: absolute;
  bottom: 110%;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  white-space: nowrap;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.tooltip-content::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: #333;
}

@media (max-width: 768px) {
  .tooltip-content {
    white-space: normal;
    max-width: 200px;
  }
}
</style>

