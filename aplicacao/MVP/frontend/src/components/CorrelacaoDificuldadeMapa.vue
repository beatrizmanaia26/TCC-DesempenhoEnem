<template>
  <div class="correlacao-dificuldade-mapa">
    <div class="correlacoes-cabecalho">
      <h3 class="correlacoes-titulo">{{ TEXTO_MAPA_DIFICULDADE.titulo }}</h3>
      <InfoIcon warning :tooltip="tooltipMapa" class="tooltip-largo" />
    </div>
    <p class="correlacoes-subtitulo">{{ TEXTO_MAPA_DIFICULDADE.subtitulo }}</p>
    <ul class="correlacoes-legenda correlacoes-cores">
      <li v-for="(texto, indice) in CORES_MAPA_DIFICULDADE" :key="indice">{{ texto }}</li>
    </ul>

    <div v-if="carregando" class="correlacoes-status">Carregando correlações...</div>
    <div v-else-if="erro" class="correlacoes-status correlacoes-erro">{{ erro }}</div>

    <div v-else>
      <div v-for="grade in grades" :key="grade.id" class="grade-correlacao">
        <svg
          class="mapa-calor"
          :viewBox="`0 0 ${grade.largura} ${grade.altura}`"
          role="img"
          :aria-label="grade.ariaLabel"
        >
          <!-- Rótulos das colunas (áreas) -->
          <text
            v-for="(coluna, i) in grade.colunas"
            :key="`col-${coluna.chave}`"
            :x="MARGEM_ESQ + i * LARGURA_COL + (LARGURA_COL - GAP) / 2"
            :y="MARGEM_TOPO - 12"
            class="rotulo-eixo"
            text-anchor="middle"
          >{{ coluna.rotulo }}</text>

          <!-- Rótulos das linhas (anos) -->
          <text
            v-for="(linha, j) in grade.linhas"
            :key="`lin-${linha.chave}`"
            :x="MARGEM_ESQ - 12"
            :y="MARGEM_TOPO + j * TAM + (TAM - GAP) / 2"
            class="rotulo-eixo"
            text-anchor="end"
            dominant-baseline="middle"
          >{{ linha.rotulo }}</text>

          <!-- Células: r e p ajustado por Holm -->
          <g v-for="celula in grade.celulas" :key="celula.chave">
            <rect
              class="celula-rect"
              :x="celula.x"
              :y="celula.y"
              :width="LARGURA_COL - GAP"
              :height="TAM - GAP"
              :fill="celula.cor"
              :stroke="celula.significativa ? '#263238' : 'none'"
              :stroke-width="celula.significativa ? 3 : 0"
            />
            <template v-if="!celula.vazia">
              <text
                :x="celula.x + (LARGURA_COL - GAP) / 2"
                :y="celula.y + (TAM - GAP) / 2 - 8"
                class="valor-celula"
                :fill="celula.corTexto"
                text-anchor="middle"
                dominant-baseline="middle"
              >{{ celula.r.toFixed(2) }}</text>
              <text
                :x="celula.x + (LARGURA_COL - GAP) / 2"
                :y="celula.y + (TAM - GAP) / 2 + 14"
                class="p-celula"
                :fill="celula.corTexto"
                text-anchor="middle"
                dominant-baseline="middle"
              >p bruto = {{ formatarP(celula.pBruto) }}</text>
              <text
                :x="celula.x + (LARGURA_COL - GAP) / 2"
                :y="celula.y + (TAM - GAP) / 2 + 32"
                class="p-celula"
                :fill="celula.corTexto"
                text-anchor="middle"
                dominant-baseline="middle"
              >p (Holm) = {{ formatarP(celula.p) }}</text>
            </template>
            <text
              v-else
              :x="celula.x + (LARGURA_COL - GAP) / 2"
              :y="celula.y + (TAM - GAP) / 2"
              class="valor-celula"
              fill="#666666"
              text-anchor="middle"
              dominant-baseline="middle"
            >—</text>
            <g v-if="celula.significativa" class="significancia-celula" aria-label="Resultado significativo após ajuste de Holm">
              <circle :cx="celula.x + LARGURA_COL - GAP - 17" :cy="celula.y + 17" r="12" />
              <text :x="celula.x + LARGURA_COL - GAP - 17" :y="celula.y + 17" text-anchor="middle" dominant-baseline="middle">★</text>
              <title>p (Holm) abaixo de 0,05</title>
            </g>
          </g>

          <!-- Barra de cor (-1 a +1), horizontal abaixo da grade, mesma escala do mapa geral -->
          <defs>
            <linearGradient :id="`gradiente-${grade.id}`" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#0070C0" />
              <stop offset="50%" stop-color="#FFFFFF" />
              <stop offset="100%" stop-color="#A78BFA" />
            </linearGradient>
          </defs>
          <rect
            :x="MARGEM_ESQ"
            :y="grade.barraY"
            :width="grade.larguraGrade"
            :height="22"
            :fill="`url(#gradiente-${grade.id})`"
          />
          <text
            v-for="marca in MARCAS_BARRA"
            :key="`marca-${grade.id}-${marca.valor}`"
            :x="MARGEM_ESQ + ((marca.valor + 1) / 2) * grade.larguraGrade"
            :y="grade.barraY + 36"
            class="rotulo-barra"
            text-anchor="middle"
            dominant-baseline="middle"
          >{{ marca.texto }}</text>
          <text
            :x="MARGEM_ESQ + grade.larguraGrade / 2"
            :y="grade.barraY + 64"
            class="rotulo-barra"
            text-anchor="middle"
            dominant-baseline="middle"
          >Correlação de Spearman (r)</text>
        </svg>
      </div>
    </div>

    <p v-if="!carregando && !erro && quantidadeValidas" class="correlacao-leitura"><strong>Resultado:</strong> {{ quantidadeSignificativas }} de {{ quantidadeValidas }} correlações válidas têm p (Holm) abaixo de 0,05. {{ quantidadeSignificativas ? 'Mesmo uma associação estatisticamente significativa não prova que a quantidade de caracteres causou mudança no desempenho.' : 'Neste ano, não encontramos evidência estatística clara de associação após o ajuste; isso não prova que a relação não exista.' }}</p>
    <p v-else-if="!carregando && !erro" class="correlacao-leitura"><strong>Resultado:</strong> Não há correlações com dados suficientes para este ano.</p>

    <button v-if="!carregando && !erro" type="button" class="filter-btn botao-mais-info" @click="mostrarMais = !mostrarMais">
      {{ mostrarMais ? 'Ocultar informações sobre este gráfico' : 'Mais informações sobre este gráfico' }}
    </button>
    <ul v-if="!carregando && !erro && mostrarMais" class="correlacoes-legenda">
      <li v-for="(texto, indice) in notas" :key="indice">
        <template v-for="(parte, i) in dividirComLinks(texto)" :key="i">
          <a
            v-if="parte.url"
            :href="parte.url"
            target="_blank"
            rel="noopener noreferrer"
            class="correlacoes-link"
            >{{ parte.texto }}</a
          >
          <template v-else>{{ parte.texto }}</template>
        </template>
      </li>
    </ul>

  </div>
