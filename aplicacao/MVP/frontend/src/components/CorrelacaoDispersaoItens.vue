<!-- ====grafico dispersao itens - dispersão caracteres × acerto por item, com reta e IC 95% -->
<template>
  <div class="dispersao-itens">
    <div class="dispersao-cabecalho">
      <h3 class="dispersao-titulo">{{ TEXTO_DISPERSAO_ITENS.titulo }}</h3>
      <InfoIcon warning :tooltip="tooltipDispersao" :largura="520" />
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
                  name="filtro-dia-dispersao"
                  :id="`dispersao-dia-${opcao.valor}`"
                  :checked="rascunhoDia === opcao.valor"
                  @change="rascunhoDia = opcao.valor"
                />
                <label :for="`dispersao-dia-${opcao.valor}`">{{ opcao.rotulo }}</label>
              </div>
            </div>
          </div>

          <div class="filter-secao">
            <p class="filter-titulo">ÁREA</p>
            <div class="filter-lista">
              <div class="filter-option" v-for="opcao in opcoesArea" :key="`area-${opcao.valor}`">
                <input
                  type="checkbox"
                  :id="`dispersao-area-${opcao.valor}`"
                  :checked="rascunhoAreas.includes(opcao.valor)"
                  @change="alternarArea(opcao.valor)"
                />
                <label :for="`dispersao-area-${opcao.valor}`">{{ opcao.rotulo }}</label>
              </div>
            </div>
          </div>

          <div class="filter-secao">
            <p class="filter-titulo">DIFICULDADE</p>
            <div class="filter-lista">
              <div class="filter-option" v-for="opcao in opcoesDificuldade" :key="`dificuldade-dispersao-${opcao.valor}`">
                <input
                  type="radio"
                  name="filtro-dificuldade-dispersao"
                  :id="`dispersao-dificuldade-${opcao.valor}`"
                  :checked="rascunhoDificuldade === opcao.valor"
                  @change="rascunhoDificuldade = opcao.valor"
                />
                <label :for="`dispersao-dificuldade-${opcao.valor}`">{{ opcao.rotulo }}</label>
              </div>
            </div>
          </div>

          <div class="filter-rodape">
            <button type="button" class="filter-aplicar" @click="aplicarFiltro">Aplicar</button>
          </div>
        </div>
      </div>
    </div>
    <p class="dispersao-subtitulo">
      <template v-for="(parte, i) in dividirComLinks(TEXTO_DISPERSAO_ITENS.subtitulo(ano))" :key="i">
        <a v-if="parte.url" :href="parte.url" target="_blank" rel="noopener noreferrer" class="correlacoes-link">{{ parte.texto }}</a>
        <template v-else>{{ parte.texto }}</template>
      </template>
    </p>

    <div v-if="carregando" class="dispersao-status">Carregando dispersão por item...</div>
    <div v-else-if="erro" class="dispersao-status dispersao-erro">{{ erro }}</div>
    <p v-else-if="pontosDoFiltro.length === 0" class="dispersao-status">Sem dados para o filtro escolhido.</p>

    <template v-else>
      <svg
        class="grafico-dispersao"
        :viewBox="`0 0 ${LARGURA} ${ALTURA}`"
        role="img"
        aria-label="Gráfico de dispersão do acerto pela quantidade de caracteres de cada questão, com reta e intervalo de confiança de 95%"
      >
        <line :x1="MARGEM_ESQ" :y1="yDe(0)" :x2="LARGURA - MARGEM_DIR" :y2="yDe(0)" class="eixo" />
        <line :x1="MARGEM_ESQ" :y1="yDe(0)" :x2="MARGEM_ESQ" :y2="yDe(100)" class="eixo" />
        <text :x="MARGEM_ESQ" :y="MARGEM_TOPO - 10" class="rotulo-eixo">Acerto</text>

        <text
          v-for="marca in MARCAS_Y"
          :key="`y-${marca}`"
          :x="MARGEM_ESQ - 8"
          :y="yDe(marca) + 4"
          class="rotulo-eixo"
          text-anchor="end"
        >{{ marca }}%</text>

        <text
          v-for="marca in marcasX"
          :key="`x-${marca}`"
          :x="xDe(marca)"
          :y="yDe(0) + 18"
          class="rotulo-eixo"
          text-anchor="middle"
        >{{ marca }}</text>
        <text :x="LARGURA / 2" :y="ALTURA - 6" class="rotulo-eixo" text-anchor="middle">Caracteres da questão</text>

        <polygon v-if="faixaIc" :points="faixaIc" class="faixa-ic" />
        <polyline v-if="pontosReta" :points="pontosReta" class="reta" />

        <circle
          v-for="ponto in pontosSvg"
          :key="ponto.chave"
          :cx="ponto.cx"
          :cy="ponto.cy"
          r="4"
          :fill="ponto.cor"
          class="ponto-item"
        >
          <title>{{ ponto.tooltip }}</title>
        </circle>
      </svg>

      <ul class="dispersao-legenda">
        <li v-for="nivel in NIVEIS" :key="nivel.chave">
          <span class="cor-nivel" :style="{ background: nivel.cor }"></span>{{ nivel.rotulo }}
        </li>
        <li>
          <span class="linha-reta"></span>
          Curva logística e faixa de <a :href="URL_INTERVALO_CONFIANCA" target="_blank" rel="noopener noreferrer" class="correlacoes-link">Intervalo de Confiança</a> (IC) 95%
        </li>
      </ul>
      <ul class="dispersao-notas">
        <li v-for="(texto, indice) in notasDoFiltro" :key="indice">
      <template v-for="(parte, i) in partesDaNota(texto)" :key="i">
            <a v-if="parte.url" :href="parte.url" target="_blank" rel="noopener noreferrer" class="correlacoes-link" :style="parte.negrito ? { fontWeight: 'bold' } : null">{{ parte.texto }}</a>
            <strong v-else-if="parte.negrito">{{ parte.texto }}</strong>
            <template v-else>{{ parte.texto }}</template>
          </template>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup>
