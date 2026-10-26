<template>
  <span class="info-icon-wrapper">
    <svg 
      width="16" 
      height="16" 
      viewBox="0 0 16 16" 
      xmlns="http://www.w3.org/2000/svg" 
      :fill="fill"
      :class="{ warning: isWarning }"
      class="info-icon"
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M7 1.40001C3.9072 1.40001 1.4 3.90721 1.4 7.00001C1.4 10.0928 3.9072 12.6 7 12.6C10.0928 12.6 12.6 10.0928 12.6 7.00001C12.6 3.90721 10.0928 1.40001 7 1.40001ZM7 0C10.866 0 14 3.13401 14 7C14 10.866 10.866 14 7 14C3.13401 14 0 10.866 0 7C0 3.13401 3.13401 0 7 0Z"
        fill="currentColor"
      />
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M6.29999 7.7V3.5H7.69999V7.7H6.29999Z"
        fill="currentColor"
      />
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M6.99999 9.09998C7.38659 9.09998 7.69999 9.41338 7.69999 9.79998C7.69999 10.1866 7.38659 10.5 6.99999 10.5C6.61339 10.5 6.29999 10.1866 6.29999 9.79998C6.29999 9.41338 6.61339 9.09998 6.99999 9.09998Z"
        fill="currentColor"
      />
    </svg>
    <div v-if="tooltip" class="tooltip">
      {{ tooltip }}
    </div>
  </span>
</template>

<script setup>
defineProps({
  fill: {
    type: String,
    default: '#0070C0',
  },
  tooltip: {
    type: String,
    default: '',
  },
  warning: {
    type: Boolean,
    default: false,
  },
})

const isWarning = () => {
  return warning
}
</script>

<style scoped>
.info-icon-wrapper {
  position: relative;
  display: inline-flex;
  margin-left: 0.5rem;
  vertical-align: middle;
}

.info-icon {
  cursor: help;
  transition: opacity 0.3s ease;
  width: 18px;
  height: 18px;
}

.info-icon:hover {
  opacity: 0.7;
}

.info-icon.warning {
  color: #000000;
}

.tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  white-space: normal;
  width: 250px;
  margin-bottom: 0.5rem;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
  z-index: 1000;
  pointer-events: none;
  line-height: 1.4;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.9);
}

.info-icon-wrapper:hover .tooltip {
  opacity: 1;
  visibility: visible;
}

@media (max-width: 768px) {
  .tooltip {
    width: 200px;
    font-size: 0.8rem;
  }
}
</style>