</template>


<script setup>
import { computed, ref, onMounted } from 'vue'
import http from '../services/http.js'
import {
  TEXTO_MAPA_DIFICULDADE,
  CORES_MAPA_DIFICULDADE,
  LINKS_TERMOS,
  ROTULOS_AREA
} from '../config/textosAnalises.js'
import InfoIcon from './icons/InfoIcon.vue'


// O ano vem da aba do ENEM: o mapa mostra só esse ano, com os três níveis de dificuldade.
// Áreas da análise (2021 fica de fora)
const props = defineProps({ ano: { type: Number, default: null } })
const AREAS = ['CH', 'LC', 'CN', 'MT']
// Níveis de dificuldade: uma linha do mapa cada
const NIVEIS = [
  { chave: 'facil', rotulo: 'Fácil' },
  { chave: 'media', rotulo: 'Médio' },
  { chave: 'dificil', rotulo: 'Difícil' }
]

// Layout do SVG (unidades do viewBox), igual ao MapaCalorCorrelacoes
const TAM = 110
const LARGURA_COL = 180 // largura das colunas de área, para o nome caber sem sobrepor
const GAP = 4
const MARGEM_ESQ = 200
const MARGEM_TOPO = 45

// Escala de cor do projeto (colors.css): azul FEI para r negativo, violeta claro para r positivo, branco em zero
const COR_AZUL = [0, 112, 192]
const COR_BRANCO = [255, 255, 255]
const COR_VIOLETA = [167, 139, 250]
const MARCAS_BARRA = [
  { valor: 1, texto: '1' },
  { valor: 0.5, texto: '0.5' },
  { valor: 0, texto: '0' },
  { valor: -0.5, texto: '-0.5' },
  { valor: -1, texto: '-1' }
]

