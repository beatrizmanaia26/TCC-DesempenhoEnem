<template>
  <div class="grafico-palavras-prova">
    <div class="grafico-cabecalho">
      <h3 class="grafico-titulo">{{ TEXTO_PALAVRAS.titulo }}</h3>
      <InfoIcon warning :tooltip="tooltip" />
      <div class="filter-wrapper">
        <button type="button" class="filter-btn" @click="alternarMenuFiltro">
          <FilterIcon />
          Filtro
        </button>
        <div v-if="mostrarFiltro" class="filter-menu">
          <div class="filter-secao">
            <p class="filter-titulo">MÉTRICAS</p>
            <div class="filter-lista">
              <div class="filter-option" v-for="opcao in opcoesMetricas" :key="`metrica-${opcao.valor}`">
                <input
                  type="radio"
                  name="filtro-metrica-palavras-prova"
                  :id="`palavras-prova-metrica-${opcao.valor}`"
                  :checked="rascunhoMetrica === opcao.valor"
                  @change="rascunhoMetrica = opcao.valor"
                />
                <label :for="`palavras-prova-metrica-${opcao.valor}`">{{ opcao.rotulo }}</label>
                <InfoIcon v-if="opcao.dica" warning :tooltip="opcao.dica" />
              </div>
            </div>
          </div>
          <div class="filter-rodape">
            <button type="button" class="filter-aplicar" @click="aplicarFiltro">Aplicar</button>
          </div>
        </div>
      </div>
    </div>
    <p class="grafico-subtitulo">{{ TEXTO_PALAVRAS.subtitulo }}</p>

    <div v-if="dica" class="dica-flutuante" :style="{ left: `${dica.x}px`, top: `${dica.y}px` }">{{ dica.texto }}</div>

    <p v-if="questoesFiltradas.length === 0" class="grafico-status">Nenhuma questão corresponde ao filtro escolhido.</p>

    <div v-else class="barras">
      <div
        v-for="questao in questoesFiltradas"
        :key="questao.rotulo"
        class="barra-linha"
        :title="`${questao.rotulo}: ${questao.palavras} palavras no enunciado, ${questao.palavrasAlternativas} nas alternativas`"
      >
        <span class="barra-rotulo">{{ questao.rotulo }}</span>
        <div class="barra-trilho">
          <div
            class="barra"
            :style="{ width: larguraBarra(questao.palavras) }"
            @mouseenter="mostrarDica($event, 'Quantidade de palavras do enunciado')"
            @mousemove="moverDica"
            @mouseleave="ocultarDica"
          ></div>
          <div
            class="barra barra-alternativas"
            :style="{ left: larguraBarra(questao.palavras), width: larguraBarra(questao.palavrasAlternativas) }"
            @mouseenter="mostrarDica($event, 'Quantidade de palavras das alternativas')"
            @mousemove="moverDica"
            @mouseleave="ocultarDica"
          ></div>
        </div>
        <span class="barra-valor">{{ questao.palavras }} - {{ questao.palavrasAlternativas }}</span>
      </div>
      <p class="eixo-x">Palavras do enunciado - palavras das alternativas</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import FilterIcon from '@/components/icons/FilterIcon.vue'
import InfoIcon from '@/components/icons/InfoIcon.vue'
import { aplicarMetrica } from '@/services/filtrosAnalise.js'
import { TEXTO_PALAVRAS, DICA_OUTLIERS_PALAVRAS, DICA_DESVIO_PALAVRAS } from '@/config/textosAnalises.js'

// questoes: [{ rotulo, palavras, palavrasAlternativas }], na ordem da prova
const props = defineProps({
  questoes: {
    type: Array,
    default: () => []
  }
})

const opcoesMetricas = [
  { valor: 'padrao', rotulo: 'Ordem da prova' },
  { valor: 'menor', rotulo: 'Menor quantidade' },
  { valor: 'maior', rotulo: 'Maior quantidade' },
  { valor: 'media', rotulo: 'Acima da média' },
  { valor: 'abaixo', rotulo: 'Abaixo da média' },
  { valor: 'outlier', rotulo: 'Outliers', dica: DICA_OUTLIERS_PALAVRAS },
  { valor: 'desvio', rotulo: 'Fora do desvio padrão', dica: DICA_DESVIO_PALAVRAS }
]

// Filtro aplicado (usado no gráfico) e rascunho (muda enquanto o menu está aberto)
const filtroMetrica = ref('padrao')
const rascunhoMetrica = ref('padrao')
const mostrarFiltro = ref(false)

const alternarMenuFiltro = () => {
  if (!mostrarFiltro.value) {
    rascunhoMetrica.value = filtroMetrica.value
  }
  mostrarFiltro.value = !mostrarFiltro.value
}

const aplicarFiltro = () => {
  filtroMetrica.value = rascunhoMetrica.value
  mostrarFiltro.value = false
}

