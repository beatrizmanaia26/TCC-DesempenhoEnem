<template>
  <header class="header">
    <div class="header-content">
      <router-link to="/" class="logo">
        <span class="logo-icon">logo e add logo no google</span>
        <span class="logo-text"> ou outro nome ver cm lu e nuno</span>
      </router-link>
      <nav class="nav">
        <router-link to="/" class="nav-link">Análise</router-link>
        <router-link to="/enem" class="nav-link">ENEM</router-link>
        <router-link to="/about" class="nav-link">Sobre</router-link>
      </nav>
    </div>
  </header>
</template>

<script setup>
</script>

<style scoped>
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: white;
  font-weight: 700;
  font-size: 1.3rem;
  transition: opacity 0.3s ease;
}

.logo:hover {
  opacity: 0.8;
}

.logo-icon {
  font-size: 1.5rem;
}

.nav {
  display: flex;
  gap: 2rem;
}

.nav-link {
  color: white;
  text-decoration: none;
  font-weight: 600;
  transition: opacity 0.3s ease;
  padding: 0.5rem 0;
  border-bottom: 2px solid transparent;
}

.nav-link:hover,
.nav-link.router-link-active {
  opacity: 0.8;
  border-bottom-color: white;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }

  .nav {
    width: 100%;
    justify-content: center;
  }
}
</style>

