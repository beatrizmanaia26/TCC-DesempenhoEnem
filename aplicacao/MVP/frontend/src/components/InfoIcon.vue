<template>
  <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" :fill="fill">
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
</template>

<script setup>
defineProps({
  fill: {
    type: String,
    default: '#667eea',
  },
})
</script>

<style scoped>
svg {
  cursor: help;
  transition: opacity 0.3s ease;
}

svg:hover {
  opacity: 0.7;
}
</style>