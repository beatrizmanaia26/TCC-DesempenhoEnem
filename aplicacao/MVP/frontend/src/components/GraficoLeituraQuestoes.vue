<template>
  <div class="grafico-tempo">
    <div class="grafico-cabecalho">
      <h3 class="grafico-titulo">Tempo de Leitura e Média de Tempo Disponível para Resolver Cada Questão</h3>
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
              <div class="filter-option" v-for="opcao in opcoesTempo" :key="`tempo-${opcao.valor}`">
                <input
                  type="radio"
                  name="filtro-tempo"
                  :id="`tempo-${opcao.valor}`"
                  :checked="rascunhoTempo === opcao.valor"
                  @change="rascunhoTempo = opcao.valor"
                />
                <label :for="`tempo-${opcao.valor}`">{{ opcao.rotulo }}</label>
                <InfoIcon v-if="opcao.dica" warning :tooltip="opcao.dica" />
              </div>
            </div>
          </div>

          <div v-if="temDificuldade" class="filter-secao">
            <p class="filter-titulo">DIFICULDADE</p>
            <div class="filter-lista">
              <div class="filter-option" v-for="opcao in opcoesDificuldade" :key="`dificuldade-${opcao.valor}`">
                <input
                  type="radio"
                  name="filtro-dificuldade"
                  :id="`dificuldade-${opcao.valor}`"
                  :checked="rascunhoDificuldade === opcao.valor"
                  @change="rascunhoDificuldade = opcao.valor"
                />
                <label :for="`dificuldade-${opcao.valor}`">{{ opcao.rotulo }}</label>
              </div>
            </div>
          </div>

          <div class="filter-rodape">
            <button type="button" class="filter-aplicar" @click="aplicarFiltro">Aplicar</button>
          </div>
        </div>
      </div>
    </div>
    <p class="grafico-subtitulo">
      Comparativo do tempo de leitura individual de cada questão frente ao tempo médio de resolução por item.
    </p>
    <div class="legenda-grafico">
      <span class="legenda-item"><span class="legenda-quadrado legenda-quadrado-azul"></span>Tempo de leitura individual de cada questão</span>
      <span class="legenda-item legenda-media-texto">Tempo médio por questão: {{ tempoMedio.toFixed(2) }} min</span>
      <InfoIcon warning :tooltip="textoCalculoMedia" />
    </div>
    <div v-if="itensFiltrados.length === 0" class="sem-resultado">
      <div class="sem-resultado-icone">
        <FilterIcon />
      </div>
      <p class="sem-resultado-titulo">Nenhuma questão corresponde ao filtro escolhido</p>
      <p class="sem-resultado-texto">{{ descricaoFiltro }}</p>
      <button type="button" class="sem-resultado-limpar" @click="limparFiltro">Limpar filtro</button>
    </div>
    <div v-else class="grafico-corpo">
      <div class="bloco-grafico">
        <p class="bloco-titulo">Tempo de leitura das questões em minutos</p>
        <div class="barras-cabecalho">
          <span class="barras-cabecalho-texto">Questões</span>
        </div>
        <div class="barras">
          <div v-for="item in itensFiltrados" :key="item.rotulo" class="barra-linha">
            <span class="barra-rotulo">{{ item.rotulo }}</span>
            <div
              class="barra-trilho"
              @mouseenter="mostrarDica($event)"
              @mousemove="moverDica"
              @mouseleave="ocultarDica"
            >
              <div
                class="barra barra-leitura"
                :title="`${item.rotulo}: ${item.caracteres} caracteres, ${item.minutos.toFixed(2)} min`"
                :style="{ width: percentualLeitura(item.minutos) + '%' }"
              ></div>
            </div>
            <span class="barra-valor">{{ item.minutos.toFixed(2) }} min</span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="dica" class="dica-flutuante" :style="{ left: `${dica.x}px`, top: `${dica.y}px` }">{{ dica.texto }}</div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import FilterIcon from '@/components/icons/FilterIcon.vue'
