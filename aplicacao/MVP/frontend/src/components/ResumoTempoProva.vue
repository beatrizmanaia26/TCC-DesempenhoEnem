<template>
  <div class="resumo-tempo">
    <div class="resumo-cabecalho">
      <h3 class="resumo-titulo">Como o tempo da prova é usado</h3>
      <InfoIcon warning tooltip="Informação a ser adicionada" />
    </div>
    <p class="resumo-subtitulo">
      Tempo total disponível: {{ dadosFiltrados.total.toFixed(2) }} min. Leitura das questões e dos textos introdutórios, e o restante.
    </p>

    <div class="filter-wrapper">
      <button type="button" class="filter-btn" @click="alternarMenuFiltro">
        <FilterIcon />
        Filtro
      </button>
      <div v-if="mostrarFiltro" class="filter-menu">
        <div class="filter-secao">
          <p class="filter-titulo">DIA</p>
          <div class="filter-option" v-for="opcao in opcoesDia" :key="`dia-${opcao.valor}`">
            <input
              type="radio"
              name="resumo-filtro-dia"
              :id="`resumo-dia-${opcao.valor}`"
              :checked="rascunhoDia === opcao.valor"
              @change="rascunhoDia = opcao.valor"
            />
            <label :for="`resumo-dia-${opcao.valor}`">{{ opcao.rotulo }}</label>
          </div>
        </div>

        <div class="filter-rodape">
          <button type="button" class="filter-aplicar" @click="aplicarFiltro">Aplicar</button>
        </div>
      </div>
    </div>

    <div v-if="carregando" class="resumo-status">Carregando dados de tempo...</div>
    <div v-else-if="erro" class="resumo-status resumo-erro">{{ erro }}</div>

    <div v-else class="resumo-conteudo">
      <svg viewBox="0 0 200 200" class="pizza" role="img" aria-label="Distribuição do tempo da prova">
        <path v-for="fatia in fatias" :key="fatia.chave" :d="fatia.caminho" :fill="fatia.cor" />
      </svg>

      <ul class="legenda">
        <li v-for="fatia in fatias" :key="fatia.chave">
          <span class="legenda-cor" :style="{ background: fatia.cor }"></span>
          <span class="legenda-rotulo">{{ fatia.rotulo }}</span>
          <span class="legenda-valor">{{ fatia.valor.toFixed(2) }} min ({{ fatia.percentual.toFixed(1) }}%)</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import http from '../services/http.js'
import FilterIcon from './icons/FilterIcon.vue'
import InfoIcon from './icons/InfoIcon.vue'

const props = defineProps({
  ano: {
    type: Number,
    required: true
  }
})

const CORES = {
  questoes: '#0070C0',
  textos: '#10B981',
  restante: '#CBD5E1'
}

const opcoesDia = [
  { valor: 'todos', rotulo: 'Todos os dias' },
  { valor: 1, rotulo: 'Dia 1' },
  { valor: 2, rotulo: 'Dia 2' }
]

const dias = ref([])
const carregando = ref(false)
const erro = ref('')
const mostrarFiltro = ref(false)
const diaSelecionado = ref('todos')
const rascunhoDia = ref('todos')

// Soma os dias escolhidos no filtro. "Todos os dias" soma os dois.
const dadosFiltrados = computed(() => {
  const escolhidos = diaSelecionado.value === 'todos'
    ? dias.value
    : dias.value.filter((dia) => dia.dia === diaSelecionado.value)

  return escolhidos.reduce(
    (acumulado, dia) => ({
      total: acumulado.total + dia.tempo_total_min,
      questoes: acumulado.questoes + dia.tempo_questoes_min,
      textos: acumulado.textos + dia.tempo_textos_min,
      restante: acumulado.restante + dia.tempo_restante_min
    }),
    { total: 0, questoes: 0, textos: 0, restante: 0 }
  )
})

