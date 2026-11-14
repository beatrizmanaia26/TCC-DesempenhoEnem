<template>
  <div class="correlacoes-tempo">
    <div class="correlacoes-cabecalho">
      <h3 class="correlacoes-titulo">{{ TEXTO_CORRELACOES_TEMPO.titulo }}</h3>
      <InfoIcon warning :tooltip="tooltipCorrelacoes" class="tooltip-largo" />
    </div>
    <p class="correlacoes-subtitulo">{{ TEXTO_CORRELACOES_TEMPO.subtitulo }}</p>

    <div v-if="carregando" class="correlacoes-status">Carregando correlações...</div>
    <div v-else-if="erro" class="correlacoes-status correlacoes-erro">{{ erro }}</div>

    <template v-else>
      <div v-for="grade in grades" :key="grade.id" class="grade-correlacao">
        <h4 class="grade-titulo">{{ grade.titulo }}</h4>
        <svg
          class="mapa-calor"
          :viewBox="`0 0 ${grade.largura} ${grade.altura}`"
          role="img"
          :aria-label="grade.ariaLabel"
        >
          <!-- Rótulos das colunas -->
          <text
            v-for="(coluna, i) in grade.colunas"
            :key="`col-${coluna.chave}`"
            :x="MARGEM_ESQ + i * TAM + (TAM - GAP) / 2"
            :y="MARGEM_TOPO - 12"
            class="rotulo-eixo"
            text-anchor="middle"
          >{{ coluna.rotulo }}</text>

          <!-- Rótulos das linhas -->
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
              :width="TAM - GAP"
              :height="TAM - GAP"
              :fill="celula.cor"
            />
            <template v-if="!celula.vazia">
              <text
                :x="celula.x + (TAM - GAP) / 2"
                :y="celula.y + (TAM - GAP) / 2 - 8"
                class="valor-celula"
                :fill="celula.corTexto"
                text-anchor="middle"
                dominant-baseline="middle"
              >{{ celula.r.toFixed(2) }}</text>
              <text
                :x="celula.x + (TAM - GAP) / 2"
                :y="celula.y + (TAM - GAP) / 2 + 14"
                class="p-celula"
                :fill="celula.corTexto"
                text-anchor="middle"
                dominant-baseline="middle"
              >p bruto = {{ formatarP(celula.pBruto) }}</text>
              <text
                :x="celula.x + (TAM - GAP) / 2"
                :y="celula.y + (TAM - GAP) / 2 + 32"
                class="p-celula"
                :fill="celula.corTexto"
                text-anchor="middle"
                dominant-baseline="middle"
              >p (Holm) = {{ formatarP(celula.p) }}</text>
            </template>
            <text
              v-else
              :x="celula.x + (TAM - GAP) / 2"
              :y="celula.y + (TAM - GAP) / 2"
              class="valor-celula"
              fill="#666666"
              text-anchor="middle"
              dominant-baseline="middle"
            >—</text>
          </g>

          <!-- Barra de cor (-1 a +1), mesma escala em todas as grades -->
          <defs>
            <linearGradient :id="`gradiente-${grade.id}`" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stop-color="#0070C0" />
              <stop offset="50%" stop-color="#FFFFFF" />
              <stop offset="100%" stop-color="#10B981" />
            </linearGradient>
          </defs>
          <rect
            :x="grade.barraX"
            :y="MARGEM_TOPO"
            :width="22"
            :height="grade.alturaGrade"
            :fill="`url(#gradiente-${grade.id})`"
          />
          <text
            v-for="marca in MARCAS_BARRA"
            :key="`marca-${grade.id}-${marca.valor}`"
            :x="grade.barraX + 30"
            :y="MARGEM_TOPO + ((1 - marca.valor) / 2) * grade.alturaGrade"
            class="rotulo-barra"
            dominant-baseline="middle"
          >{{ marca.texto }}</text>
          <text
            :x="grade.barraX + 70"
            :y="MARGEM_TOPO + grade.alturaGrade / 2"
            class="rotulo-barra"
            text-anchor="middle"
            dominant-baseline="middle"
            :transform="`rotate(90 ${grade.barraX + 70} ${MARGEM_TOPO + grade.alturaGrade / 2})`"
          >Correlação de Spearman (r)</text>
        </svg>
      </div>
    </template>

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
import InfoIcon from './icons/InfoIcon.vue'
import { TEXTO_CORRELACOES_TEMPO, LINKS_TERMOS } from '../config/textosAnalises.js'