import InfoIcon from '@/components/icons/InfoIcon.vue'
import { aplicarMetrica, filtrarDificuldade } from '@/services/filtrosAnalise.js'
import { DICA_OUTLIERS_TEMPO, DICA_DESVIO_TEMPO } from '@/config/textosAnalises.js'

/*
 * itens: [{ rotulo: 'Q1', caracteres, minutos, dificuldade }, ...]
 *   dificuldade é 'facil' | 'medio' | 'dificil' ou null (sem informação)
 * tempoMedio: tempo restante da prova ÷ número de questões (linha preta), em minutos
 * tooltip: texto explicativo exibido no ícone de informação
 * totalQuestoes: número de questões, usado na dica que aparece ao passar o mouse
 */
const props = defineProps({
  itens: { type: Array, required: true },
  tempoMedio: { type: Number, required: true },
  tooltip: { type: String, default: '' },
  totalQuestoes: { type: Number, default: 0 }
})

// Filtros: dificuldade só aparece se o usuário informou a dificuldade no formulário
const temDificuldade = computed(() => props.itens.some((item) => item.dificuldade))

const opcoesTempo = [
  { valor: 'padrao', rotulo: 'Ordem da prova' },
  { valor: 'menor', rotulo: 'Menor tempo' },
  { valor: 'maior', rotulo: 'Maior tempo' },
  { valor: 'media', rotulo: 'Acima da média' },
  { valor: 'abaixo', rotulo: 'Abaixo da média' },
  { valor: 'outlier', rotulo: 'Outliers', dica: DICA_OUTLIERS_TEMPO },
  { valor: 'desvio', rotulo: 'Fora do desvio padrão', dica: DICA_DESVIO_TEMPO }
]
const opcoesDificuldade = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'facil', rotulo: 'Fácil' },
  { valor: 'medio', rotulo: 'Média' },
  { valor: 'dificil', rotulo: 'Difícil' }
]

const filtroTempo = ref('padrao')
const filtroDificuldade = ref('todas')
const rascunhoTempo = ref('padrao')
const rascunhoDificuldade = ref('todas')
const mostrarFiltro = ref(false)

const alternarMenuFiltro = () => {
  if (!mostrarFiltro.value) {
    rascunhoTempo.value = filtroTempo.value
    rascunhoDificuldade.value = filtroDificuldade.value
  }
  mostrarFiltro.value = !mostrarFiltro.value
}

const aplicarFiltro = () => {
  filtroTempo.value = rascunhoTempo.value
  filtroDificuldade.value = rascunhoDificuldade.value
  mostrarFiltro.value = false
}

// Texto com os filtros aplicados, mostrado quando nenhuma questão corresponde
const descricaoFiltro = computed(() => {
  const metrica = opcoesTempo.find((opcao) => opcao.valor === filtroTempo.value)?.rotulo || 'Ordem da prova'
  const partes = [`Métrica: ${metrica}`]
  if (temDificuldade.value && filtroDificuldade.value !== 'todas') {
    const dificuldade = opcoesDificuldade.find((opcao) => opcao.valor === filtroDificuldade.value)?.rotulo
    partes.push(`Dificuldade: ${dificuldade}`)
  }
  return partes.join(' · ') + '. Tente outra combinação de filtros.'
})

const limparFiltro = () => {
  filtroTempo.value = 'padrao'
  filtroDificuldade.value = 'todas'
  rascunhoTempo.value = 'padrao'
  rascunhoDificuldade.value = 'todas'
}

// Mesmas regras do ENEM: dificuldade primeiro, depois a métrica de tempo
const itensFiltrados = computed(() => {
  const porDificuldade = temDificuldade.value
    ? filtrarDificuldade(props.itens, filtroDificuldade.value)
    : props.itens
  return aplicarMetrica(porDificuldade, filtroTempo.value, (item) => item.minutos)
})