// ====grafico dispersao itens - lógica (filtro, pontos, reta e IC 95%)
import { ref, computed, watch } from 'vue'
import http from '../services/http.js'
import InfoIcon from './icons/InfoIcon.vue'
import FilterIcon from './icons/FilterIcon.vue'
import { TEXTO_DISPERSAO_ITENS, LINKS_TERMOS, URL_INTERVALO_CONFIANCA } from '../config/textosAnalises.js'
import { calcularLogisticaProva } from '../services/logisticaProva.js'

// Link do termo "Modelo logístico" usado nas explicações
const URL_MODELO_LOGISTICO = 'https://pt.wikipedia.org/wiki/Regressão_logística'

// Separa o texto em partes: trechos comuns e trechos que são link (termo de LINKS_TERMOS)
function dividirComLinks(texto) {
  let partes = [{ texto, url: null }]
  LINKS_TERMOS.forEach(({ termo, url }) => {
    for (let i = 0; i < partes.length; i++) {
      if (partes[i].url || !partes[i].texto.includes(termo)) continue
      const [antes, ...depois] = partes[i].texto.split(termo)
      const resto = depois.join(termo)
      partes.splice(i, 1, { texto: antes, url: null }, { texto: termo, url }, { texto: resto, url: null })
    }
  })
  return partes.filter((parte) => parte.texto !== '')
}

// Títulos das notas que ficam em negrito (só estes trechos, o restante da nota fica normal)
const TITULOS_NEGRITO = ['Curva azul:', 'Faixa azul:', 'Pontos:', 'Razão de chances:', 'Correção de dispersão (φ):', 'Valor de p', 'p baixo:', 'p alto:', 'O n ']