// Anos e áreas da análise de caracteres (2021 fica de fora)
const ANOS = [2020, 2022, 2023, 2024, 2025]
const AREAS = ['CH', 'LC', 'CN', 'MT']

// Layout do SVG (unidades do viewBox)
const TAM = 110
const GAP = 4
const MARGEM_ESQ = 200
const MARGEM_TOPO = 45

// Escala de cor do projeto (colors.css): azul FEI para r negativo, verde menta para r positivo, branco em zero
const COR_AZUL = [0, 112, 192]
const COR_BRANCO = [255, 255, 255]
const COR_VERDE = [16, 185, 129]
const MARCAS_BARRA = [
  { valor: 1, texto: '1' },
  { valor: 0.5, texto: '0.5' },
  { valor: 0, texto: '0' },
  { valor: -0.5, texto: '-0.5' },
  { valor: -1, texto: '-1' }
]

const tooltipCorrelacoes = TEXTO_CORRELACOES_TEMPO.explicacao.join('\n')
const notas = TEXTO_CORRELACOES_TEMPO.notas

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
const mostrarMais = ref(false)
const erro = ref('')

function interpolar(de, para, t) {
  return de.map((valor, i) => Math.round(valor + (para[i] - valor) * t))
}

// Converte r (-1 a +1) em RGB: azul → branco → verde
function rgbPorR(r) {
  const valor = Math.max(-1, Math.min(1, r))
  return valor >= 0
    ? interpolar(COR_BRANCO, COR_VERDE, valor)
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

// Monta uma grade: as linhas e colunas vêm de config; casa(item, linha, coluna) diz qual registro cabe na célula.
// Se faltar dado, a célula fica vazia (—).
function montarGrade(config) {
  const alturaGrade = config.linhas.length * TAM - GAP
  const barraX = MARGEM_ESQ + config.colunas.length * TAM + 30
  const largura = barraX + 100
  const altura = MARGEM_TOPO + alturaGrade + 10

  const celulas = config.linhas.flatMap((linha, j) =>
    config.colunas.map((coluna, i) => {
      const x = MARGEM_ESQ + i * TAM
      const y = MARGEM_TOPO + j * TAM
      const chave = `${linha.chave}-${coluna.chave}`
      const registro = dados.value.find((item) => config.casa(item, linha, coluna))
      if (!registro) {
        return { chave, x, y, vazia: true, cor: '#F3F4F6' }
      }
      const rgb = rgbPorR(registro.r)
      return {
        chave,
        x,
        y,
        vazia: false,
        r: registro.r,
        p: registro.p,
        pBruto: registro.pBruto,
        cor: `rgb(${rgb.join(', ')})`,
        corTexto: corTextoPara(rgb)
      }
    })
  )

  return { ...config, alturaGrade, barraX, largura, altura, celulas }
}

const grades = computed(() => [
  montarGrade({
    id: 'caracteres',
    titulo: '',
    ariaLabel: 'Mapa de calor da correlação de Spearman entre caracteres da questão e acerto, por ano e área',
    colunas: AREAS.map((area) => ({ chave: area, rotulo: area })),
    linhas: ANOS.map((ano) => ({ chave: ano, rotulo: String(ano) })),
    casa: (item, linha, coluna) => item.area === coluna.chave && item.ano === linha.chave
  })
])

async function carregar() {
  carregando.value = true
  erro.value = ''

  try {
    const { data } = await http.get('/metricas/correlacoes-tempo')
    dados.value = data.celulas ?? []
  } catch (err) {
    dados.value = []
    erro.value = err.response?.data?.error || 'Não foi possível carregar as correlações'
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

.correlacoes-tempo {
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

/* Tooltip deste gráfico mais largo, para caber o cálculo sem ficar alto demais */
.tooltip-largo :deep(.tooltip) {
  width: 420px;
}

@media (max-width: 768px) {
  .tooltip-largo :deep(.tooltip) {
    width: 300px;
  }
}

.correlacoes-subtitulo {
  margin: 0 0 1rem;
  color: #666;
  font-size: 0.9rem;
}

.grade-correlacao {
  margin-bottom: 1.5rem;
}

.grade-titulo {
  margin: 0 0 0.5rem;
  color: #333;
  font-size: 1rem;
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

.correlacoes-legenda {
  margin: 1rem 0 0;
  padding-left: 1.25rem;
  color: #666;
  font-size: 0.85rem;
}

.correlacoes-link {
  color: #0070c0;
  text-decoration: underline;
}
</style>