// Escala do bloco de leitura: a maior leitura ocupa 100% do trilho (não usa o tempo médio)
const escalaLeitura = computed(() => {
  const maiores = props.itens.map((item) => item.minutos)
  return Math.max(...maiores, 0) || 1
})

const percentualLeitura = (minutos) => (minutos / escalaLeitura.value) * 100

// Texto do ! ao lado da legenda: explica de onde vem a linha do tempo médio por questão
const textoCalculoMedia = computed(() =>
  `Tempo médio por questão: ${props.tempoMedio.toFixed(2)} min.\nO tempo total da prova, descontado o tempo de leitura das questões e dos textos introdutórios, é dividido igualmente entre as ${props.totalQuestoes} questões.`
)

// Dica flutuante ao passar o mouse sobre o trilho (mesmo comportamento do gráfico do ENEM)
const dica = ref(null)
const textoDica = computed(() =>
  `Tempo para resolver cada questão: ${props.tempoMedio.toFixed(2)} min (restante da prova ÷ ${props.totalQuestoes} questões).`
)
const mostrarDica = (evento) => {
  dica.value = { x: evento.clientX + 12, y: evento.clientY + 12, texto: textoDica.value }
}
const moverDica = (evento) => {
  if (dica.value) {
    dica.value = { ...dica.value, x: evento.clientX + 12, y: evento.clientY + 12 }
  }
}
const ocultarDica = () => {
  dica.value = null
}
</script>

<style scoped>
.grafico-tempo {
  width: 100%;
}

.grafico-cabecalho {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.grafico-titulo {
  margin: 0;
  color: #263238;
  font-size: 1.25rem;
}

.grafico-subtitulo {
  margin: 0.25rem 0 1rem;
  color: #666;
  font-size: 0.95rem;
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
  color: #666;
  letter-spacing: 0.05em;
}

.filter-lista {
  display: flex;
  flex-direction: column;
  max-height: 7.5rem;
  overflow-y: auto;
}

.filter-lista > .filter-option {
  min-height: 2.5rem;
  margin: 0;
  flex-shrink: 0;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.25rem;
  border-radius: 4px;
}

.filter-option:hover {
  background: #f5f5f5;
}

.filter-option input {
  accent-color: #0070C0;
  cursor: pointer;
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
  padding-top: 0.75rem;
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
}

.filter-aplicar:hover {
  background: #005a9e;
}

.sem-resultado {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem 1.5rem;
  margin: 1rem 0;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  text-align: center;
}

.sem-resultado-icone {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #e6f0fa;
  color: #0070C0;
}

.sem-resultado-titulo {
  margin: 0.25rem 0 0;
  font-weight: 600;
  color: #263238;
  font-size: 1rem;
}

.sem-resultado-texto {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
  max-width: 420px;
}

.sem-resultado-limpar {
  margin-top: 0.5rem;
  background: white;
  color: #0070C0;
  border: 2px solid #0070C0;
  padding: 0.4rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.sem-resultado-limpar:hover {
  background: #f0f7ff;
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

.legenda-grafico {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.25rem;
  margin: 0 0 1rem;
  font-size: 0.9rem;
  color: #333;
}

.legenda-item {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.legenda-quadrado {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 3px;
}

.legenda-quadrado-azul {
  background: #0070C0;
}

.legenda-media-texto {
  color: #374151;
}

.barras-cabecalho {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 4px;
  font-size: 0.75rem;
}

.barras-cabecalho-texto {
  min-width: 60px;
  text-align: right;
  white-space: nowrap;
  color: #6b7280;
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
  background: #0070C0;
  border-radius: 3px;
}

.barra-valor {
  min-width: 40px;
  color: #666;
}

.bloco-titulo {
  margin: 0 0 0.5rem;
  color: #666;
  font-size: 0.8rem;
  text-align: center;
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
</style>