const questoesFiltradas = computed(() =>
  aplicarMetrica(props.questoes, filtroMetrica.value, (questao) => questao.palavras)
)

// Escala comum: a questão mais longa da prova (enunciado + alternativas) ocupa 100%
const maiorQuestao = computed(() =>
  props.questoes.reduce(
    (maior, questao) => (questao.palavras + questao.palavrasAlternativas > maior.total
      ? { rotulo: questao.rotulo, total: questao.palavras + questao.palavrasAlternativas }
      : maior),
    { rotulo: '', total: 0 }
  )
)

const mediaPalavras = computed(() => {
  if (props.questoes.length === 0) return 0
  const total = props.questoes.reduce((soma, questao) => soma + questao.palavras + questao.palavrasAlternativas, 0)
  return Math.round(total / props.questoes.length)
})

const tooltip = computed(() => [
  'Cada barra é uma questão. A parte em degradê azul-verde mostra as palavras do enunciado e a parte azul claro mostra as palavras das alternativas.',
  '',
  'Valor: enunciado - alternativas (ex.: 128 - 45).',
  '',
  'Cálculos:',
  '• Enunciado = palavras do texto da questão, sem as alternativas.',
  '• Alternativas = palavras de todas as alternativas da questão, separadas por espaço.',
  `• Barra = palavras do enunciado + alternativas, em proporção à questão mais longa da prova (${maiorQuestao.value.rotulo}: ${maiorQuestao.value.total} palavras).`,
  `• Média da prova: ${mediaPalavras.value} palavras por questão (enunciado + alternativas).`
].join('\n'))

// Balão escuro que segue o mouse sobre as partes da barra (mesmo padrão do gráfico do ENEM)
const dica = ref(null)

const mostrarDica = (evento, texto) => {
  dica.value = { x: evento.clientX + 12, y: evento.clientY + 12, texto }
}

const moverDica = (evento) => {
  if (dica.value) {
    dica.value = { ...dica.value, x: evento.clientX + 12, y: evento.clientY + 12 }
  }
}

const ocultarDica = () => {
  dica.value = null
}

const larguraBarra = (palavras) => {
  if (maiorQuestao.value.total === 0) return '0%'
  return `${(palavras / maiorQuestao.value.total) * 100}%`
}
</script>

<style scoped>
.grafico-palavras-prova {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e0e0e0;
}

.grafico-cabecalho {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.grafico-titulo {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
}

.grafico-subtitulo {
  margin: 0 0 1.5rem;
  color: #666;
  font-size: 0.9rem;
}

.grafico-status {
  color: #666;
  padding: 1rem 0;
}

.barras {
  max-height: 520px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.barra-linha {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 4px;
  font-size: 0.75rem;
}

.barra-rotulo {
  min-width: 60px;
  white-space: nowrap;
  text-align: right;
  color: #333;
  font-weight: 600;
}

.barra-trilho {
  position: relative;
  flex: 1;
  background: #f0f0f0;
  border-radius: 3px;
  height: 12px;
}

.barra {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  height: 100%;
  background: linear-gradient(90deg, #0070C0 0%, #10B981 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.barra-alternativas {
  background: #93c5fd;
}

.barra-valor {
  width: 5.5rem;
  flex-shrink: 0;
  white-space: nowrap;
  color: #666;
}

.dica-flutuante {
  position: fixed;
  z-index: 1000;
  pointer-events: none;
  background: #333;
  color: #fff;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  font-size: 0.8rem;
  width: 260px;
  white-space: normal;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.eixo-x {
  margin: 0.75rem 0 0;
  color: #666;
  font-size: 0.8rem;
  text-align: center;
}

.filter-wrapper {
  position: relative;
  display: inline-block;
  margin-left: auto;
}



.filter-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  padding: 1rem;
  margin-top: 0.5rem;
  min-width: 280px;
  z-index: 100;
}

.filter-secao + .filter-secao {
  margin-top: 1rem;
  border-top: 1px solid #e0e0e0;
  padding-top: 1rem;
}

.filter-titulo {
  margin: 0 0 0.25rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #555;
}

.filter-lista {
  /* 2 opções visíveis por seção (cada .filter-option tem 2.25rem); o restante rola */
  max-height: 4.5rem;
  overflow-y: auto;
}

.filter-option {
  display: flex;
  align-items: center;
  height: 2.25rem;
  padding: 0 0.75rem;
  margin: 0;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.filter-option:hover {
  background: #f5f5f5;
}

.filter-option input {
  margin-right: 0.75rem;
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #0070C0;
}

.filter-option label {
  cursor: pointer;
  margin: 0;
  font-size: 0.95rem;
  color: #333;
  flex: 1;
}

.filter-rodape {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.filter-aplicar {
  background: #0070C0;
  color: white;
  border: none;
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.3s ease;
}

.filter-aplicar:hover {
  background: #005a9e;
}

</style>