const tooltipMapa = TEXTO_MAPA_DIFICULDADE.explicacao.join('\n')

const notas = TEXTO_MAPA_DIFICULDADE.notas
const mostrarMais = ref(false)

// Separa o texto em partes: trechos comuns e trechos que são link (termo de LINKS_TERMOS)
function dividirComLinks(texto) {
  const partes = [{ texto, url: null }]
  LINKS_TERMOS.forEach(({ termo, url }) => {
    for (let i = 0; i < partes.length; i++) {
      if (partes[i].url || !partes[i].texto.includes(termo)) continue
      const [antes, ...depois] = partes[i].texto.split(termo)
      const resto = depois.join(termo)
      partes.splice(i, 1, { texto: antes, url: null }, { texto: termo, url }, { texto: resto, url: null })
      i += 2
    }
  })
  return partes.filter((parte) => parte.texto !== '')
}

const dados = ref([])
const carregando = ref(false)
const erro = ref('')

function interpolar(de, para, t) {
  return de.map((valor, i) => Math.round(valor + (para[i] - valor) * t))
}

// Converte r (-1 a +1) em cor: azul para negativo, branco em zero, violeta para positivo
function rgbPorR(r) {
  const valor = Math.max(-1, Math.min(1, r))
  return valor >= 0
    ? interpolar(COR_BRANCO, COR_VIOLETA, valor)
    : interpolar(COR_BRANCO, COR_AZUL, -valor)
}

