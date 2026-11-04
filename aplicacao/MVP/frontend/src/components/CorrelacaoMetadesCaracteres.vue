<template>
  <div class="metades-caracteres">
    <div class="metades-cabecalho">
      <h3 class="metades-titulo">{{ TEXTO_METADES_CARACTERES.titulo }}</h3>
      <InfoIcon warning :tooltip="tooltipMetades" />
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
                  name="filtro-dia-metades"
                  :id="`metades-dia-${opcao.valor}`"
                  :checked="rascunhoDia === opcao.valor"
                  @change="rascunhoDia = opcao.valor"
                />
                <label :for="`metades-dia-${opcao.valor}`">{{ opcao.rotulo }}</label>
              </div>
            </div>
          </div>

          <div class="filter-secao">
            <p class="filter-titulo">ÁREA</p>
            <div class="filter-lista">
              <div class="filter-option" v-for="opcao in opcoesArea" :key="`area-${opcao.valor}`">
                <input
                  type="checkbox"
                  :id="`metades-area-${opcao.valor}`"
                  :checked="rascunhoAreas.includes(opcao.valor)"
                  @change="alternarArea(opcao.valor)"
                />
                <label :for="`metades-area-${opcao.valor}`">{{ opcao.rotulo }}</label>
              </div>
            </div>
          </div>

          <div class="filter-rodape">
            <button type="button" class="filter-aplicar" @click="aplicarFiltro">Aplicar</button>
          </div>
        </div>
      </div>
    </div>
    <p class="metades-subtitulo">{{ TEXTO_METADES_CARACTERES.subtitulo(ano) }}</p>

    <div v-if="carregando" class="metades-status">Carregando acertos por quantidade de caracteres...</div>
    <div v-else-if="erro" class="metades-status metades-erro">{{ erro }}</div>
    <p v-else-if="grupos.length === 0" class="metades-status">Sem dados para o filtro escolhido.</p>

    <svg
      v-else
      class="grafico-metades"
      :viewBox="`0 0 ${LARGURA} ${ALTURA}`"
      role="img"
      aria-label="Gráfico de barras agrupadas da porcentagem de acerto por quantidade de caracteres, em cada nível de dificuldade"
    >
      <line :x1="MARGEM_ESQ" :y1="yDe(0)" :x2="LARGURA - MARGEM_DIR" :y2="yDe(0)" class="eixo" />

      <text
        v-for="marca in MARCAS_EIXO"
        :key="`marca-${marca}`"
        :x="MARGEM_ESQ - 10"
        :y="yDe(marca) + 4"
        class="rotulo-eixo"
        text-anchor="end"
      >{{ marca }}%</text>

      <g v-for="grupo in grupos" :key="grupo.nivel">
        <g v-for="(metade, j) in grupo.metades" :key="metade.chave" class="barra-metade">
          <title>{{ metade.tooltip }}</title>
          <rect
            :x="xDaBarra(grupo.indice, j)"
            :y="yDe(metade.acerto)"
            :width="LARGURA_BARRA"
            :height="Math.max(0, yDe(0) - yDe(metade.acerto))"
            :fill="metade.cor"
          />
          <text
            :x="xDaBarra(grupo.indice, j) + LARGURA_BARRA / 2"
            :y="yDe(metade.acerto) - 6"
            class="valor-barra"
            text-anchor="middle"
          >{{ metade.acerto.toFixed(1) }}%</text>
          <text
            :x="xDaBarra(grupo.indice, j) + LARGURA_BARRA / 2"
            :y="yDe(0) + 16"
            class="caracteres-barra"
            text-anchor="middle"
          >{{ metade.caracteresRotulo }}</text>
        </g>
        <text
          :x="xDoNivel(grupo.indice) + LARGURA_GRUPO / 2"
          :y="ALTURA - 12"
          class="rotulo-nivel"
          text-anchor="middle"
        >{{ grupo.rotulo }}</text>
      </g>

      <g class="legenda">
        <rect :x="LARGURA - 260" :y="6" width="12" height="12" :fill="COR_MENOS" />
        <text :x="LARGURA - 242" :y="16" class="rotulo-legenda">Menos caracteres (≤ mediana)</text>
        <rect :x="LARGURA - 260" :y="24" width="12" height="12" :fill="COR_MAIS" />
        <text :x="LARGURA - 242" :y="34" class="rotulo-legenda">Mais caracteres (&gt; mediana)</text>
      </g>
    </svg>

    <ul v-if="!carregando && !erro" class="metades-legenda">
      <li v-for="(texto, indice) in TEXTO_METADES_CARACTERES.notas" :key="indice">{{ texto }}</li>
    </ul>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import http from '../services/http.js'
