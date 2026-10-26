<template>
  <header class="header">
    <div class="header-content">
      <router-link to="/" class="logo-container">
        <img src="@/assets/images/logo.svg" alt="DesemProv Logo" class="logo-icon" />
        <div class="logo-text-group">
          <div class="logo-title">
            <span class="logo-desem">desem</span><span class="logo-prov">prov</span>
          </div>
          <div class="logo-subtitulo">Análise Estrutural de Provas</div>
        </div>
      </router-link>
      <nav class="nav">
        <router-link to="/" class="nav-link" active-class="active">Análise</router-link>
        <router-link to="/enem" class="nav-link" active-class="active">ENEM</router-link>
        <router-link to="/about" class="nav-link" active-class="active">Sobre</router-link>
      </nav>
    </div>
  </header>
</template>

<script setup>
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');

.header {
  background-color: #0070C0;
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

.logo-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  text-decoration: none;
  color: white;
  transition: opacity 0.3s ease;
}

.logo-container:hover {
  opacity: 0.8;
}

.logo-icon {
  width: 50px;
  height: 50px;
  object-fit: contain;
  flex-shrink: 0;
}

.logo-text-group {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.logo-title {
  display: flex;
  gap: 0.3rem;
  align-items: baseline;
}

.logo-desem {
  font-family: 'Inter', -apple-system, sans-serif;
  font-weight: 400;
  font-size: 1.5rem;
  color: #FFFFFF;
  letter-spacing: -0.5px;
}

.logo-prov {
  font-family: 'Inter', -apple-system, sans-serif;
  font-weight: 800;
  font-size: 1.8rem;
  color: #10B981;
  letter-spacing: -0.5px;
}

.logo-subtitulo {
  font-family: 'Inter', -apple-system, sans-serif;
  font-weight: 600;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #93C5FD;
}

.nav {
  display: flex;
  gap: 2rem;
}

.nav-link {
  color: #E2E8F0;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
  padding: 0.5rem 0;
  border-bottom: 2px solid transparent;
}

.nav-link:hover {
  color: #34D399;
  border-bottom-color: #34D399;
}

.nav-link.active {
  color: #34D399;
  border-bottom-color: #34D399;
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

  .logo-desem {
    font-size: 1.2rem;
  }

  .logo-prov {
    font-size: 1.4rem;
  }

  .logo-subtitulo {
    font-size: 0.55rem;
  }
}
</style>

