<!-- ====mapa de calor da correlação de Spearman da prova enviada: linhas = dificuldade, uma célula por nível -->
<template>
  <div class="correlacao-prova-mapa">
    <div class="correlacoes-cabecalho">
      <h3 class="correlacoes-titulo">Correlação entre Tamanho da Questão e Percentual de Acertos por Dificuldade</h3>
      <InfoIcon warning :tooltip="tooltipMapa" class="tooltip-largo" />
    </div>
    <p class="correlacoes-subtitulo">
      Correlação de <a :href="URL_SPEARMAN" target="_blank" rel="noopener noreferrer" class="correlacoes-link">Spearman</a> entre os caracteres de cada questão desta prova e o percentual de acerto, separada por nível de dificuldade.
    </p>

    <p v-if="!temDados" class="correlacoes-status">{{ mensagemSemDados }}</p>

    <svg
      v-else
      class="mapa-calor"
      :viewBox="`0 0 ${largura} ${altura}`"
      role="img"
      aria-label="Mapa de calor da correlação de Spearman entre caracteres da questão e percentual de acerto desta prova, por nível de dificuldade"
    >
      <text :x="MARGEM_ESQ + (TAM - GAP) / 2" :y="MARGEM_TOPO - 12" class="rotulo-eixo" text-anchor="middle">Prova</text>

      <text
        v-for="(linha, j) in linhas"
        :key="`lin-${linha.chave}`"
        :x="MARGEM_ESQ - 12"
        :y="MARGEM_TOPO + j * TAM + (TAM - GAP) / 2"
        class="rotulo-eixo"
        text-anchor="end"
        dominant-baseline="middle"
      >{{ linha.rotulo }}</text>

      <g v-for="celula in celulas" :key="celula.chave">
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

      <defs>
        <linearGradient id="gradiente-prova-spearman" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="#0070C0" />
          <stop offset="50%" stop-color="#FFFFFF" />
          <stop offset="100%" stop-color="#10B981" />
        </linearGradient>
      </defs>
      <rect :x="barraX" :y="MARGEM_TOPO" :width="22" :height="alturaGrade" fill="url(#gradiente-prova-spearman)" />
      <text
        v-for="marca in MARCAS_BARRA"
        :key="`marca-${marca.valor}`"
        :x="barraX + 30"
        :y="MARGEM_TOPO + ((1 - marca.valor) / 2) * alturaGrade"
        class="rotulo-barra"
        dominant-baseline="middle"
      >{{ marca.texto }}</text>
      <text
        :x="barraX + 70"
        :y="MARGEM_TOPO + alturaGrade / 2"
        class="rotulo-barra"
        text-anchor="middle"
        dominant-baseline="middle"
        :transform="`rotate(90 ${barraX + 70} ${MARGEM_TOPO + alturaGrade / 2})`"
      >Correlação de Spearman (r)</text>
    </svg>

    <ul class="correlacoes-legenda">
      <li v-for="(texto, indice) in notas" :key="indice">
        <template v-for="(parte, i) in dividirComLinks(texto)" :key="i">
          <a v-if="parte.url" :href="parte.url" target="_blank" rel="noopener noreferrer" class="correlacoes-link">{{ parte.texto }}</a>
          <template v-else>{{ parte.texto }}</template>
        </template>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import InfoIcon from '@/components/icons/InfoIcon.vue'
import { calcularSpearmanPorNivel, MINIMO_QUESTOES_SPEARMAN } from '@/services/spearmanProva.js'
import { LINKS_TERMOS } from '@/config/textosAnalises.js'

// Mesma explicação de Spearman usada nas notas do mapa do ENEM
const URL_SPEARMAN = LINKS_TERMOS.find((link) => link.termo === 'correlação de Spearman').url

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

// questoes: [{ rotulo, caracteres, taxa_acerto_percentual, dificuldade }], na ordem da prova
const props = defineProps({
  questoes: {
    type: Array,
    default: () => []
  }
})

// Linhas: "Todas" (todas as questões com acerto) e um nível por dificuldade do formulário
const NIVEIS = [
  { chave: 'facil', rotulo: 'Fácil' },
  { chave: 'medio', rotulo: 'Média' },
  { chave: 'dificil', rotulo: 'Difícil' }
]
const linhas = [{ chave: 'todas', rotulo: 'Todas' }, ...NIVEIS]

// Layout do SVG (unidades do viewBox), igual ao MapaCalorCorrelacoes do ENEM
const TAM = 110
const GAP = 4
const MARGEM_ESQ = 150
const MARGEM_TOPO = 45
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
const alturaGrade = linhas.length * TAM - GAP
const barraX = MARGEM_ESQ + TAM + 30
const largura = barraX + 100
const altura = MARGEM_TOPO + alturaGrade + 10

