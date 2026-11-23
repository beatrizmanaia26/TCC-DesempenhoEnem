<template>
  <div>
    <h3>Similaridade entre as alternativas</h3>
    <p v-if="!questao">Nenhuma questão foi encontrada na prova.</p>
    <template v-else>
      <p class="questao-info" aria-live="polite">
        <strong>Questão {{ questao.questao ?? indice + 1 }}</strong>
        <template v-if="correta">
          <br />
          <small>Gabarito {{ correta }}</small>
        </template>
      </p>
      <MatrizSimilaridadeAlternativas
        :letras="letras"
        :valor-comparacao="valorComparacao"
        :dica-comparacao="dicaComparacao"
        :gabarito="correta ?? ''"
        :indice="indice"
        :total="questoes.length"
        @ir-para-indice="irParaIndice"
        @ir-para-questao="irParaQuestao"
      >
        <template v-if="!matriz" #conteudo>
          <p v-if="carregando" role="status">Calculando a similaridade semântica desta questão…</p>
          <div v-else-if="erro">
            <p role="alert">{{ erro }}</p>
            <button type="button" @click="tentativa++">Tentar novamente</button>
          </div>
          <p v-else-if="exclusao" role="status">{{ mensagensExclusao[exclusao] }}</p>
        </template>
      </MatrizSimilaridadeAlternativas>
      <p v-if="matriz" class="nota">
        Similaridade semântica com o mesmo modelo da análise dos ENEMs.
      </p>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { calcularSimilaridadesProva } from '@/services/analysisApi.js'
import MatrizSimilaridadeAlternativas from './MatrizSimilaridadeAlternativas.vue'

const props = defineProps({
  questoes: { type: Array, required: true },
})
const indice = ref(0)
const questao = computed(() => props.questoes[indice.value])
const matriz = ref(null)
const exclusao = ref('')
const tentativa = ref(0)
const carregando = ref(false)
const erro = ref('')
const mensagensExclusao = {
  grafica: 'Questão excluída da similaridade por conter alternativas gráficas.',
  numerica: 'Questão excluída da similaridade por conter alternativas numéricas.',
  'texto-incompleto': 'Questão excluída da similaridade por falta de texto nas alternativas.',
}
const formatar = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 3,
  minimumFractionDigits: 3,
})

const alternativas = computed(() => questao.value?.alternativas ?? [])
const letras = computed(() => alternativas.value.map(({ letra }) => letra))
const correta = computed(() => {
  const letra = String(questao.value?.gabarito ?? '')
    .trim()
    .toUpperCase()
  return letras.value.includes(letra) ? letra : null
})

function valorComparacao(_a, _b, linha, coluna) {
  return matriz.value?.[linha]?.[coluna] ?? null
}

function dicaComparacao(a, b, valor, diagonal) {
  if (diagonal) return `${a}: mesma alternativa`

  const resultado = valor === null ? 'Sem texto comparável' : formatar.format(valor)
  const envolveCorreta = a === correta.value || b === correta.value
  return `${a} × ${b}: ${resultado}${envolveCorreta ? ' · Comparação com a correta' : ''}`
}

watch([questao, tentativa], async ([atual], _anterior, onCleanup) => {
  erro.value = ''
  matriz.value = null
  exclusao.value = ''
  carregando.value = Boolean(atual)
  if (!atual) return

  const requisicao = new AbortController()
  onCleanup(() => requisicao.abort())

  try {
    const resultado = await calcularSimilaridadesProva(atual, requisicao.signal)
    if (!requisicao.signal.aborted) {
      matriz.value = resultado.matriz ?? null
      exclusao.value = resultado.exclusao ?? ''
    }
  } catch (falha) {
    if (!requisicao.signal.aborted) erro.value = falha.message
  } finally {
    if (!requisicao.signal.aborted) carregando.value = false
  }
}, { immediate: true })

watch(() => props.questoes, () => { indice.value = 0 })

function irParaIndice(novoIndice) {
  if (novoIndice >= 0 && novoIndice < props.questoes.length) indice.value = novoIndice
}

function irParaQuestao(evento) {
  const campo = evento.target
  const entrada = campo.value.trim()
  const numeroOriginal = /^q(\d+)$/i.exec(entrada)
  if (
    numeroOriginal &&
    Number(questao.value.questao ?? indice.value + 1) !== Number(numeroOriginal[1])
  ) {
    irParaIndice(
      props.questoes.findIndex(
        (item, i) => Number(item.questao ?? i + 1) === Number(numeroOriginal[1]),
      ),
    )
  } else if (/^\d+$/.test(entrada)) {
    irParaIndice(Number(entrada) - 1)
  }
  campo.value = String(indice.value + 1)
}
</script>

<style scoped>
.questao-info {
  font-size: 1.25rem;
  font-weight: 600;
  color: #24364b;
}
.nota {
  font-size: 0.88rem;
  line-height: 1.5;
  color: #536273;
}
</style>