// Marca como negrito apenas o trecho inicial que bate com um título da lista (partes: [{ texto, url }])
function destacarTitulo(partes) {
  const texto = partes.map((parte) => parte.texto).join('')
  const titulo = TITULOS_NEGRITO.find((item) => texto.startsWith(item))
  if (!titulo) return partes
  const resultado = []
  let restante = titulo.length
  partes.forEach((parte) => {
    if (restante <= 0) {
      resultado.push(parte)
      return
    }
    const tamanho = Math.min(restante, parte.texto.length)
    resultado.push({ ...parte, texto: parte.texto.slice(0, tamanho), negrito: true })
    if (tamanho < parte.texto.length) resultado.push({ ...parte, texto: parte.texto.slice(tamanho) })
    restante -= tamanho
  })
  return resultado
}

function partesDaNota(texto) {
  return destacarTitulo(dividirComLinks(texto))
}

const props = defineProps({
  ano: {
    type: Number,
    required: true
  }
})

// Níveis de dificuldade TRI: cor de cada ponto
const NIVEIS = [
  { chave: 'facil', rotulo: 'Fácil', cor: '#0070C0' },
  { chave: 'media', rotulo: 'Média', cor: '#F59E0B' },
  { chave: 'dificil', rotulo: 'Difícil', cor: '#C0392B' }
]

// Áreas de cada dia da prova (mesmo filtro do gráfico de metades)
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
const filtroDificuldade = ref('todas')

// Rascunho: muda enquanto o usuário marca as opções e só vira aplicado no botão Aplicar
const mostrarFiltro = ref(false)
const rascunhoDia = ref('todos')
const rascunhoAreas = ref([])
const rascunhoDificuldade = ref('todas')

// Opções de dificuldade do filtro (mesmas chaves dos pontos do CSV: facil, media, dificil)
const opcoesDificuldade = [
  { valor: 'todas', rotulo: 'Todas' },
  ...NIVEIS.map((nivel) => ({ valor: nivel.chave, rotulo: nivel.rotulo }))
]

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
    rascunhoDificuldade.value = filtroDificuldade.value
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
  filtroDificuldade.value = rascunhoDificuldade.value
  mostrarFiltro.value = false
}

// Chave do filtro: dia ('todos', '1' ou '2') e áreas ordenadas como no CSV.
// Sem área marcada, vale o conjunto inteiro do dia escolhido.
const chaveFiltro = computed(() => {
  const areasDoDia = filtroDia.value === 'todos' ? TODAS_AREAS : AREAS_POR_DIA[filtroDia.value]
  const marcadas = filtroAreas.value.length > 0 ? filtroAreas.value : areasDoDia.map((area) => area.valor)
  const ordem = ['CH', 'LC', 'CN', 'MT']
  const areas = ordem.filter((area) => marcadas.includes(area))
  return { dia: String(filtroDia.value), areas: areas.join(';') }
})

// Layout do SVG (unidades do viewBox)
const LARGURA = 960
const ALTURA = 380
const MARGEM_ESQ = 60
const MARGEM_DIR = 20
const MARGEM_TOPO = 30
const MARGEM_BASE = 50
const MARCAS_Y = [0, 20, 40, 60, 80, 100]
// Largura mínima por rótulo do eixo X (px), para os números não se encostarem
const LARGURA_MINIMA_ROTULO_X = 45
const PASSOS_X = [100, 200, 300, 400, 600, 800, 1000, 1200, 1600, 2000]

const tooltipDispersao = TEXTO_DISPERSAO_ITENS.explicacao.join('\n')

const dados = ref({ pontos: [], retas: [] })
const carregando = ref(false)
const erro = ref('')

// Pontos do filtro: itens das áreas escolhidas e da dificuldade escolhida (o dia já define quais áreas existem)
const pontosDoFiltro = computed(() =>
  dados.value.pontos.filter(
    (ponto) =>
      chaveFiltro.value.areas.split(';').includes(ponto.area) &&
      (filtroDificuldade.value === 'todas' || ponto.dificuldade === filtroDificuldade.value)
  )
)

