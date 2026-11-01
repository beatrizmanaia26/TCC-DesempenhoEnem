<template>
  <div class="correlacao-colunas">
    <div class="correlacao-cabecalho">
      <h3 class="correlacao-titulo">{{ TEXTO_COLUNAS_DIFICULDADE.titulo }}</h3>
      <InfoIcon warning :tooltip="tooltipColunas" />
      <div class="filter-wrapper">
        <button type="button" class="filter-btn" @click="alternarMenuFiltro">
          <FilterIcon />
          Filtro
        </button>
        <div v-if="mostrarFiltro" class="filter-menu">
          <div class="filter-secao">
            <p class="filter-titulo">DIA</p>
            <div class="filter-lista">
              <div class="filter-option" v-for="opcao in opcoesDia" :key="`dia-${opcao.valor}`">
                <input
                  type="radio"
                  name="filtro-dia-correlacao"
                  :id="`correlacao-dia-${opcao.valor}`"
                  :checked="rascunhoDia === opcao.valor"
                  @change="rascunhoDia = opcao.valor"
                />
                <label :for="`correlacao-dia-${opcao.valor}`">{{ opcao.rotulo }}</label>
              </div>
            </div>
          </div>

          <div class="filter-secao">
            <p class="filter-titulo">ÁREA</p>
            <div class="filter-lista">
              <div class="filter-option" v-for="opcao in opcoesArea" :key="`area-${opcao.valor}`">
                <input
                  type="checkbox"
                  :id="`correlacao-area-${opcao.valor}`"
                  :checked="rascunhoAreas.includes(opcao.valor)"
                  @change="alternarArea(opcao.valor)"
                />
                <label :for="`correlacao-area-${opcao.valor}`">{{ opcao.rotulo }}</label>
              </div>
            </div>
          </div>

          <div class="filter-rodape">
            <button type="button" class="filter-aplicar" @click="aplicarFiltro">Aplicar</button>
          </div>
        </div>
      </div>
    </div>
    <p class="correlacao-subtitulo">{{ TEXTO_COLUNAS_DIFICULDADE.subtitulo }}</p>

    <div v-if="carregando" class="correlacao-status">Carregando correlações...</div>
    <div v-else-if="erro" class="correlacao-status correlacao-erro">{{ erro }}</div>
    <p v-else-if="barras.length === 0" class="correlacao-status">Sem dados para o filtro escolhido.</p>

    <svg
      v-else
      class="grafico-colunas"
      :viewBox="`0 0 ${LARGURA} ${ALTURA}`"
      role="img"
      aria-label="Gráfico de colunas da correlação de Spearman entre caracteres e acerto por nível de dificuldade"
    >
      <line :x1="MARGEM_ESQ" :y1="yDe(0)" :x2="LARGURA - MARGEM_DIR" :y2="yDe(0)" class="eixo" />

      <text
        v-for="marca in MARCAS_EIXO"
        :key="`marca-${marca}`"
        :x="MARGEM_ESQ - 10"
        :y="yDe(marca) + 4"
        class="rotulo-eixo"
        text-anchor="end"
      >{{ marca }}</text>

      <g v-for="(barra, i) in barras" :key="barra.nivel">
        <rect
          :x="xDoNivel(i)"
          :y="Math.min(yDe(0), yDe(barra.r))"
          :width="LARGURA_COLUNA"
          :height="Math.abs(yDe(barra.r) - yDe(0))"
          :fill="barra.r >= 0 ? COR_VERDE : COR_AZUL"
        />

        <text
          :x="xDoNivel(i) + LARGURA_COLUNA / 2"
          :y="barra.r >= 0 ? yDe(barra.r) - 22 : yDe(barra.r) + 30"
          class="valor-coluna"
          text-anchor="middle"
        >r = {{ barra.r.toFixed(2) }}</text>
        <text
          :x="xDoNivel(i) + LARGURA_COLUNA / 2"
          :y="barra.r >= 0 ? yDe(barra.r) - 8 : yDe(barra.r) + 44"
          class="p-coluna"
          text-anchor="middle"
        >p (Holm) = {{ formatarP(barra.p) }} · n = {{ barra.n }}</text>

        <text
          :x="xDoNivel(i) + LARGURA_COLUNA / 2"
          :y="ALTURA - 12"
          class="rotulo-nivel"
          text-anchor="middle"
        >{{ barra.rotulo }}</text>
      </g>
    </svg>

    <ul v-if="!carregando && !erro" class="correlacao-legenda">
      <li v-for="(texto, indice) in TEXTO_COLUNAS_DIFICULDADE.notas" :key="indice">{{ texto }}</li>
    </ul>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import http from '../services/http.js'