// Luminância relativa (WCAG), para escolher texto branco ou preto com contraste suficiente
function luminancia([r, g, b]) {
  const canal = (valor) => {
    const c = valor / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}

function corTextoPara(rgb) {
  const lum = luminancia(rgb)
  const contrasteBranco = 1.05 / (lum + 0.05)
  const contrastePreto = (lum + 0.05) / 0.05
  return contrasteBranco > contrastePreto ? '#FFFFFF' : '#000000'
}

function formatarP(p) {
  return p < 0.001 ? '< 0.001' : p.toFixed(3)
}

// Monta a grade do ano selecionado: linhas = níveis (fácil, médio, difícil), colunas = áreas.
// Célula sem dado fica vazia (—).
function montarGrade() {
  const linhas = NIVEIS
  const colunas = AREAS.map((area) => ({ chave: area, rotulo: ROTULOS_AREA[area] }))
  const alturaGrade = linhas.length * TAM - GAP
  const larguraGrade = colunas.length * LARGURA_COL - GAP
  const barraY = MARGEM_TOPO + alturaGrade + 50
  const largura = MARGEM_ESQ + larguraGrade + 20
  const altura = barraY + 22 + 70

  const celulas = linhas.flatMap((linha, j) =>
    colunas.map((coluna, i) => {
      const x = MARGEM_ESQ + i * LARGURA_COL
      const y = MARGEM_TOPO + j * TAM
      const chave = `${linha.chave}-${coluna.chave}`
      const registro = dados.value.find(
        (item) => item.ano === props.ano && item.dificuldade === linha.chave && item.area === coluna.chave
      )
      if (!registro) {
        return { chave, x, y, vazia: true, significativa: false, cor: '#F3F4F6' }
      }
      const rgb = rgbPorR(registro.r)
      return {
        chave,
        x,
        y,
        vazia: false,
        significativa: registro.p < 0.05,
        r: registro.r,
        p: registro.p,
        pBruto: registro.pBruto,
        cor: `rgb(${rgb.join(', ')})`,
        corTexto: corTextoPara(rgb)
      }
    })
  )

  return {
    id: 'dificuldade',
    ariaLabel: `Mapa de calor da correlação de Spearman entre caracteres da questão e acerto, por nível de dificuldade e área, em ${props.ano}`,
    colunas,
    linhas,
    alturaGrade,
    barraY,
    larguraGrade,
    largura,
    altura,
    celulas
  }
}

const grades = computed(() => [montarGrade()])

// Contagem do resultado: só células com dado (correlação válida) entram
const quantidadeValidas = computed(() => grades.value[0].celulas.filter((celula) => !celula.vazia).length)
const quantidadeSignificativas = computed(() =>
  grades.value[0].celulas.filter((celula) => !celula.vazia && celula.significativa).length
)

async function carregar() {
  carregando.value = true
  erro.value = ''

  try {
    const { data } = await http.get('/metricas/correlacoes-dificuldade')
    dados.value = data.celulas ?? []
  } catch (err) {
    dados.value = []
    erro.value = err.response?.data?.error || 'Não foi possível carregar as correlações por dificuldade'
  } finally {
    carregando.value = false
  }
}

onMounted(carregar)
</script>


<style scoped>
.botao-mais-info {
  margin: 1rem 0 0;
}

.correlacao-dificuldade-mapa {
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  margin: 1.5rem 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.correlacoes-cabecalho {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.correlacoes-titulo {
  margin: 0;
  color: #333;
}

.correlacoes-subtitulo {
  margin: 0 0 1rem;
  color: #666;
  font-size: 0.9rem;
}

.grade-correlacao {
  margin-bottom: 1.5rem;
}

.correlacoes-status {
  padding: 1rem 0;
  color: #666;
}

.correlacoes-erro {
  color: #c0392b;
}

.mapa-calor {
  display: block;
  width: 100%;
  max-width: 800px;
  height: auto;
  margin: 0 auto;
  font-family: Arial, Helvetica, sans-serif;
}

/* Marcador de p (Holm) < 0,05: mesmo estilo do gráfico de presença de imagem */
.significancia-celula circle {
  fill: #263238;
  stroke: #ffffff;
  stroke-width: 1.5;
}

.significancia-celula text {
  fill: #ffffff;
  font-size: 13px;
  font-weight: 700;
}

.correlacao-leitura {
  margin: 0.65rem 0;
  color: #475467;
  font-size: 0.9rem;
  line-height: 1.5;
}

.rotulo-eixo {
  font-size: 15px;
  fill: #000000;
}

.valor-celula {
  font-size: 22px;
  font-weight: 600;
}

.p-celula {
  font-size: 13px;
}

.rotulo-barra {
  font-size: 14px;
  fill: #000000;
}

/* Tooltip deste gráfico mais largo, para caber o cálculo sem ficar alto demais */
.tooltip-largo :deep(.tooltip) {
  width: 420px;
}

@media (max-width: 768px) {
  .tooltip-largo :deep(.tooltip) {
    width: 300px;
  }
}

.correlacoes-link {
  color: #0070c0;
  text-decoration: underline;
}

.correlacoes-legenda {
  margin: 1rem 0 0;
  padding-left: 1.25rem;
  color: #666;
  font-size: 0.85rem;
}

</style>