// Escala x: caracteres em múltiplos de 100 em volta dos itens do filtro
const xMin = computed(() =>
  Math.floor(Math.min(...pontosDoFiltro.value.map((ponto) => ponto.caracteres)) / 100) * 100
)
const xMax = computed(() =>
  Math.ceil(Math.max(...pontosDoFiltro.value.map((ponto) => ponto.caracteres)) / 100) * 100
)

// Modelo logístico do filtro: mesmo cálculo da prova (calcularLogisticaProva).
// Usa os itens do filtro, com acertos e total de respostas de cada item.
const resultado = computed(() => {
  const pontos = pontosDoFiltro.value.map((ponto) => ({
    x: ponto.caracteres,
    acertos: ponto.acertos,
    total: ponto.total
  }))
  const grade = Array.from({ length: 51 }, (_, indice) => {
    const inicio = Math.min(...pontos.map((p) => p.x))
    const fim = Math.max(...pontos.map((p) => p.x))
    return inicio + ((fim - inicio) / 50) * indice
  })
  return pontos.length > 0 ? calcularLogisticaProva(pontos, grade) : null
})

// Linhas da curva do filtro (uma por ponto da grade), ordenadas por caracteres
const linhasReta = computed(() => (resultado.value ? resultado.value.linha : []))

// Menor passo que deixa os rótulos com espaço suficiente
const passoX = computed(() => {
  const larguraUtil = LARGURA - MARGEM_ESQ - MARGEM_DIR
  const maxMarcas = Math.floor(larguraUtil / LARGURA_MINIMA_ROTULO_X)
  const alcance = xMax.value - xMin.value
  return PASSOS_X.find((passo) => alcance / passo <= maxMarcas) ?? PASSOS_X[PASSOS_X.length - 1]
})

const marcasX = computed(() => {
  const marcas = []
  for (let valor = xMin.value; valor <= xMax.value; valor += passoX.value) {
    marcas.push(valor)
  }
  return marcas
})

// Converte caracteres em coordenada x
function xDe(valor) {
  const larguraUtil = LARGURA - MARGEM_ESQ - MARGEM_DIR
  const amplitude = Math.max(xMax.value - xMin.value, 1)
  return MARGEM_ESQ + ((valor - xMin.value) / amplitude) * larguraUtil
}

// Converte porcentagem de acerto (0 a 100) em coordenada y
function yDe(valor) {
  const alturaUtil = ALTURA - MARGEM_TOPO - MARGEM_BASE
  const limitado = Math.min(100, Math.max(0, valor))
  return MARGEM_TOPO + ((100 - limitado) / 100) * alturaUtil
}

// Um círculo por item, com a cor do nível TRI e tooltip com item, caracteres e acerto
const pontosSvg = computed(() =>
  pontosDoFiltro.value.map((ponto) => {
    const nivel = NIVEIS.find((item) => item.chave === ponto.dificuldade)
    return {
      chave: `${ponto.ano}-${ponto.area}-${ponto.coItem}`,
      cx: xDe(ponto.caracteres),
      cy: yDe(ponto.acerto),
      cor: nivel ? nivel.cor : '#666666',
      tooltip:
        `Item ${ponto.coItem} · ${ponto.area} · ${nivel ? nivel.rotulo : 'sem nível'}\n` +
        `Caracteres: ${Math.round(ponto.caracteres)}\n` +
        `Acerto: ${ponto.acerto.toFixed(1)}%`
    }
  })
)

// Curva logística (acerto previsto ao longo da grade de caracteres)
const pontosReta = computed(() =>
  linhasReta.value.map((linha) => `${xDe(linha.x)},${yDe(linha.previsto)}`).join(' ')
)

// Faixa do IC 95%: vai pela borda superior e volta pela inferior
const faixaIc = computed(() => {
  const linhas = linhasReta.value
  if (linhas.length === 0) {
    return ''
  }
  const superior = linhas.map((linha) => `${xDe(linha.x)},${yDe(linha.icSuperior)}`)
  const inferior = [...linhas].reverse().map((linha) => `${xDe(linha.x)},${yDe(linha.icInferior)}`)
  return [...superior, ...inferior].join(' ')
})