// Converte um intervalo de graus em um caminho SVG de setor de círculo
function caminhoSetor(inicioGraus, fimGraus) {
  const cx = 100
  const cy = 100
  const raio = 90

  if (fimGraus - inicioGraus <= 0) {
    return ''
  }

  if (fimGraus - inicioGraus >= 360) {
    return `M ${cx} ${cy - raio} A ${raio} ${raio} 0 1 1 ${cx} ${cy + raio} A ${raio} ${raio} 0 1 1 ${cx} ${cy - raio} Z`
  }

  const ponto = (graus) => {
    const radianos = ((graus - 90) * Math.PI) / 180
    return [cx + raio * Math.cos(radianos), cy + raio * Math.sin(radianos)]
  }

  const [x1, y1] = ponto(inicioGraus)
  const [x2, y2] = ponto(fimGraus)
  const arcoGrande = fimGraus - inicioGraus > 180 ? 1 : 0

  return `M ${cx} ${cy} L ${x1} ${y1} A ${raio} ${raio} 0 ${arcoGrande} 1 ${x2} ${y2} Z`
}

const fatias = computed(() => {
  const { total, questoes, textos, restante } = dadosFiltrados.value

  const itens = [
    { chave: 'questoes', rotulo: 'Leitura das questões', valor: questoes, cor: CORES.questoes },
    { chave: 'textos', rotulo: 'Leitura dos textos introdutórios', valor: textos, cor: CORES.textos },
    { chave: 'restante', rotulo: 'Restante', valor: restante, cor: CORES.restante }
  ]

  let anguloAtual = 0
  return itens.map((item) => {
    const fracao = total ? item.valor / total : 0
    const inicio = anguloAtual
    anguloAtual += fracao * 360

    return {
      ...item,
      percentual: fracao * 100,
      caminho: caminhoSetor(inicio, anguloAtual)
    }
  })
})

async function carregar(ano) {
  carregando.value = true
  erro.value = ''

  try {
    const { data } = await http.get('/metricas/tempo-resumo', { params: { ano } })
    dias.value = data.dias
  } catch (err) {
    dias.value = []
    erro.value = err.response?.data?.error || 'Não foi possível carregar o resumo de tempo'
  } finally {
    carregando.value = false
  }
}

watch(() => props.ano, carregar, { immediate: true })

// Ao abrir o menu, o rascunho volta a refletir o filtro aplicado
function alternarMenuFiltro() {
  mostrarFiltro.value = !mostrarFiltro.value
  rascunhoDia.value = diaSelecionado.value
}

function aplicarFiltro() {
  diaSelecionado.value = rascunhoDia.value
  mostrarFiltro.value = false
}
</script>


<style scoped>
.resumo-tempo {
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  margin: 1.5rem 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.resumo-cabecalho {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.resumo-titulo {
  margin: 0;
  color: #333;
}

.resumo-subtitulo {
  margin: 0 0 1rem;
  color: #666;
  font-size: 0.9rem;
}

.resumo-status {
  padding: 1rem 0;
  color: #666;
}

.resumo-erro {
  color: #c0392b;
}

.resumo-conteudo {
  display: flex;
  align-items: center;
  gap: 2rem;
  flex-wrap: wrap;
  justify-content: center;
}

.pizza {
  width: 220px;
  height: 220px;
  flex-shrink: 0;
}

.legenda {
  list-style: none;
  margin: 0;
  padding: 0;
  min-width: 260px;
}

.legenda li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
  font-size: 0.9rem;
}

.legenda-cor {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  flex-shrink: 0;
}

.legenda-rotulo {
  flex: 1;
  color: #333;
}

.legenda-valor {
  color: #666;
  white-space: nowrap;
}

.filter-wrapper {
  position: relative;
  display: inline-block;
  margin-bottom: 1rem;
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
  white-space: nowrap;
}

.filter-btn:hover {
  background: #f0f7ff;
}

.filter-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  padding: 1rem;
  margin-top: 0.5rem;
  min-width: 240px;
  z-index: 100;
}

.filter-titulo {
  margin: 0 0 0.25rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #555;
}

.filter-option {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  margin: 0.15rem 0;
  border-radius: 4px;
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
}

.filter-aplicar:hover {
  background: #005a9e;
}
</style>