import InfoIcon from './icons/InfoIcon.vue'
import FilterIcon from './icons/FilterIcon.vue'
import { TEXTO_COLUNAS_DIFICULDADE } from '../config/textosAnalises.js'

const props = defineProps({
  ano: {
    type: Number,
    required: true
  }
})

// Ordem fixa dos níveis e rótulos exibidos
const NIVEIS = [
  { chave: 'facil', rotulo: 'Fácil' },
  { chave: 'media', rotulo: 'Média' },
  { chave: 'dificil', rotulo: 'Difícil' }
]

// Áreas de cada dia da prova (cada área cai em um só dia)
const AREAS_POR_DIA = {
  1: [
    { valor: 'LC', rotulo: 'Linguagens e Códigos' },
    { valor: 'CH', rotulo: 'Ciências Humanas' }
  ],
  2: [
    { valor: 'CN', rotulo: 'Ciências da Natureza' },
    { valor: 'MT', rotulo: 'Matemática' }
  ]
}
const TODAS_AREAS = [...AREAS_POR_DIA[1], ...AREAS_POR_DIA[2]]

const opcoesDia = [
  { valor: 'todos', rotulo: 'Todos os dias' },
  { valor: 1, rotulo: 'Dia 1' },
  { valor: 2, rotulo: 'Dia 2' }
]

// Filtros aplicados (usados no gráfico)
const filtroDia = ref('todos')
const filtroAreas = ref([])

// Rascunho: muda enquanto o usuário marca as opções e só vira aplicado no botão Aplicar
const mostrarFiltro = ref(false)
const rascunhoDia = ref('todos')
const rascunhoAreas = ref([])

// As áreas exibidas dependem do dia escolhido no rascunho
const opcoesArea = computed(() =>
  rascunhoDia.value === 'todos' ? TODAS_AREAS : AREAS_POR_DIA[rascunhoDia.value]
)

// Ao trocar de dia no rascunho, descarta as áreas marcadas que não existem mais no filtro
watch(rascunhoDia, () => {
  const validas = new Set(opcoesArea.value.map((opcao) => opcao.valor))
  rascunhoAreas.value = rascunhoAreas.value.filter((area) => validas.has(area))
})

const alternarMenuFiltro = () => {
  if (!mostrarFiltro.value) {
    rascunhoDia.value = filtroDia.value
    rascunhoAreas.value = [...filtroAreas.value]
  }
  mostrarFiltro.value = !mostrarFiltro.value
}

const alternarArea = (area) => {
  rascunhoAreas.value = rascunhoAreas.value.includes(area)
    ? rascunhoAreas.value.filter((a) => a !== area)
    : [...rascunhoAreas.value, area]
}

const aplicarFiltro = () => {
  filtroDia.value = rascunhoDia.value
  filtroAreas.value = [...rascunhoAreas.value]
  mostrarFiltro.value = false
}

// Chave do filtro no CSV: dia ('todos', '1' ou '2') e áreas ordenadas como no arquivo.
// Sem área marcada, vale o conjunto inteiro do dia escolhido.
const chaveFiltro = computed(() => {
  const areasDoDia = filtroDia.value === 'todos' ? TODAS_AREAS : AREAS_POR_DIA[filtroDia.value]
  const marcadas = filtroAreas.value.length > 0 ? filtroAreas.value : areasDoDia.map((area) => area.valor)
  const ordem = ['CH', 'LC', 'CN', 'MT']
  const areas = ordem.filter((area) => marcadas.includes(area))
  return { dia: String(filtroDia.value), areas: areas.join(';') }
})