// Formata número com pelo menos `casasMinimas` decimais. Se o valor for menor que essa precisão,
// usa mais casas (até 2 algarismos significativos, no máximo 6), para não aparecer 0.00 ou -0.00
function formatarNumero(valor, casasMinimas) {
  if (valor == null || Number.isNaN(Number(valor))) {
    return '—'
  }
  const absoluto = Math.abs(valor)
  let casas = casasMinimas
  if (absoluto > 0 && absoluto < Math.pow(10, -casasMinimas)) {
    casas = Math.min(Math.ceil(-Math.log10(absoluto)) + 1, 6)
  }
  const arredondado = Number(valor.toFixed(casas))
  return (arredondado === 0 ? 0 : arredondado).toFixed(casas).replace('.', ',')
}

// Notas do gráfico com a razão de chances, φ, p e n do filtro escolhido no lugar de {razao}, {phi}, {p} e {n}
const notasDoFiltro = computed(() => {
  const razao = resultado.value ? formatarNumero(resultado.value.razaoChancesPor100, 2) : '—'
  const phi = resultado.value ? formatarNumero(resultado.value.phi, 1) : '—'
  const p = resultado.value ? (resultado.value.p < 0.001 ? '< 0,001' : formatarNumero(resultado.value.p, 3)) : '—'
  const n = resultado.value ? String(resultado.value.n) : '—'
  return TEXTO_DISPERSAO_ITENS.notas.map((texto) =>
    texto.replaceAll('{razao}', razao).replaceAll('{phi}', phi).replaceAll('{p}', p).replaceAll('{n}', n)
  )
})

// Busca os pontos e as retas do ano escolhido
async function carregar(ano) {
  carregando.value = true
  erro.value = ''

  try {
    const { data } = await http.get('/metricas/dispersao-itens', { params: { ano } })
    dados.value = {
      pontos: data.pontos ?? [],
      retas: (data.retas ?? []).map((linha) => ({ ...linha, areas: linha.areas.join(';') }))
    }
  } catch (err) {
    dados.value = { pontos: [], retas: [] }
    erro.value = err.response?.data?.error || 'Não foi possível carregar a dispersão por item'
  } finally {
    carregando.value = false
  }
}

watch(() => props.ano, carregar, { immediate: true })
</script>

<style scoped>
/* ====grafico dispersao itens - estilos */
.dispersao-itens {
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  margin: 1.5rem 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.dispersao-cabecalho {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.dispersao-titulo {
  margin: 0;
  color: #333;
}

.dispersao-subtitulo {
  margin: 0 0 1rem;
  color: #666;
  font-size: 0.9rem;
}

.dispersao-status {
  padding: 1rem 0;
  color: #666;
}

.dispersao-erro {
  color: #c0392b;
}

.grafico-dispersao {
  display: block;
  width: 100%;
  max-width: 960px;
  height: auto;
  margin: 0 auto;
}

.eixo {
  stroke: #999999;
  stroke-width: 1;
}

.rotulo-eixo {
  fill: #333;
  font-size: 13px;
}

.faixa-ic {
  fill: rgba(0, 112, 192, 0.15);
  stroke: none;
}

.reta {
  fill: none;
  stroke: #0070C0;
  stroke-width: 2;
}

.ponto-item {
  opacity: 0.8;
}

.dispersao-legenda {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
  color: #333;
  font-size: 0.85rem;
}

.dispersao-legenda li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.cor-nivel {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.linha-reta {
  display: inline-block;
  width: 18px;
  height: 3px;
  background: #0070C0;
}

.dispersao-notas {
  margin: 1rem 0 0;
  padding-left: 1.2rem;
  color: #555;
  font-size: 0.85rem;
}

/* Filtro: mesmo estilo do filtro do gráfico de metades */
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