const tooltipMapa = [
  'Cada célula é a correlação de Spearman entre os caracteres (enunciado + alternativas) das questões desta prova e o percentual de acerto, dentro de um nível de dificuldade. A linha "Todas" usa todas as questões com acerto informado.',
  '',
  'r (Spearman): correlação de postos. Vai de −1 a +1.',
  '',
  'p bruto: aproximação t de Student com n − 2 graus de liberdade.',
  '',
  'p (Holm): ajuste do p bruto sobre as 4 linhas (Todas, Fácil, Média, Difícil), para manter em 5% a chance de falso positivo no conjunto.'
].join('\n')

const notas = [
  'Cada célula mostra a correlação de Spearman (r), o valor de p bruto e ajustado (Holm).',
  'O r mostra a força da relação, de −1 a 1. Quanto mais longe de 0, mais forte.',
  'Verde = correlação positiva: quando o número de caracteres sobe, o acerto tende a subir junto.',
  'Azul = correlação negativa: quando o número de caracteres sobe, o acerto tende a cair.',
  'Branco = quase nenhuma relação entre o número de caracteres e o acerto.',
  'p bruto: mede quão raro seria um r tão forte quanto o observado se não houvesse relação nenhuma entre tamanho e acerto. Aqui é uma aproximação t de Student.',
  'p baixo: um r seria raro sem relação, há indício de relação.',
  'p alto: um r seria comum sem relação. O resultado é compatível com ausência de relação.',
  'p (Holm) ajusta o p bruto considerando as 4 linhas (Todas, Fácil, Média e Difícil), para que o risco de pelo menos um falso positivo fique em 5%. Só é tratado como significativo abaixo de 0,05.',
  `Com poucas questões por nível, o resultado é instável. Cada célula precisa de pelo menos ${MINIMO_QUESTOES_SPEARMAN} questões com acerto informado; as demais aparecem como —.`
]

// Resultado por linha: "Todas" usa todas as questões; cada nível usa só as questões dele
const resultados = computed(() => {
  const todas = calcularSpearmanPorNivel(
    props.questoes.map((questao) => ({ ...questao, dificuldade: 'todas' })),
    [{ chave: 'todas' }]
  )
  return [...todas, ...calcularSpearmanPorNivel(props.questoes, NIVEIS)]
})

const temDados = computed(() => resultados.value.some((celula) => celula.r !== null))
const temAcertoInformado = computed(() => props.questoes.some(
  (questao) => questao.taxa_acerto_percentual !== null && questao.taxa_acerto_percentual !== undefined
))
const mensagemSemDados = computed(() => (temAcertoInformado.value
  ? `São necessárias pelo menos ${MINIMO_QUESTOES_SPEARMAN} questões com acerto informado para calcular a correlação.`
  : 'Informe os acertos por questão (em "Deseja incluir métricas dos estudantes?") para ver esta correlação.'))

// Escala de cor do projeto: azul para r negativo, branco em zero, verde para r positivo
function interpolar(de, para, t) {
  return de.map((valor, i) => Math.round(valor + (para[i] - valor) * t))
}
function rgbPorR(r) {
  const valor = Math.max(-1, Math.min(1, r))
  return valor >= 0
    ? interpolar(COR_BRANCO, COR_VERDE, valor)
    : interpolar(COR_BRANCO, COR_AZUL, -valor)
}
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

// Uma célula por linha: a coluna é única (a prova inteira)
const celulas = computed(() => linhas.map((linha, j) => {
  const x = MARGEM_ESQ
  const y = MARGEM_TOPO + j * TAM
  const resultado = resultados.value.find((item) => item.nivel === linha.chave)
  if (!resultado || resultado.r === null) {
    return { chave: linha.chave, x, y, vazia: true, cor: '#F3F4F6' }
  }
  const rgb = rgbPorR(resultado.r)
  return {
    chave: linha.chave,
    x,
    y,
    vazia: false,
    r: resultado.r,
    pBruto: resultado.pBruto,
    p: resultado.p,
    cor: `rgb(${rgb.join(', ')})`,
    corTexto: corTextoPara(rgb)
  }
}))
</script>

<style scoped>
.correlacao-prova-mapa {
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

.correlacoes-link {
  color: #0070c0;
  text-decoration: underline;
}

.correlacoes-status {
  padding: 1rem 0;
  color: #666;
}

.mapa-calor {
  display: block;
  width: 100%;
  max-width: 420px;
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

.tooltip-largo :deep(.tooltip) {
  width: 420px;
}

@media (max-width: 768px) {
  .tooltip-largo :deep(.tooltip) {
    width: 300px;
  }
}

.correlacoes-legenda {
  margin: 1rem 0 0;
  padding-left: 1.25rem;
  color: #666;
  font-size: 0.85rem;
}
</style>