import InfoIcon from './icons/InfoIcon.vue'
import FilterIcon from './icons/FilterIcon.vue'
import { TEXTO_METADES_CARACTERES } from '../config/textosAnalises.js'

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
const ALTURA = 360
const MARGEM_ESQ = 60
const MARGEM_DIR = 20
const MARGEM_TOPO = 40
const MARGEM_BASE = 40
const LARGURA_BARRA = 70
const ESPACO_ENTRE_BARRAS = 8
const LARGURA_GRUPO = LARGURA_BARRA * 2 + ESPACO_ENTRE_BARRAS
const MARCAS_EIXO = [0, 20, 40, 60, 80, 100]

// Azul para menos caracteres, verde para mais caracteres
const COR_MENOS = '#0070C0'
const COR_MAIS = '#10B981'

const tooltipMetades = TEXTO_METADES_CARACTERES.explicacao.join('\n')

const dados = ref([])
const carregando = ref(false)
const erro = ref('')

// Converte porcentagem de acerto (0 a 100) em coordenada y
function yDe(valor) {
  const alturaUtil = ALTURA - MARGEM_TOPO - MARGEM_BASE
  return MARGEM_TOPO + ((100 - valor) / 100) * alturaUtil
}

// Centraliza cada grupo de nível na área útil do gráfico
function xDoNivel(indice) {
  const larguraUtil = LARGURA - MARGEM_ESQ - MARGEM_DIR
  const espaco = larguraUtil / NIVEIS.length
  return MARGEM_ESQ + espaco * indice + (espaco - LARGURA_GRUPO) / 2
}

function xDaBarra(indiceNivel, indiceMetade) {
  return xDoNivel(indiceNivel) + indiceMetade * (LARGURA_BARRA + ESPACO_ENTRE_BARRAS)
}

// Tooltip com a quantidade de caracteres (média do grupo), a faixa da mediana e o n
function montarMetade(linha, chave, rotulo, cor) {
  const faixa = chave === 'menos'
    ? `≤ ${linha.mediana.toFixed(0)} caracteres`
    : `> ${linha.mediana.toFixed(0)} caracteres`
  return {
    chave,
    cor,
    acerto: linha.acertoMedio,
    caracteresRotulo: `${Math.round(linha.caracteresMedio)} car.`,
    tooltip:
      `${rotulo} · ${faixa}\n` +
      `Caracteres médios: ${Math.round(linha.caracteresMedio)}\n` +
      `Acerto médio: ${linha.acertoMedio.toFixed(1)}%\n` +
      `Itens: ${linha.quantidadeItens}`
  }
}

// Um grupo por nível, com as duas metades (menos e mais caracteres) do filtro aplicado
const grupos = computed(() => {
  const { dia, areas } = chaveFiltro.value
  const linhasDoFiltro = dados.value.filter((item) => item.dia === dia && item.areas === areas)

  return NIVEIS.map((nivel, indice) => {
    const menos = linhasDoFiltro.find((item) => item.dificuldade === nivel.chave && item.metade === 'menos')
    const mais = linhasDoFiltro.find((item) => item.dificuldade === nivel.chave && item.metade === 'mais')
    if (!menos || !mais) {
      return null
    }
    return {
      indice,
      nivel: nivel.chave,
      rotulo: nivel.rotulo,
      metades: [
        montarMetade(menos, 'menos', 'Menos caracteres', COR_MENOS),
        montarMetade(mais, 'mais', 'Mais caracteres', COR_MAIS)
      ]
    }
  }).filter(Boolean)
})

// Busca todas as combinações de filtro do ano escolhido (uma aba por ano)
async function carregar(ano) {
  carregando.value = true
  erro.value = ''

  try {
    const { data } = await http.get('/metricas/metades-caracteres', { params: { ano } })
    dados.value = (data.linhas ?? []).map((linha) => ({ ...linha, areas: linha.areas.join(';') }))
  } catch (err) {
    dados.value = []
    erro.value = err.response?.data?.error || 'Não foi possível carregar os acertos por quantidade de caracteres'
  } finally {
    carregando.value = false
  }
}

watch(() => props.ano, carregar, { immediate: true })
</script>

<style scoped>
.metades-caracteres {
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  margin: 1.5rem 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.metades-cabecalho {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.metades-titulo {
  margin: 0;
  color: #333;
}

.metades-subtitulo {
  margin: 0 0 1rem;
  color: #666;
  font-size: 0.9rem;
}

.metades-status {
  padding: 1rem 0;
  color: #666;
}

.metades-erro {
  color: #c0392b;
}

.grafico-metades {
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

.valor-barra {
  fill: #333;
  font-size: 13px;
  font-weight: 600;
}

.caracteres-barra {
  fill: #666;
  font-size: 11px;
}

.rotulo-legenda {
  fill: #333;
  font-size: 12px;
}

.metades-legenda {
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
