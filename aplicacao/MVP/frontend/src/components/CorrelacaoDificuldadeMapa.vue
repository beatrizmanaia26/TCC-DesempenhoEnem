<template>
  <div class="correlacao-dificuldade-mapa">
    <div class="correlacoes-cabecalho">
      <h3 class="correlacoes-titulo">{{ TEXTO_MAPA_DIFICULDADE.titulo }}</h3>
      <InfoIcon warning :tooltip="tooltipMapa" />
    </div>
    <p class="correlacoes-subtitulo">{{ TEXTO_MAPA_DIFICULDADE.subtitulo }}</p>

    <div v-if="carregando" class="correlacoes-status">Carregando correlações...</div>
    <div v-else-if="erro" class="correlacoes-status correlacoes-erro">{{ erro }}</div>

    <div v-else>
      <div v-for="grade in grades" :key="grade.id" class="grade-correlacao">
        <h4 class="grade-titulo">
          {{ grade.titulo }}
          <InfoIcon warning :tooltip="grade.tooltip" />
        </h4>
        <p class="grade-resultado">{{ grade.resultado }}</p>
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
            :x="MARGEM_ESQ + i * TAM + (TAM - GAP) / 2"
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

          <!-- Barra de cor (-1 a +1), mesma escala do mapa geral -->
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
    </div>

    <ul v-if="!carregando && !erro" class="correlacoes-legenda">
      <li v-for="(texto, indice) in notas" :key="indice">{{ texto }}</li>
    </ul>
  </div>
</template>


<script setup>
import { computed, ref, onMounted } from 'vue'
import http from '../services/http.js'
import {
  TEXTO_MAPA_DIFICULDADE,
  TEXTO_MAPA_DIFICULDADE_GRADE,
  TEXTO_RESULTADO_DIFICULDADE
} from '../config/textosAnalises.js'
import InfoIcon from './icons/InfoIcon.vue'


// Anos, áreas e níveis da análise (2021 fica de fora)
const ANOS = [2020, 2022, 2023, 2024, 2025]
const AREAS = ['CH', 'LC', 'CN', 'MT']
const NIVEIS = [
  { chave: 'facil', rotulo: 'Fácil' },
  { chave: 'media', rotulo: 'Média' },
  { chave: 'dificil', rotulo: 'Difícil' }
]

// Layout do SVG (unidades do viewBox), igual ao MapaCalorCorrelacoes
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

const tooltipMapa = TEXTO_MAPA_DIFICULDADE.explicacao.join('\n')
const tooltipGrade = TEXTO_MAPA_DIFICULDADE_GRADE.filter((linha) => linha !== '').join('\n')

const notas = TEXTO_MAPA_DIFICULDADE.notas

const dados = ref([])
const carregando = ref(false)
const erro = ref('')

function interpolar(de, para, t) {
  return de.map((valor, i) => Math.round(valor + (para[i] - valor) * t))
}

// Converte r (-1 a +1) em cor: azul para negativo, branco em zero, verde para positivo
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

// Monta a grade de um nível: linhas = anos, colunas = áreas. Célula sem dado fica vazia (—).
function montarGrade(nivel) {
  const linhas = ANOS.map((ano) => ({ chave: ano, rotulo: String(ano) }))
  const colunas = AREAS.map((area) => ({ chave: area, rotulo: area }))
  const alturaGrade = linhas.length * TAM - GAP
  const barraX = MARGEM_ESQ + colunas.length * TAM + 30
  const largura = barraX + 100
  const altura = MARGEM_TOPO + alturaGrade + 10

  const celulas = linhas.flatMap((linha, j) =>
    colunas.map((coluna, i) => {
      const x = MARGEM_ESQ + i * TAM
      const y = MARGEM_TOPO + j * TAM
      const chave = `${linha.chave}-${coluna.chave}`
      const registro = dados.value.find(
        (item) => item.dificuldade === nivel.chave && item.area === coluna.chave && item.ano === linha.chave
      )
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
        cor: `rgb(${rgb.join(', ')})`,
        corTexto: corTextoPara(rgb)
      }
    })
  )

  return {
    id: nivel.chave,
    titulo: `${nivel.rotulo}: caracteres da questão × acerto, por ano e área`,
    tooltip: tooltipGrade,
    resultado: TEXTO_RESULTADO_DIFICULDADE[nivel.chave],

    ariaLabel: `Mapa de calor da correlação de Spearman entre caracteres da questão e acerto, nível ${nivel.rotulo.toLowerCase()}, por ano e área`,
    colunas,
    linhas,
    alturaGrade,
    barraX,
    largura,
    altura,
    celulas
  }
}

const grades = computed(() => NIVEIS.map(montarGrade))

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

.grade-resultado {
  margin: 0 0 0.75rem;
  color: #444;
  font-size: 0.9rem;
  line-height: 1.5;
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
</style>