// Layout do SVG (unidades do viewBox)
const LARGURA = 760
const ALTURA = 340
const MARGEM_ESQ = 60
const MARGEM_DIR = 20
const MARGEM_TOPO = 30
const MARGEM_BASE = 40
const LARGURA_COLUNA = 120
const MARCAS_EIXO = [1, 0.5, 0, -0.5, -1]

// Mesmas cores do gráfico horizontal e do mapa de calor: azul para r negativo, verde para r positivo
const COR_AZUL = '#0070C0'
const COR_VERDE = '#10B981'

const tooltipColunas = TEXTO_COLUNAS_DIFICULDADE.explicacao.join('\n')

const dados = ref([])
const carregando = ref(false)
const erro = ref('')

// Converte r (-1 a +1) em coordenada y: r = 1 no topo, r = -1 na base
function yDe(r) {
  const alturaUtil = ALTURA - MARGEM_TOPO - MARGEM_BASE
  return MARGEM_TOPO + ((1 - r) / 2) * alturaUtil
}

// Centraliza as três colunas na área útil do gráfico
function xDoNivel(indice) {
  const larguraUtil = LARGURA - MARGEM_ESQ - MARGEM_DIR
  const espaco = larguraUtil / NIVEIS.length
  return MARGEM_ESQ + espaco * indice + (espaco - LARGURA_COLUNA) / 2
}

function formatarP(p) {
  return p < 0.001 ? '< 0.001' : p.toFixed(3)
}

// Colunas da combinação de filtro aplicada (dia e áreas), um registro por nível
const barras = computed(() => {
  const { dia, areas } = chaveFiltro.value
  return NIVEIS.map((nivel) => {
    const registro = dados.value.find(
      (item) => item.dia === dia && item.areas === areas && item.dificuldade === nivel.chave
    )
    return registro ? { ...registro, nivel: nivel.chave, rotulo: nivel.rotulo } : null
  }).filter(Boolean)
})

// Busca todas as combinações de filtro do ano escolhido (uma aba por ano)
async function carregar(ano) {
  carregando.value = true
  erro.value = ''

  try {
    const { data } = await http.get('/metricas/correlacoes-dificuldade-filtros', { params: { ano } })
    dados.value = (data.linhas ?? []).map((linha) => ({ ...linha, areas: linha.areas.join(';') }))
  } catch (err) {
    dados.value = []
    erro.value = err.response?.data?.error || 'Não foi possível carregar as correlações por dificuldade'
  } finally {
    carregando.value = false
  }
}

watch(() => props.ano, carregar, { immediate: true })
</script>

<style scoped>
.correlacao-colunas {
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  margin: 1.5rem 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.correlacao-cabecalho {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.correlacao-titulo {
  margin: 0;
  color: #333;
}

.correlacao-subtitulo {
  margin: 0 0 1rem;
  color: #666;
  font-size: 0.9rem;
}

.correlacao-status {
  padding: 1rem 0;
  color: #666;
}

.correlacao-erro {
  color: #c0392b;
}

.grafico-colunas {
  display: block;
  width: 100%;
  max-width: 800px;
  height: auto;
  margin: 0 auto;
}

.eixo {
  stroke: #999999;
  stroke-width: 1;
}

.rotulo-eixo,
.rotulo-nivel {
  fill: #333;
  font-size: 13px;
}

.valor-coluna {
  fill: #333;
  font-size: 13px;
  font-weight: 600;
}

.p-coluna {
  fill: #666;
  font-size: 11px;
}

.correlacao-legenda {
  margin: 1rem 0 0;
  padding-left: 1.2rem;
  color: #555;
  font-size: 0.85rem;
}

/* Filtro: mesmo estilo do filtro de Quantidade de Palavras por Questão */
.filter-wrapper {
  position: relative;
  display: inline-block;
  margin-left: auto;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  color: #0070C0;
  border: 2px solid #0070C0;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.3s ease;
  white-space: nowrap;
}

.filter-btn:hover {
  background: #f0f7ff;
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
