<template>
  <slot v-if="$slots.conteudo" name="conteudo" />
  <div v-else-if="letras.length >= 2" class="rolagem">
    <svg
      class="grafico-matriz"
      :viewBox="`0 0 ${largura} ${alturaLegenda + 60}`"
      role="img"
      aria-label="Matriz de similaridade entre as alternativas"
    >
      <g v-for="(letra, i) in letras" :key="letra">
        <text :x="145 + i * 70" y="31" text-anchor="middle">
          {{ letra }}{{ letra === gabarito ? ' ✓' : '' }}
        </text>
        <text x="85" :y="85 + i * 65" text-anchor="end">
          {{ letra }}{{ letra === gabarito ? ' ✓' : '' }}
        </text>
      </g>
      <g
        v-for="celula in celulas"
        :key="celula.par"
        tabindex="0"
        role="img"
        :aria-label="celula.dica"
        @mouseenter="mostrarDica($event, celula.dica)"
        @mousemove="moverDica($event)"
        @mouseleave="ocultarDica()"
        @focus="mostrarDica($event, celula.dica)"
        @blur="ocultarDica()"
        @keydown.esc="ocultarDica()"
        :aria-describedby="flutuante.visivel ? tooltipId : undefined"
      >
        <rect
          :x="110 + celula.coluna * 70"
          :y="48 + celula.linha * 65"
          width="68"
          height="63"
          :fill="celula.valor == null ? '#edf1f5' : corSimilaridade(celula.valor)"
        />
        <text
          :x="144 + celula.coluna * 70"
          :y="85 + celula.linha * 65"
          text-anchor="middle"
          :style="{ fill: !(celula.valor == null) && celula.valor > 0.6 ? 'white' : '#24364b' }"
        >
          {{ celula.valor == null ? '—' : numero(celula.valor, 3) }}
        </text>
      </g>
      <g v-for="(v, i) in [-1, -0.5, 0, 0.5, 1]" :key="v">
        <rect
          :x="100 + i * 80"
          :y="alturaLegenda"
          width="80"
          height="15"
          :fill="corSimilaridade(v)"
        />
        <text :x="140 + i * 80" :y="alturaLegenda + 37" text-anchor="middle">
          {{ numero(v, 1) }}
        </text>
      </g>
    </svg>
  </div>
  <p v-else class="nota">Esta questão tem menos de duas alternativas extraídas.</p>
  <div class="paginacao-questoes" role="group" aria-label="Navegação pelas questões filtradas">
    <button
      type="button"
      aria-label="Questão anterior"
      :disabled="indice === 0"
      @click="$emit('ir-para-indice', indice - 1)"
    >
      ‹
    </button>
    <input
      :value="indice + 1"
      aria-label="Posição na lista de questões filtradas"
      title="Digite a posição na lista ou o número original, como Q46"
      @change="$emit('ir-para-questao', $event)"
      @keydown.enter.prevent="$event.target.blur()"
    />
    <span>/ {{ total }}</span>
    <button
      type="button"
      aria-label="Próxima questão"
      :disabled="indice === total - 1"
      @click="$emit('ir-para-indice', indice + 1)"
    >
      ›
    </button>
  </div>
  <p v-if="gabarito && !$slots.conteudo" class="legenda"><span>✓ Resposta correta</span></p>
  <p v-if="letras.length >= 2 && !$slots.conteudo" class="nota">
    A escala de cores é fixa de −1 a 1. As comparações A–B e B–A representam o mesmo valor.
  </p>
  <Teleport to="body">
    <div
      v-if="flutuante.visivel"
      :id="tooltipId"
      ref="tooltipElemento"
      class="tooltip-mouse"
      role="tooltip"
      :style="{ left: flutuante.x + 'px', top: flutuante.y + 'px' }"
    >
      {{ flutuante.texto }}
    </div>
  </Teleport>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useDicaGrafico } from './useDicaGrafico.js'

const props = defineProps({
  letras: { type: Array, required: true },
  valorComparacao: { type: Function, required: true },
  dicaComparacao: { type: Function, required: true },
  gabarito: { type: String, default: '' },
  indice: { type: Number, required: true },
  total: { type: Number, required: true },
})
defineEmits(['ir-para-indice', 'ir-para-questao'])

const { tooltipId, tooltipElemento, flutuante, mostrarDica, moverDica, ocultarDica } =
  useDicaGrafico()
watch(() => props.indice, ocultarDica)

const largura = computed(() => Math.max(600, 210 + props.letras.length * 70))
const alturaLegenda = computed(() => Math.max(395, 70 + props.letras.length * 65))
const numero = (v, casas = 3) =>
  typeof v === 'number' && Number.isFinite(v)
    ? v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
    : '—'
const celulas = computed(() =>
  props.letras.flatMap((a, linha) =>
    props.letras.map((b, coluna) => {
      const diagonal = linha === coluna
      const valor = diagonal ? null : props.valorComparacao(a, b, linha, coluna)
      const dica = props.dicaComparacao(a, b, valor, diagonal)
      return { linha, coluna, valor, dica, par: a + b }
    }),
  ),
)
function corSimilaridade(v) {
  if (v < 0) {
    const t = v + 1
    return `rgb(${Math.round(190 + 55 * t)},${Math.round(70 + 175 * t)},${Math.round(80 + 165 * t)})`
  }
  return `rgb(${Math.round(245 - 245 * v)},${Math.round(245 - 133 * v)},${Math.round(245 - 53 * v)})`
}
</script>

<style scoped>
.rolagem {
  overflow-x: auto;
}
.grafico-matriz {
  display: block;
  width: 100%;
  max-width: 650px;
  min-width: 400px;
  margin: auto;
}
svg text {
  font:
    12px system-ui,
    sans-serif;
  fill: #34455a;
}
svg g:focus rect {
  stroke: #171717;
  stroke-width: 3;
}
:focus-visible {
  outline: 3px solid #c57900;
  outline-offset: 3px;
}
.paginacao-questoes {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 16px 0;
  color: #24364b;
}
.paginacao-questoes input {
  width: 4em;
  text-align: center;
  font: inherit;
  padding: 7px 4px;
  border: 1px solid #aab9c9;
  border-radius: 5px;
}
.paginacao-questoes button {
  font: inherit;
  border: 1px solid #aab9c9;
  border-radius: 5px;
  background: white;
  padding: 7px 12px;
  color: #24364b;
  cursor: pointer;
}
.paginacao-questoes button:disabled {
  opacity: 0.45;
  cursor: default;
}
.legenda {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  font-size: 0.85rem;
  color: #24364b;
}
.nota {
  font-size: 0.88rem;
  line-height: 1.5;
  color: #536273;
}
.tooltip-mouse {
  position: fixed;
  z-index: 10000;
  pointer-events: none;
  white-space: pre-line;
  box-sizing: border-box;
  max-width: calc(100vw - 16px);
  max-height: calc(100vh - 16px);
  overflow: hidden;
  background: #111827;
  color: #fff;
  padding: 10px 12px;
  border: 1px solid #334155;
  border-radius: 5px;
  box-shadow: 0 4px 12px #0003;
  font:
    12px/1.6 system-ui,
    sans-serif;
}
</style>
