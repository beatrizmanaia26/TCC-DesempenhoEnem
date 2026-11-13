<template>
  <!-- Sessão das imagens -->
  <div>
    <h2 class="titulo-analise">{{ titulo }}</h2>
    <div class="tempo-bloco">
      <div class="tempo-cabecalho">
        <h2>Presença de imagens na prova</h2>
        <InfoIcon tooltip="Mostra a proporção de questões com e sem imagens na prova." />
        <div v-if="temDificuldade" class="filter-wrapper">
          <button type="button" class="filter-btn" @click="alternarFiltroPizza">
            <FilterIcon />
            Filtro
          </button>
          <div v-if="mostrarFiltroPizza" class="filter-menu">
            <p class="filter-titulo">DIFICULDADE</p>
            <div class="filter-option" v-for="opcao in opcoesDificuldade" :key="`pizza-dificuldade-${opcao.valor}`">
              <input
                type="radio"
                name="filtro-dificuldade-pizza-imagens"
                :id="`pizza-dificuldade-imagens-${opcao.valor}`"
                :checked="rascunhoDificuldadePizza === opcao.valor"
                @change="rascunhoDificuldadePizza = opcao.valor"
              />
              <label :for="`pizza-dificuldade-imagens-${opcao.valor}`">{{ opcao.rotulo }}</label>
            </div>
            <div class="filter-rodape">
              <button type="button" class="filter-aplicar" @click="aplicarFiltroPizza">Aplicar</button>
            </div>
          </div>
        </div>
      </div>
      <p class="tempo-subtitulo">{{ questoesComImagemPizza.length }} de {{ questoesFiltradasPizza.length }} questões têm imagem ({{ formatarPercentual(percentualComImagemPizza) }}%).</p>
      <div v-if="questoesFiltradasPizza.length" class="tempo-conteudo">
        <svg viewBox="0 0 200 200" class="pizza" role="img" aria-label="Proporção de questões com e sem imagem">
          <path v-for="fatia in fatiasImagem" :key="fatia.chave" :d="fatia.caminho" :fill="fatia.cor" />
        </svg>
        <ul class="legenda">
          <li v-for="fatia in fatiasImagem" :key="fatia.chave">
            <span class="legenda-cor" :style="{ background: fatia.cor }"></span>
            <span class="legenda-rotulo">{{ fatia.rotulo }}</span>
            <span class="legenda-valor">{{ fatia.valor }} ({{ formatarPercentual(fatia.percentual) }}%)</span>
          </li>
        </ul>
      </div>

      <div class="grafico-acertos">
        <div class="grafico-cabecalho">
          <h3>Percentual médio de acertos por presença de imagem</h3>
          <InfoIcon tooltip="Cada barra mostra a média dos percentuais de acerto das questões daquele grupo. A comparação usa apenas questões com percentual de acerto informado." />
          <div v-if="temAcertos" class="filter-wrapper">
            <button type="button" class="filter-btn" @click="alternarMenuFiltro">
              <FilterIcon />
              Filtro
            </button>
            <div v-if="mostrarFiltro" class="filter-menu">
              <div v-if="temDificuldade" class="filter-secao">
                <p class="filter-titulo">DIFICULDADE</p>
                <div class="filter-option" v-for="opcao in opcoesDificuldade" :key="`imagem-dificuldade-${opcao.valor}`">
                  <input
                    type="radio"
                    name="filtro-dificuldade-imagens"
                    :id="`imagem-dificuldade-${opcao.valor}`"
                    :checked="rascunhoDificuldade === opcao.valor"
                    @change="rascunhoDificuldade = opcao.valor"
                  />
                  <label :for="`imagem-dificuldade-${opcao.valor}`">{{ opcao.rotulo }}</label>
                </div>
              </div>
              <div class="filter-secao">
                <p class="filter-titulo">QUESTÕES</p>
                <div class="filter-option" v-for="opcao in opcoesImagem" :key="`imagem-serie-${opcao.valor}`">
                  <input
                    type="radio"
                    name="filtro-serie-imagens"
                    :id="`imagem-serie-${opcao.valor}`"
                    :checked="rascunhoImagem === opcao.valor"
                    @change="rascunhoImagem = opcao.valor"
                  />
                  <label :for="`imagem-serie-${opcao.valor}`">{{ opcao.rotulo }}</label>
                </div>
              </div>
              <div class="filter-rodape">
                <button type="button" class="filter-aplicar" @click="aplicarFiltro">Aplicar</button>
              </div>
            </div>
          </div>
        </div>
        <p class="grafico-subtitulo">Média simples dos percentuais de acerto das questões em cada grupo.</p>
        <p v-if="!temAcertos" class="grafico-aviso" role="note">
          Informe os acertos por questão (em "Deseja incluir métricas reais dos estudantes?") para ver a correlação desta prova.
        </p>
        <template v-else>
          <p v-if="!temDificuldade" class="grafico-aviso" role="note">
            A dificuldade não foi informada. O gráfico apresenta a comparação geral da prova, sem filtro por dificuldade.
          </p>
          <p v-else-if="temQuestoesSemDificuldade" class="grafico-aviso" role="note">
            Algumas questões não têm dificuldade informada; elas aparecem no grupo “Sem nível”.
          </p>
          <div v-if="barrasAcertos.length" class="grafico-barras-conteudo">
            <svg class="grafico-barras" :width="larguraGrafico" height="320" :viewBox="`0 0 ${larguraGrafico} 320`" role="img" :aria-label="descricaoGrafico">
              <g v-for="marca in marcasEixo" :key="`eixo-${marca.valor}`">
                <line x1="52" :y1="marca.y" :x2="larguraGrafico - 12" :y2="marca.y" class="linha-grade" />
                <text x="44" :y="marca.y + 4" text-anchor="end" class="texto-eixo">{{ marca.valor }}%</text>
              </g>
              <g v-for="barra in barrasAcertos" :key="barra.id">
                <rect :x="barra.x" :y="barra.y" :width="barra.largura" :height="barra.altura" :fill="barra.cor" rx="3">
                  <title>{{ barra.titulo }}</title>
                </rect>
                <text :x="barra.x + barra.largura / 2" :y="barra.y - 6" text-anchor="middle" class="texto-valor">{{ formatarPercentual(barra.valor) }}%</text>
              </g>
              <text v-for="grupo in gruposGrafico" :key="`rotulo-${grupo.key}`" :x="grupo.x" y="286" text-anchor="middle" class="texto-categoria">{{ grupo.label }}</text>
            </svg>
            <div class="legenda-barras">
              <span v-if="mostrarComImagem"><i class="cor-com-imagem"></i>Com imagem</span>
              <span v-if="mostrarSemImagem"><i class="cor-sem-imagem"></i>Sem imagem</span>
            </div>
          </div>
          <p v-else class="grafico-aviso">Não há questões com acertos informados para os filtros selecionados.</p>
        </template>
      </div>

      <div class="tabela-questoes">
        <div class="grafico-cabecalho">
          <h3>Detalhamento por questão</h3>
          <InfoIcon tooltip="Mostra a presença de imagem e o percentual de acertos de cada questão. A tabela pode ser filtrada e ordenada pelo mesmo padrão dos demais gráficos." />
          <div class="filter-wrapper">
            <button type="button" class="filter-btn" @click="alternarFiltroTabela">
              <FilterIcon />
              Filtro
            </button>
            <div v-if="mostrarFiltroTabela" class="filter-menu">
              <div v-if="temAcertos" class="filter-secao">
                <p class="filter-titulo">MÉTRICA DE ACERTOS</p>
                <div class="filter-option" v-for="opcao in opcoesMetricaAcertos" :key="`tabela-metrica-${opcao.valor}`">
                  <input
                    type="radio"
                    name="filtro-metrica-imagens-tabela"
                    :id="`tabela-metrica-imagens-${opcao.valor}`"
                    :checked="rascunhoMetricaTabela === opcao.valor"
                    @change="rascunhoMetricaTabela = opcao.valor"
                  />
                  <label :for="`tabela-metrica-imagens-${opcao.valor}`">{{ opcao.rotulo }}</label>
                  <InfoIcon v-if="opcao.dica" warning :tooltip="opcao.dica" />
                </div>
              </div>
              <div v-if="temDificuldade" class="filter-secao">
                <p class="filter-titulo">DIFICULDADE</p>
                <div class="filter-option" v-for="opcao in opcoesDificuldade" :key="`tabela-dificuldade-${opcao.valor}`">
                  <input
                    type="radio"
                    name="filtro-dificuldade-imagens-tabela"
                    :id="`tabela-dificuldade-imagens-${opcao.valor}`"
                    :checked="rascunhoDificuldadeTabela === opcao.valor"
                    @change="rascunhoDificuldadeTabela = opcao.valor"
                  />
                  <label :for="`tabela-dificuldade-imagens-${opcao.valor}`">{{ opcao.rotulo }}</label>
                </div>
              </div>
              <div class="filter-secao">
                <p class="filter-titulo">PRESENÇA DE IMAGEM</p>
                <div class="filter-option" v-for="opcao in opcoesImagem" :key="`tabela-imagem-${opcao.valor}`">
                  <input
                    type="radio"
                    name="filtro-presenca-imagem-tabela"
                    :id="`tabela-presenca-imagem-${opcao.valor}`"
                    :checked="rascunhoImagemTabela === opcao.valor"
                    @change="rascunhoImagemTabela = opcao.valor"
                  />
                  <label :for="`tabela-presenca-imagem-${opcao.valor}`">{{ opcao.rotulo }}</label>
                </div>
              </div>
              <div class="filter-rodape">
                <button type="button" class="filter-aplicar" @click="aplicarFiltroTabela">Aplicar</button>
              </div>
            </div>
          </div>
        </div>
        <p class="grafico-subtitulo">{{ questoesTabelaFiltradas.length }} de {{ questoesTabela.length }} questões exibidas.</p>
        <div v-if="questoesTabelaFiltradas.length" class="tabela-rolagem">
          <table class="questoes-tabela">
            <thead>
              <tr>
                <th scope="col">Questão</th>
                <th v-if="temDificuldade" scope="col">Dificuldade</th>
                <th scope="col">Imagem</th>
                <th scope="col">Acertos</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="questao in questoesTabelaFiltradas" :key="questao.id">
                <th scope="row">{{ questao.rotulo }}</th>
                <td v-if="temDificuldade">{{ questao.rotuloDificuldade }}</td>
                <td>
                  <span class="tabela-selo" :class="questao.temImagem ? 'selo-com-imagem' : 'selo-sem-imagem'">
                    {{ questao.temImagem ? 'Com imagem' : 'Sem imagem' }}
                  </span>
                </td>
                <td>{{ questao.acerto === null ? 'Não informado' : `${formatarPercentual(questao.acerto)}%` }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="tabela-sem-resultado">
          <p>Nenhuma questão corresponde aos filtros escolhidos.</p>
          <button type="button" class="sem-resultado-limpar" @click="limparFiltrosTabela">Limpar filtros</button>
        </div>
      </div>
    </div>
  </div>
  <!--Fim das imagens-->
</template>

<script setup>
import { computed, ref } from 'vue'
import FilterIcon from '@/components/icons/FilterIcon.vue'
import InfoIcon from '@/components/icons/InfoIcon.vue'
import { formatarPercentual } from '@/constants/analysisConfig'
import { aplicarMetrica } from '@/services/filtrosAnalise.js'

const props = defineProps({
  titulo: { type: String, required: true },
  questoes: { type: Array, required: true }
})

const taxaDeAcerto = (questao) => {
  const taxa = questao.taxa_acerto_percentual
  if (taxa !== null && taxa !== undefined && taxa !== '' && Number.isFinite(Number(taxa))) return Number(taxa)
  const acertos = Number(questao.acertos)
  const totalEstudantes = Number(questao.total_estudantes)
  return Number.isFinite(acertos) && totalEstudantes > 0 ? (acertos / totalEstudantes) * 100 : null
}
const temAcertos = computed(() => props.questoes.some((questao) => taxaDeAcerto(questao) !== null))
const temDificuldade = computed(() => props.questoes.some((questao) => difficultyLevels.some((nivel) => nivel.key === questao.dificuldade)))
const temQuestoesSemDificuldade = computed(() => props.questoes.some((questao) => questao.dificuldade == null))
const filtroDificuldadePizza = ref('todas')
const rascunhoDificuldadePizza = ref('todas')
const mostrarFiltroPizza = ref(false)
const mostrarComImagem = computed(() => filtroImagem.value !== 'sem')
const mostrarSemImagem = computed(() => filtroImagem.value !== 'com')
const filtroDificuldade = ref('todas')
const filtroImagem = ref('ambas')
const rascunhoDificuldade = ref('todas')
const rascunhoImagem = ref('ambas')
const mostrarFiltro = ref(false)
const filtroMetricaTabela = ref('padrao')
const filtroDificuldadeTabela = ref('todas')
const filtroImagemTabela = ref('ambas')
const rascunhoMetricaTabela = ref('padrao')
const rascunhoDificuldadeTabela = ref('todas')
const rascunhoImagemTabela = ref('ambas')
const mostrarFiltroTabela = ref(false)

const opcoesDificuldade = computed(() => [
  { valor: 'todas', rotulo: 'Todas' },
  ...difficultyLevels.filter((nivel) => props.questoes.some((questao) => questao.dificuldade === nivel.key))
    .map((nivel) => ({ valor: nivel.key, rotulo: nivel.label })),
  ...(temQuestoesSemDificuldade.value ? [{ valor: 'sem_dificuldade', rotulo: 'Sem nível' }] : [])
])
const opcoesImagem = [
  { valor: 'ambas', rotulo: 'Com e sem imagem' },
  { valor: 'com', rotulo: 'Somente com imagem' },
  { valor: 'sem', rotulo: 'Somente sem imagem' }
]
const opcoesMetricaAcertos = [
  { valor: 'padrao', rotulo: 'Ordem da prova' },
  { valor: 'menor', rotulo: 'Menor percentual' },
  { valor: 'maior', rotulo: 'Maior percentual' },
  { valor: 'media', rotulo: 'Acima da média' },
  { valor: 'abaixo', rotulo: 'Abaixo da média' },
  {
    valor: 'outlier',
    rotulo: 'Outliers',
    dica: 'Considera outliers os percentuais abaixo de (1º quartil − 1,5 × intervalo interquartil) ou acima de (3º quartil + 1,5 × intervalo interquartil). O intervalo interquartil é a diferença entre o 3º e o 1º quartil.'
  },
  {
    valor: 'desvio',
    rotulo: 'Fora do desvio padrão',
    dica: 'Mostra questões cujo percentual de acertos está mais de um desvio padrão acima ou abaixo da média.'
  }
]

const alternarMenuFiltro = () => {
  if (!mostrarFiltro.value) {
    rascunhoDificuldade.value = filtroDificuldade.value
    rascunhoImagem.value = filtroImagem.value
  }
  mostrarFiltro.value = !mostrarFiltro.value
}

const aplicarFiltro = () => {
  filtroDificuldade.value = rascunhoDificuldade.value
  filtroImagem.value = rascunhoImagem.value
  mostrarFiltro.value = false
}

const alternarFiltroPizza = () => {
  if (!mostrarFiltroPizza.value) rascunhoDificuldadePizza.value = filtroDificuldadePizza.value
  mostrarFiltroPizza.value = !mostrarFiltroPizza.value
}

const aplicarFiltroPizza = () => {
  filtroDificuldadePizza.value = rascunhoDificuldadePizza.value
  mostrarFiltroPizza.value = false
}

const alternarFiltroTabela = () => {
  if (!mostrarFiltroTabela.value) {
    rascunhoMetricaTabela.value = filtroMetricaTabela.value
    rascunhoDificuldadeTabela.value = filtroDificuldadeTabela.value
    rascunhoImagemTabela.value = filtroImagemTabela.value
  }
  mostrarFiltroTabela.value = !mostrarFiltroTabela.value
}

const aplicarFiltroTabela = () => {
  filtroMetricaTabela.value = rascunhoMetricaTabela.value
  filtroDificuldadeTabela.value = rascunhoDificuldadeTabela.value
  filtroImagemTabela.value = rascunhoImagemTabela.value
  mostrarFiltroTabela.value = false
}

const limparFiltrosTabela = () => {
  filtroMetricaTabela.value = 'padrao'
  filtroDificuldadeTabela.value = 'todas'
  filtroImagemTabela.value = 'ambas'
  rascunhoMetricaTabela.value = 'padrao'
  rascunhoDificuldadeTabela.value = 'todas'
  rascunhoImagemTabela.value = 'ambas'
}

const questoesFiltradasPizza = computed(() => props.questoes.filter((questao) => {
  if (filtroDificuldadePizza.value === 'todas') return true
  if (filtroDificuldadePizza.value === 'sem_dificuldade') return !difficultyLevels.some((nivel) => nivel.key === questao.dificuldade)
  return questao.dificuldade === filtroDificuldadePizza.value
}))
const questoesComImagemPizza = computed(() => questoesFiltradasPizza.value.filter((questao) => questao.tem_imagem))
const questoesSemImagemPizza = computed(() => questoesFiltradasPizza.value.length - questoesComImagemPizza.value.length)
const percentualComImagemPizza = computed(() => questoesFiltradasPizza.value.length
  ? questoesComImagemPizza.value.length / questoesFiltradasPizza.value.length * 100
  : 0)

const difficultyLevels = [
  { key: 'facil', label: 'Fácil' },
  { key: 'medio', label: 'Médio' },
  { key: 'dificil', label: 'Difícil' }
]
const questoesValidasAcerto = computed(() => props.questoes
  .map((questao) => ({ ...questao, taxa_acerto_percentual: taxaDeAcerto(questao) }))
  .filter((questao) => questao.taxa_acerto_percentual !== null))
const questoesTabela = computed(() => props.questoes.map((questao, indice) => {
  const dificuldade = difficultyLevels.find((nivel) => nivel.key === questao.dificuldade)
  return {
    ...questao,
    id: questao.questao ?? indice + 1,
    rotulo: `Q${questao.questao ?? indice + 1}`,
    temImagem: Boolean(questao.tem_imagem),
    dificuldade: dificuldade?.key ?? 'sem_dificuldade',
    rotuloDificuldade: dificuldade?.label ?? 'Sem nível',
    acerto: taxaDeAcerto(questao)
  }
}))
const questoesTabelaFiltradas = computed(() => {
  let filtradas = questoesTabela.value
  if (temDificuldade.value && filtroDificuldadeTabela.value !== 'todas') {
    filtradas = filtradas.filter((questao) => questao.dificuldade === filtroDificuldadeTabela.value)
  }
  if (filtroImagemTabela.value === 'com') filtradas = filtradas.filter((questao) => questao.temImagem)
  if (filtroImagemTabela.value === 'sem') filtradas = filtradas.filter((questao) => !questao.temImagem)
  if (filtroMetricaTabela.value !== 'padrao') {
    const comAcerto = filtradas.filter((questao) => questao.acerto !== null)
    filtradas = aplicarMetrica(comAcerto, filtroMetricaTabela.value, (questao) => questao.acerto)
  }
  return filtradas
})
const gruposBase = computed(() => {
  if (!temDificuldade.value) return [{ key: 'prova', label: 'Prova toda' }]
  const niveis = difficultyLevels
    .filter((nivel) => props.questoes.some((questao) => questao.dificuldade === nivel.key))
    .map((nivel) => ({ key: nivel.key, label: nivel.label }))
  if (temQuestoesSemDificuldade.value) niveis.push({ key: 'sem_dificuldade', label: 'Sem nível' })
  return niveis
})
const gruposFiltrados = computed(() => gruposBase.value.filter((grupo) =>
  filtroDificuldade.value === 'todas' || grupo.key === filtroDificuldade.value
))
const gruposGrafico = computed(() => {
  const larguraPlot = larguraGrafico.value - 64
  const espacamento = larguraPlot / gruposFiltrados.value.length
  return gruposFiltrados.value.map((grupo, indice) => ({
    ...grupo,
    centro: 52 + espacamento * (indice + 0.5),
    x: 52 + espacamento * (indice + 0.5)
  }))
})
const larguraGrafico = computed(() => Math.max(460, gruposFiltrados.value.length * 180 + 64))
const barrasAcertos = computed(() => {
  const barras = []
  const escalaY = (valor) => 250 - (valor / 100) * 210
  gruposGrafico.value.forEach((grupo) => {
    const itensGrupo = questoesValidasAcerto.value.filter((questao) => {
      if (grupo.key === 'prova') return true
      if (grupo.key === 'sem_dificuldade') return !difficultyLevels.some((nivel) => nivel.key === questao.dificuldade)
      return questao.dificuldade === grupo.key
    })
    const series = [
      { key: 'com', rotulo: 'Com imagem', cor: '#0070C0', imagem: true },
      { key: 'sem', rotulo: 'Sem imagem', cor: '#10B981', imagem: false }
    ].filter((item) => item.imagem ? mostrarComImagem.value : mostrarSemImagem.value)
    const larguraBarra = series.length === 1 ? 48 : 40
    const gap = 8
    const inicioX = grupo.centro - (series.length * larguraBarra + (series.length - 1) * gap) / 2
    series.forEach((item, indice) => {
      const questoesSerie = itensGrupo.filter((questao) => Boolean(questao.tem_imagem) === item.imagem)
      if (!questoesSerie.length) return
      const media = questoesSerie.reduce((soma, questao) => soma + Number(questao.taxa_acerto_percentual), 0) / questoesSerie.length
      const valor = Math.max(0, Math.min(100, media))
      const y = escalaY(valor)
      barras.push({
        id: `${grupo.key}-${item.key}`,
        x: inicioX + indice * (larguraBarra + gap),
        y,
        largura: larguraBarra,
        altura: 250 - y,
        valor,
        cor: item.cor,
        titulo: `${grupo.label} · ${item.rotulo}: ${formatarPercentual(valor)}% (${questoesSerie.length} questões)`
      })
    })
  })
  return barras
})
const marcasEixo = [0, 25, 50, 75, 100].map((valor) => ({ valor, y: 250 - (valor / 100) * 210 }))
const descricaoGrafico = computed(() => `Percentual médio de acertos das questões, separado por dificuldade e presença de imagem${temDificuldade.value ? '' : ', para toda a prova'}`)

// Converte um intervalo de graus em um caminho SVG de setor de círculo
function caminhoSetor(inicioGraus, fimGraus) {
  const cx = 100
  const cy = 100
  const raio = 90

  if (fimGraus - inicioGraus <= 0) return ''
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

const fatiasImagem = computed(() => {
  const itens = [
    { chave: 'com', rotulo: 'Com imagem', valor: questoesComImagemPizza.value.length, cor: '#0070C0' },
    { chave: 'sem', rotulo: 'Sem imagem', valor: questoesSemImagemPizza.value, cor: '#CBD5E1' }
  ]
  let anguloAtual = 0
  return itens.map((item) => {
    const fracao = questoesFiltradasPizza.value.length ? item.valor / questoesFiltradasPizza.value.length : 0
    const inicio = anguloAtual
    anguloAtual += fracao * 360
    return { ...item, percentual: fracao * 100, caminho: caminhoSetor(inicio, anguloAtual) }
  })
})
</script>

<style scoped>
.titulo-analise { margin: 0 0 1rem; color: #263238; font-size: 1.25rem; }
.tempo-bloco { padding: 1.5rem; background: white; border-radius: 8px; margin: 1.5rem 0 0; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08); }
.tempo-cabecalho { display: flex; align-items: center; gap: .5rem; margin-bottom: .25rem; }
.tempo-cabecalho h2 { margin: 0; color: #263238; font-size: 1.25rem; }
.tempo-subtitulo { margin: 0 0 1rem; color: #666; font-size: .9rem; }
.tempo-conteudo { display: flex; align-items: center; justify-content: center; gap: 2rem; flex-wrap: wrap; }
.pizza { width: 200px; height: 200px; }
.legenda { list-style: none; margin: 0; padding: 0; font-size: .85rem; }
.legenda li { display: flex; align-items: center; gap: .5rem; margin-bottom: .5rem; }
.legenda-cor { width: 12px; height: 12px; border-radius: 2px; flex-shrink: 0; }
.legenda-rotulo { color: #333; }
.legenda-valor { color: #666; margin-left: .5rem; }
.grafico-acertos { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e0e0e0; }
.grafico-cabecalho { display: flex; align-items: center; gap: .5rem; }
.grafico-cabecalho h3 { margin: 0; color: #263238; font-size: 1.25rem; }
.grafico-subtitulo { margin: .5rem 0 1rem; color: #666; font-size: .9rem; }
.grafico-aviso { background: #fff3cd; border: 1px solid #ffeaa7; border-left: 4px solid #ffc107; padding: .75rem 1rem; border-radius: 6px; color: #856404; font-size: .9rem; line-height: 1.4; margin: .75rem 0 0; }
.grafico-barras-conteudo { overflow-x: auto; }
.grafico-barras { display: block; width: auto; height: 320px; max-width: none; margin: 0 auto; }
.linha-grade { stroke: #e4e7ec; stroke-width: 1; }
.texto-eixo { fill: #667085; font-size: 11px; }
.texto-valor { fill: #344054; font-size: 10px; font-weight: 600; }
.texto-categoria { fill: #344054; font-size: 12px; }
.legenda-barras { display: flex; justify-content: center; gap: 1.25rem; flex-wrap: wrap; color: #475467; font-size: .85rem; }
.legenda-barras span { display: inline-flex; align-items: center; gap: .4rem; }
.legenda-barras i { width: 12px; height: 12px; border-radius: 2px; }
.cor-com-imagem { background: #0070C0; }
.cor-sem-imagem { background: #10B981; }
.tabela-questoes { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e0e0e0; }
.tabela-questoes .grafico-cabecalho { margin-bottom: .5rem; }
.tabela-rolagem { max-height: 520px; overflow: auto; border: 1px solid #e0e0e0; border-radius: 8px; }
.questoes-tabela { width: 100%; border-collapse: collapse; text-align: left; font-size: .9rem; }
.questoes-tabela th, .questoes-tabela td { padding: .7rem .85rem; border-bottom: 1px solid #eaecf0; }
.questoes-tabela thead th { position: sticky; top: 0; z-index: 1; background: #f8fafc; color: #475467; font-size: .8rem; font-weight: 700; }
.questoes-tabela tbody th { color: #263238; font-weight: 600; }
.questoes-tabela tbody tr:hover { background: #f8fafc; }
.tabela-selo { display: inline-flex; padding: .25rem .55rem; border-radius: 999px; font-size: .8rem; font-weight: 600; white-space: nowrap; }
.selo-com-imagem { background: #e6f0fa; color: #0065a8; }
.selo-sem-imagem { background: #ecfdf3; color: #027a48; }
.tabela-sem-resultado { padding: 1.5rem; border: 1px dashed #cbd5e1; border-radius: 8px; background: #f8fafc; text-align: center; }
.tabela-sem-resultado p { margin: 0; color: #475467; }
.sem-resultado-limpar { margin-top: .75rem; padding: .4rem 1rem; border: 2px solid #0070C0; border-radius: 6px; background: white; color: #0070C0; cursor: pointer; font-weight: 600; }
.filter-wrapper { position: relative; display: inline-block; margin-left: auto; }
.filter-btn { display: flex; align-items: center; gap: .5rem; padding: .45rem .8rem; border: 2px solid #0070C0; border-radius: 6px; background: white; color: #0070C0; cursor: pointer; font-weight: 600; white-space: nowrap; }
.filter-menu { position: absolute; top: calc(100% + .5rem); right: 0; z-index: 10; min-width: 230px; padding: .75rem; border: 1px solid #e0e0e0; border-radius: 8px; background: white; box-shadow: 0 10px 30px rgba(0, 0, 0, .15); }
.filter-secao + .filter-secao { margin-top: .75rem; padding-top: .75rem; border-top: 1px solid #e0e0e0; }
.filter-titulo { margin: .25rem .5rem; color: #667085; font-size: .75rem; font-weight: 700; }
.filter-option { display: flex; align-items: center; padding: .55rem .5rem; border-radius: 4px; }
.filter-option:hover { background: #f5f5f5; }
.filter-option input { margin: 0 .6rem 0 0; accent-color: #0070C0; }
.filter-option label { flex: 1; color: #333; font-size: .9rem; cursor: pointer; }
.filter-rodape { display: flex; justify-content: flex-end; margin-top: .5rem; padding-top: .75rem; border-top: 1px solid #e0e0e0; }
.filter-aplicar { padding: .5rem 1rem; border: none; border-radius: 6px; background: #0070C0; color: white; cursor: pointer; font-weight: 600; }
@media (max-width: 600px) {
  .tempo-bloco { padding: 1rem; }
  .grafico-cabecalho { align-items: flex-start; flex-wrap: wrap; }
  .filter-wrapper { margin-left: auto; }
  .questoes-tabela { min-width: 500px; }
}
</style>
