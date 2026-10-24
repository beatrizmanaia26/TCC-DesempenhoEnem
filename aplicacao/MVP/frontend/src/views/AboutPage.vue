<template>
  <div class="about-container">
    <header class="about-header">
      <button @click="goHome" class="btn-back">← Voltar</button>
      <h1>Sobre o Sistema</h1>
    </header>

    <main class="about-content">
      <section class="about-section">
        <h2>O que é?</h2>
        <p>Um sistema de análise de provas baseado no padrão ENEM. Permite extrair e analisar métricas detalhadas de arquivos PDF, identificando padrões de estrutura, complexidade e características pedagógicas que influenciam o desempenho dos alunos.</p>
      </section>

      <section class="about-section">
        <h2>Objetivo</h2>
        <p>Projeto de TCC que busca estabelecer correlações entre características das provas (formalismo, distratores, tempo de leitura, estrutura) e o desempenho dos estudantes.</p>
      </section>

      <section class="about-section">
        <h2>Tipos de Análise</h2>
        <div class="analysis-list">
          <div class="analysis-item">
            <h3>Análise Completa</h3>
            <p>Executa todas as análises disponíveis em uma única execução.</p>
          </div>
          <div class="analysis-item">
            <h3>Análise de Distratores</h3>
            <p>Avalia a qualidade dos distratores (alternativas incorretas) através de análise de similaridade com a resposta correta.</p>
          </div>
          <div class="analysis-item">
            <h3>Análise de Formalismo</h3>
            <p>Classifica o nível de formalidade da linguagem utilizada em cada questão usando modelos de NLP.</p>
          </div>
          <div class="analysis-item">
            <h3>Análise de Tempo de Leitura</h3>
            <p>Estima o tempo necessário para ler e entender cada questão baseado na quantidade de caracteres.</p>
          </div>
          <div class="analysis-item">
            <h3>Análise de Estrutura</h3>
            <p>Analisa a distribuição e organização das questões, incluindo quantidade de palavras e padrões.</p>
          </div>
        </div>
      </section>

      <section class="about-section">
        <h2>Tecnologias</h2>
        <ul class="tech-list">
          <li><strong>Frontend:</strong> Vue 3 + Vite</li>
          <li><strong>Backend:</strong> Node.js + Express</li>
          <li><strong>Análise:</strong> Python + ......</li>
        </ul>
      </section>
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
const goHome = () => router.push('/')
</script>

<style scoped>
.about-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.about-header {
  max-width: 900px;
  margin: 0 auto 3rem;
}

.btn-back {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid white;
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  margin-bottom: 1rem;
  transition: all 0.3s ease;
  font-size: 0.95rem;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.3);
}

.about-header h1 {
  color: white;
  font-size: 2.5rem;
  margin: 0;
  font-weight: 700;
}

.about-content {
  max-width: 900px;
  margin: 0 auto;
}

.about-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

.about-section h2 {
  color: #333;
  font-size: 1.8rem;
  margin: 0 0 1.5rem 0;
  border-bottom: 3px solid #667eea;
  padding-bottom: 0.5rem;
}

.about-section p {
  color: #555;
  line-height: 1.8;
  font-size: 1rem;
  margin: 0;
}

.analysis-list {
  display: grid;
  gap: 1.5rem;
}

.analysis-item {
  background: #f9f9f9;
  border-left: 4px solid #667eea;
  padding: 1.5rem;
  border-radius: 6px;
}

.analysis-item h3 {
  color: #333;
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
}

.analysis-item p {
  color: #666;
  margin: 0;
  font-size: 0.95rem;
}

.tech-list {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}

.tech-list li {
  color: #555;
  padding: 0.75rem;
  background: #f9f9f9;
  border-radius: 6px;
  border-left: 3px solid #667eea;
}

@media (max-width: 768px) {
  .about-header h1 {
    font-size: 1.8rem;
  }
}
</style>

