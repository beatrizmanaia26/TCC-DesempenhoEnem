<template>
  <div class="posicao-enem">
    <p v-if="carregando" class="posicao-status">Carregando análise de posição do ENEM {{ ano }}...</p>
    <p v-else-if="erro" class="posicao-status posicao-erro">{{ erro }}</p>
    <template v-else>
      <section v-if="tipoMapa" class="posicao-bloco">
        <div class="posicao-cabecalho">
          <h3>{{ configuracaoMapa.titulo }}</h3>
          <InfoIcon :largura="440" :tooltip="configuracaoMapa.tooltip" />
        </div>
        <p class="posicao-subtitulo">{{ configuracaoMapa.subtitulo }}</p>
        <p class="posicao-mini-legenda"><strong>Legenda:</strong> azul = associação negativa · branco = próxima de zero · verde = positiva · círculo escuro com ★ = p (Holm) &lt; 0,05.</p>
        <div class="posicao-mapa-scroll">
          <svg :viewBox="`0 0 ${mapa.largura} ${mapa.altura}`" class="posicao-mapa" role="img" :aria-label="mapa.ariaLabel">
            <text v-for="(area, indice) in areas" :key="`posicao-coluna-${area.valor}`" :x="MARGEM_ESQ + indice * TAM + (TAM - GAP) / 2" :y="MARGEM_TOPO - 12" text-anchor="middle" class="posicao-eixo">{{ area.rotulo }}</text>
            <template v-if="tipoMapa === 'dificuldade'">
              <text v-for="(dificuldade, indice) in dificuldades" :key="`posicao-dificuldade-${dificuldade.valor}`" :x="MARGEM_ESQ - 12" :y="MARGEM_TOPO + indice * TAM + (TAM - GAP) / 2" text-anchor="end" dominant-baseline="middle" class="posicao-eixo">{{ dificuldade.rotulo }}</text>
            </template>
            <g v-for="celula in mapa.celulas" :key="celula.chave">
              <rect :x="celula.x" :y="celula.y" :width="TAM - GAP" :height="TAM - GAP" :fill="celula.cor" :stroke="celula.significativa ? '#263238' : '#ffffff'" :stroke-width="celula.significativa ? 3 : 1" class="posicao-celula">
                <title>{{ celula.rotulo }} · {{ celula.vazia ? 'sem dados suficientes' : `rho = ${formatarCorrelacao(celula.rho)}; p bruto = ${formatarP(celula.p)}; p (Holm) = ${formatarP(celula.pHolm)}` }}</title>
              </rect>
              <g v-if="celula.significativa" class="posicao-significancia" aria-label="Resultado significativo após ajuste de Holm">
                <circle :cx="celula.x + TAM - GAP - 17" :cy="celula.y + 17" r="12" />
                <text :x="celula.x + TAM - GAP - 17" :y="celula.y + 17" text-anchor="middle" dominant-baseline="middle">★</text>
                <title>p (Holm) abaixo de 0,05</title>
              </g>
              <template v-if="!celula.vazia">
                <text :x="celula.x + (TAM - GAP) / 2" :y="celula.y + (TAM - GAP) / 2 - 8" text-anchor="middle" dominant-baseline="middle" :fill="celula.corTexto" class="posicao-valor">{{ formatarCorrelacao(celula.rho) }}</text>
                <text :x="celula.x + (TAM - GAP) / 2" :y="celula.y + (TAM - GAP) / 2 + 14" text-anchor="middle" dominant-baseline="middle" :fill="celula.corTexto" class="posicao-p">p bruto = {{ formatarP(celula.p) }}</text>
                <text :x="celula.x + (TAM - GAP) / 2" :y="celula.y + (TAM - GAP) / 2 + 32" text-anchor="middle" dominant-baseline="middle" :fill="celula.corTexto" class="posicao-p">p (Holm) = {{ formatarP(celula.pHolm) }}</text>
              </template>
              <text v-else :x="celula.x + (TAM - GAP) / 2" :y="celula.y + (TAM - GAP) / 2" text-anchor="middle" dominant-baseline="middle" class="posicao-valor posicao-sem-dados">—</text>
            </g>
            <defs>
              <linearGradient :id="`posicao-gradiente-${tipoMapa}`" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stop-color="#0070C0" />
                <stop offset="50%" stop-color="#FFFFFF" />
                <stop offset="100%" stop-color="#10B981" />
              </linearGradient>
            </defs>
            <rect :x="mapa.barraX" :y="MARGEM_TOPO" width="22" :height="mapa.alturaGrade" :fill="`url(#posicao-gradiente-${tipoMapa})`" />
            <text v-for="marca in MARCAS" :key="`posicao-marca-${marca.valor}`" :x="mapa.barraX + 30" :y="MARGEM_TOPO + ((1 - marca.valor) / 2) * mapa.alturaGrade" class="posicao-barra" dominant-baseline="middle">{{ marca.rotulo }}</text>
            <text :x="mapa.barraX + 70" :y="MARGEM_TOPO + mapa.alturaGrade / 2" text-anchor="middle" dominant-baseline="middle" class="posicao-barra" :transform="`rotate(90 ${mapa.barraX + 70} ${MARGEM_TOPO + mapa.alturaGrade / 2})`">Correlação de Spearman (ρ)</text>
          </svg>
        </div>
        <p v-if="mapa.quantidadeValidas" class="posicao-leitura"><strong>Resultado:</strong> {{ mapa.quantidadeSignificativas }} de {{ mapa.quantidadeValidas }} combinações válidas têm p (Holm) abaixo de 0,05. {{ mapa.quantidadeSignificativas ? 'Isso indica uma associação estatística no recorte, mas não demonstra que a posição causou a diferença.' : 'Não encontramos evidência estatística clara de associação após o ajuste; isso não prova que não exista uma relação.' }}</p>
        <p v-else class="posicao-leitura"><strong>Resultado:</strong> Não há combinações com dados suficientes para calcular as correlações neste ENEM.</p>
        <button type="button" class="filter-btn posicao-mais-info" @click="mostrarMais = !mostrarMais">{{ mostrarMais ? 'Ocultar informações sobre este gráfico' : 'Mais informações sobre este gráfico' }}</button>
        <div v-if="mostrarMais" class="posicao-notas">
          <p><strong>Como ler a correlação:</strong> o coeficiente de Spearman (ρ) varia de −1 a +1 e indica se a relação é crescente ou decrescente. {{ configuracaoMapa.interpretacao }} Valores próximos de zero indicam pouca relação monotônica; quanto mais distante de zero, mais forte é a associação observada.</p>
          <p><strong>p bruto e p (Holm):</strong> o p bruto testa uma combinação de área e, quando aplicável, dificuldade. O p (Holm) ajusta os testes mostrados neste mapa para reduzir a chance de destacar uma associação por acaso. Consideramos evidência estatística quando p (Holm) &lt; 0,05.</p>
          <p>A análise usa os itens dos quatro cadernos. Em Linguagens e Códigos, as versões em Inglês e Espanhol das questões 1 a 5 são consideradas itens distintos, conforme a base de desempenho.</p>
          <p><strong>Limite da análise:</strong> uma correlação descreve associação, não causa. O conteúdo, a dificuldade e outras características dos itens também podem estar relacionados ao percentual de acertos.</p>
        </div>
      </section>

      <section v-else-if="secao === 'dispersao'" class="posicao-bloco">
        <div class="posicao-cabecalho">
          <h3>Posição e percentual de acertos</h3>
          <InfoIcon :largura="420" tooltip="Cada ponto representa uma questão em uma das quatro cores de caderno. A posição é mostrada dentro da área selecionada. A linha liga o percentual médio de acertos observado em cada posição, somando os cadernos." />
        </div>
        <p class="posicao-subtitulo">ENEM {{ ano }} · Acompanhe como os percentuais de acerto se distribuem ao longo da posição das questões.</p>
        <label class="posicao-seletor-area">Área
          <select v-model="areaSelecionada">
            <option v-for="area in areas" :key="area.valor" :value="area.valor">{{ area.rotulo }}</option>
          </select>
        </label>
        <p class="posicao-mini-legenda">Cada ponto representa um item; a linha mostra a média por posição.</p>
        <div class="posicao-legenda-cadernos">
          <span v-for="caderno in cadernos" :key="caderno"><i :style="{ background: corCaderno(caderno) }"></i>Caderno {{ caderno }}</span>
          <span><i class="posicao-legenda-media"></i>Média por posição</span>
        </div>
        <div v-if="pontosDispersao.length" class="posicao-grafico-scroll">
          <svg viewBox="0 0 900 440" class="posicao-dispersao" role="img" :aria-label="`Dispersão do percentual de acertos por posição em ${rotuloArea(areaSelecionada)}, ENEM ${ano}`">
            <text x="20" y="195" text-anchor="middle" class="posicao-eixo" transform="rotate(-90 20 195)">Percentual de acertos</text>
            <g v-for="marca in marcasPercentual" :key="`dispersao-y-${marca}`">
              <line x1="82" :y1="escalaY(marca)" x2="850" :y2="escalaY(marca)" class="posicao-grade" />
              <text x="70" :y="escalaY(marca) + 4" text-anchor="end" class="posicao-tick">{{ marca }}%</text>
            </g>
            <g v-for="marca in marcasPosicao" :key="`dispersao-x-${marca}`">
              <line :x1="escalaX(marca)" y1="40" :x2="escalaX(marca)" y2="350" class="posicao-grade-vertical" />
              <text :x="escalaX(marca)" y="370" text-anchor="middle" class="posicao-tick">{{ marca }}</text>
            </g>
            <text x="466" y="410" text-anchor="middle" class="posicao-eixo">Posição dentro da área</text>
            <path v-if="linhaMediasDispersao" :d="linhaMediasDispersao" class="posicao-linha-media" />
            <circle v-for="ponto in pontosDispersao" :key="ponto.chave" :cx="ponto.x" :cy="ponto.y" r="3.4" :fill="corCaderno(ponto.caderno)" fill-opacity=".62" :stroke="corCaderno(ponto.caderno)" stroke-width=".5">
              <title>{{ ponto.caderno }} · questão {{ ponto.posicao }} · posição {{ ponto.posicaoNaArea }} · {{ formatarPercentual(ponto.percentualAcertos) }}% de acertos</title>
            </circle>
          </svg>
        </div>
        <p v-else class="posicao-vazio">Não há itens com percentual de acertos para esta área.</p>
        <button type="button" class="filter-btn posicao-mais-info" @click="mostrarMais = !mostrarMais">{{ mostrarMais ? 'Ocultar informações sobre este gráfico' : 'Mais informações sobre este gráfico' }}</button>
        <div v-if="mostrarMais" class="posicao-notas">
          <p>Os pontos incluem as quatro cores de caderno, em que as mesmas questões podem aparecer em posições diferentes. Em Linguagens e Códigos, as versões em Inglês e Espanhol das questões 1 a 5 são itens distintos na base. A linha é a média dos percentuais dos itens que ocupam cada posição nos cadernos. Ela resume o padrão observado e não isola o efeito da posição: as questões em cada posição têm conteúdos e dificuldades diferentes.</p>
        </div>
      </section>

      <section v-else-if="secao === 'variacao'" class="posicao-bloco">
        <div class="posicao-cabecalho">
          <h3>Variação do percentual de acertos entre cadernos</h3>
          <InfoIcon :largura="420" tooltip="Para cada item presente nas quatro cores de caderno, calculamos a diferença entre o maior e o menor percentual de acertos. Cada ponto representa um item; o losango indica a média da área." />
        </div>
        <p class="posicao-subtitulo">ENEM {{ ano }} · Cada ponto representa a amplitude observada para um mesmo item entre os cadernos.</p>
        <p class="posicao-mini-legenda"><strong>Legenda:</strong> ponto = variação de um item · losango = média dos itens da área.</p>
        <div v-if="variacoes.length" class="posicao-grafico-scroll">
          <svg viewBox="0 0 1000 470" class="posicao-variacao" role="img" :aria-label="`Variação do percentual de acertos entre cadernos no ENEM ${ano}, por área`">
            <text x="500" y="20" text-anchor="middle" class="posicao-eixo">Variação entre o maior e o menor percentual de acertos (pontos percentuais)</text>
            <g v-for="marca in marcasVariacao" :key="`variacao-y-${marca}`">
              <line x1="100" :y1="escalaYVariacao(marca)" x2="950" :y2="escalaYVariacao(marca)" class="posicao-grade" />
              <text x="88" :y="escalaYVariacao(marca) + 4" text-anchor="end" class="posicao-tick">{{ formatarPercentual(marca) }}</text>
            </g>
            <g v-for="(resumo, indice) in resumosVariacao" :key="`variacao-${resumo.area}`">
              <circle v-for="ponto in resumo.pontos" :key="ponto.chave" :cx="centroArea(indice) + ponto.deslocamento" :cy="escalaYVariacao(ponto.variacao)" r="3.2" fill="#0070C0" fill-opacity=".45">
                <title>Item {{ ponto.coItem }} · variação de {{ formatarPercentual(ponto.variacao) }} pontos percentuais</title>
              </circle>
              <path :d="losangoMedia(indice, resumo.media)" fill="#C4458A" stroke="#7A164C" stroke-width="1.5">
                <title>Média em {{ rotuloArea(resumo.area) }}: {{ formatarPercentual(resumo.media) }} pontos percentuais em {{ resumo.n }} itens</title>
              </path>
              <text :x="centroArea(indice)" y="390" text-anchor="middle" class="posicao-eixo">{{ rotuloArea(resumo.area) }}</text>
              <text :x="centroArea(indice)" y="412" text-anchor="middle" class="posicao-tick">média: {{ formatarPercentual(resumo.media) }} p.p.</text>
            </g>
            <text x="525" y="450" text-anchor="middle" class="posicao-eixo">Área</text>
          </svg>
        </div>
        <p v-else class="posicao-vazio">Não há itens correspondentes nas quatro cores de caderno para calcular a variação.</p>
        <button type="button" class="filter-btn posicao-mais-info" @click="mostrarMais = !mostrarMais">{{ mostrarMais ? 'Ocultar informações sobre este gráfico' : 'Mais informações sobre este gráfico' }}</button>
        <div v-if="mostrarMais" class="posicao-notas">
          <p>Para cada item, calculamos o maior percentual de acertos menos o menor entre as quatro cores de caderno. O ponto mostra essa amplitude; o losango mostra a média das amplitudes dos itens da área. Entram somente itens identificados nos quatro cadernos. Essa comparação é descritiva e, sozinha, não prova que a mudança de posição tenha causado a variação.</p>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import http from '@/services/http.js'
import { ajustarHolm } from '@/services/spearmanProva.js'
import InfoIcon from '@/components/icons/InfoIcon.vue'

const props = defineProps({
  ano: { type: Number, required: true },
  secao: { type: String, required: true }
})

const areas = [
  { valor: 'LC', rotulo: 'Linguagens e Códigos' },
  { valor: 'CH', rotulo: 'Ciências Humanas' },
  { valor: 'CN', rotulo: 'Ciências da Natureza' },
  { valor: 'MT', rotulo: 'Matemática' }
]
const dificuldades = [
  { valor: 'facil', rotulo: 'Fácil' },
  { valor: 'media', rotulo: 'Média' },
  { valor: 'dificil', rotulo: 'Difícil' }
]
const MARCAS = [
  { valor: 1, rotulo: '1' }, { valor: 0.5, rotulo: '0.5' }, { valor: 0, rotulo: '0' },
  { valor: -0.5, rotulo: '-0.5' }, { valor: -1, rotulo: '-1' }
]
const TAM = 175
const GAP = 4
const MARGEM_ESQ = 170
const MARGEM_TOPO = 65
const coresCadernoPorAno = {
  2020: ['Azul', 'Amarelo', 'Branco', 'Rosa'],
  2022: ['Azul', 'Amarelo', 'Branco', 'Rosa'],
  2023: ['Azul', 'Amarelo', 'Branco', 'Rosa'],
  2024: ['Azul', 'Amarelo', 'Branco', 'Verde'],
  2025: ['Azul', 'Amarelo', 'Branco', 'Verde']
}
const dados = ref({ questoes: [], variacoes: [], correlacoesAcertos: [], correlacoesParametroB: [], correlacoesDificuldade: [] })
const carregando = ref(false)
const erro = ref('')
const mostrarMais = ref(false)
const areaSelecionada = ref('LC')

const configuracoes = {
  acertos: {
    titulo: 'Relação entre posição e percentual de acertos',
    subtitulo: 'A correlação mostra se questões mais adiante tendem a ter percentuais de acerto maiores ou menores.',
    tooltip: 'Cada célula representa uma área do ano selecionado. A correlação de Spearman relaciona a posição da questão ao percentual de acertos. Valores positivos indicam percentuais maiores em posições posteriores; valores negativos indicam percentuais menores. O p bruto é ajustado por Holm entre as áreas deste ano.',
    interpretacao: 'Para este mapa, uma correlação positiva indica que questões mais adiante na área tendem a ter percentuais de acerto maiores; uma negativa indica percentuais menores.'
  },
  parametroB: {
    titulo: 'Relação entre posição e dificuldade da questão',
    subtitulo: 'O parâmetro b da TRI indica a dificuldade do item: valores maiores correspondem a questões mais difíceis.',
    tooltip: 'Cada célula representa uma área do ano selecionado. A correlação de Spearman relaciona a posição da questão ao parâmetro b da TRI. Valores positivos indicam que itens posteriores tendem a ser mais difíceis; valores negativos indicam que tendem a ser mais fáceis. O p bruto é ajustado por Holm entre as áreas deste ano.',
    interpretacao: 'O parâmetro b da TRI aumenta com a dificuldade: uma correlação positiva indica que questões mais adiante tendem a ser mais difíceis; uma negativa indica que tendem a ser mais fáceis.'
  },
  dificuldade: {
    titulo: 'Relação entre posição e acertos por dificuldade',
    subtitulo: 'A comparação é feita dentro de cada faixa de dificuldade, para observar se o padrão também aparece entre itens classificados de forma semelhante.',
    tooltip: 'Cada célula representa uma combinação de dificuldade e área do ENEM selecionado. A correlação de Spearman relaciona a posição da questão ao percentual de acertos dentro de cada faixa. O p bruto é ajustado por Holm entre as combinações válidas deste ano (até 12 testes).',
    interpretacao: 'A correlação é calculada somente entre questões da mesma faixa de dificuldade. Positiva indica percentuais de acerto maiores em posições posteriores; negativa indica percentuais menores.'
  }
}

const carregarDados = async (ano) => {
  carregando.value = true
  erro.value = ''
  try {
    const resposta = await http.get('/metricas/posicao-enem', { params: { ano } })
    dados.value = resposta.data
  } catch (error) {
    dados.value = { questoes: [], variacoes: [], correlacoesAcertos: [], correlacoesParametroB: [], correlacoesDificuldade: [] }
    erro.value = error.response?.data?.error || `Não foi possível carregar a análise de posição do ENEM ${ano}.`
  } finally {
    carregando.value = false
  }
}
watch(() => props.ano, carregarDados, { immediate: true })
watch(() => props.secao, () => { mostrarMais.value = false })

const tipoMapa = computed(() => ['acertos', 'parametroB', 'dificuldade'].includes(props.secao) ? props.secao : null)
const configuracaoMapa = computed(() => configuracoes[tipoMapa.value] ?? {})
const rotuloArea = (valor) => areas.find((area) => area.valor === valor)?.rotulo ?? valor
const formatarCorrelacao = (valor) => Number(valor).toFixed(2)
const formatarP = (valor) => valor === null || !Number.isFinite(Number(valor)) ? '—' : Number(valor) < 0.001 ? '< 0,001' : Number(valor).toFixed(3).replace('.', ',')
const formatarPercentual = (valor) => Number(valor).toFixed(1).replace('.', ',')
const registrosCorrelacao = computed(() => {
  if (tipoMapa.value === 'acertos') return dados.value.correlacoesAcertos ?? []
  if (tipoMapa.value === 'parametroB') return dados.value.correlacoesParametroB ?? []
  return dados.value.correlacoesDificuldade ?? []
})
const mapa = computed(() => {
  const linhas = tipoMapa.value === 'dificuldade' ? dificuldades : [{ valor: 'geral', rotulo: '' }]
  const alturaGrade = linhas.length * TAM - GAP
  const barraX = MARGEM_ESQ + areas.length * TAM + 30
  const registros = registrosCorrelacao.value
  const validos = registros.filter((registro) => registro.p !== null && registro.p !== undefined
    && registro.correlacao !== null && registro.correlacao !== undefined
    && Number.isFinite(Number(registro.p)) && Number.isFinite(Number(registro.correlacao)))
  const pAjustados = ajustarHolm(validos.map((registro) => Number(registro.p)))
  const chavesAjustadas = new Map(validos.map((registro, indice) => [
    `${tipoMapa.value === 'dificuldade' ? registro.dificuldade : 'geral'}-${registro.area}`,
    pAjustados[indice]
  ]))
  const celulas = linhas.flatMap((linha, indiceLinha) => areas.map((area, indiceArea) => {
    const registro = registros.find((item) => item.area === area.valor
      && (tipoMapa.value !== 'dificuldade' || item.dificuldade === linha.valor))
    const vazio = !registro || registro.correlacao === null || registro.correlacao === undefined
      || registro.p === null || registro.p === undefined
      || !Number.isFinite(Number(registro.correlacao)) || !Number.isFinite(Number(registro.p))
    const rho = vazio ? null : Number(registro.correlacao)
    const pHolm = vazio ? null : chavesAjustadas.get(`${linha.valor}-${area.valor}`) ?? null
    const rgb = vazio ? [243, 244, 246] : rgbPorRho(rho)
    return {
      chave: `${linha.valor}-${area.valor}`,
      rotulo: tipoMapa.value === 'dificuldade' ? `${linha.rotulo} · ${area.rotulo}` : area.rotulo,
      x: MARGEM_ESQ + indiceArea * TAM,
      y: MARGEM_TOPO + indiceLinha * TAM,
      vazia: vazio,
      rho,
      p: vazio ? null : Number(registro.p),
      pHolm,
      significativa: pHolm !== null && pHolm < 0.05,
      cor: `rgb(${rgb.join(', ')})`,
      corTexto: corTextoPara(rgb)
    }
  }))
  const quantidadeValidas = celulas.filter((celula) => !celula.vazia).length
  const quantidadeSignificativas = celulas.filter((celula) => celula.significativa).length
  return {
    celulas, alturaGrade, barraX, largura: barraX + 115, altura: MARGEM_TOPO + alturaGrade + 15,
    quantidadeValidas, quantidadeSignificativas,
    ariaLabel: `Mapa de calor da correlação de Spearman para ${configuracaoMapa.value.titulo}, ENEM ${props.ano}`
  }
})

function interpolarCor(inicio, fim, proporcao) {
  return inicio.map((valor, indice) => Math.round(valor + (fim[indice] - valor) * proporcao))
}
function rgbPorRho(valor) {
  const limitado = Math.max(-1, Math.min(1, Number(valor)))
  return limitado >= 0
    ? interpolarCor([255, 255, 255], [16, 185, 129], limitado)
    : interpolarCor([255, 255, 255], [0, 112, 192], -limitado)
}
function corTextoPara(rgb) {
  const canais = rgb.map((valor) => {
    const canal = valor / 255
    return canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4
  })
  const luminancia = 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2]
  return 1.05 / (luminancia + 0.05) > (luminancia + 0.05) / 0.05 ? '#FFFFFF' : '#000000'
}

const marcasPercentual = [0, 25, 50, 75, 100]
const marcasPosicao = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45]
const inicioArea = { LC: 1, CH: 46, CN: 91, MT: 136 }
const pontosDispersao = computed(() => (dados.value.questoes ?? [])
  .filter((questao) => questao.area === areaSelecionada.value && Number.isFinite(questao.percentualAcertos))
  .map((questao) => {
    const posicaoNaArea = questao.posicao - inicioArea[questao.area] + 1
    return {
      ...questao,
      chave: `${questao.area}-${questao.coItem}-${questao.coProva}`,
      posicaoNaArea,
      x: escalaX(posicaoNaArea),
      y: escalaY(questao.percentualAcertos)
    }
  }))
const mediasDispersao = computed(() => {
  const porPosicao = new Map()
  pontosDispersao.value.forEach((ponto) => {
    if (!porPosicao.has(ponto.posicaoNaArea)) porPosicao.set(ponto.posicaoNaArea, [])
    porPosicao.get(ponto.posicaoNaArea).push(ponto.percentualAcertos)
  })
  return [...porPosicao.entries()].map(([posicao, valores]) => ({
    posicao,
    media: valores.reduce((soma, valor) => soma + valor, 0) / valores.length
  })).sort((a, b) => a.posicao - b.posicao)
})
const linhaMediasDispersao = computed(() => mediasDispersao.value
  .map((ponto, indice) => `${indice ? 'L' : 'M'} ${escalaX(ponto.posicao)} ${escalaY(ponto.media)}`)
  .join(' '))
function escalaX(posicao) { return 92 + ((posicao - 1) / 44) * 750 }
function escalaY(percentual) { return 350 - (Number(percentual) / 100) * 300 }
const cadernos = computed(() => coresCadernoPorAno[props.ano] ?? [])
function corCaderno(caderno) {
  const cores = { Azul: '#0070C0', Amarelo: '#E0A800', Branco: '#667085', Rosa: '#C4458A', Verde: '#10B981' }
  return cores[caderno] ?? '#667085'
}

const variacoes = computed(() => dados.value.variacoes ?? [])
const maxVariacao = computed(() => Math.max(5, Math.ceil(Math.max(0, ...variacoes.value.map((item) => item.variacao)) / 5) * 5))
const marcasVariacao = computed(() => [0, 1, 2, 3, 4].map((indice) => maxVariacao.value * indice / 4))
const resumosVariacao = computed(() => areas.map((area) => {
  const itens = variacoes.value.filter((item) => item.area === area.valor)
  const media = itens.length ? itens.reduce((soma, item) => soma + item.variacao, 0) / itens.length : 0
  return {
    area: area.valor,
    n: itens.length,
    media,
    pontos: itens.map((item, indice) => ({
      ...item,
      chave: `${item.area}-${item.coItem}`,
      deslocamento: ((indice * 13) % 17 - 8) * 4.5
    }))
  }
}).filter((resumo) => resumo.n))
function centroArea(indice) { return 100 + (indice + 0.5) * (850 / 4) }
function escalaYVariacao(valor) { return 350 - (Number(valor) / maxVariacao.value) * 300 }
function losangoMedia(indice, media) {
  const x = centroArea(indice)
  const y = escalaYVariacao(media)
  return `M ${x} ${y - 8} L ${x + 8} ${y} L ${x} ${y + 8} L ${x - 8} ${y} Z`
}
</script>

<style scoped>
.posicao-enem { margin-top: 1.5rem; }
.posicao-bloco { padding: 1.5rem; background: white; border-radius: 8px; margin: 1.5rem 0; box-shadow: 0 1px 4px rgba(0, 0, 0, .08); }
.posicao-cabecalho { display: flex; align-items: center; gap: .5rem; }
.posicao-cabecalho h3 { margin: 0; color: #263238; font-size: 1.25rem; }
.posicao-subtitulo { margin: .5rem 0 1rem; color: #666; font-size: .9rem; }
.posicao-mini-legenda { margin: 0 0 .75rem; color: #475467; font-size: .85rem; line-height: 1.45; }
.posicao-mapa-scroll, .posicao-grafico-scroll { overflow-x: auto; }
.posicao-mapa { display: block; width: 100%; min-width: 1000px; max-width: 1020px; height: auto; margin: 0 auto; font-family: Arial, Helvetica, sans-serif; }
.posicao-eixo, .posicao-barra { font-size: 15px; fill: #000; }
.posicao-valor { font-size: 22px; font-weight: 600; }
.posicao-p { font-size: 13px; }
.posicao-celula { stroke: #fff; }
.posicao-significancia circle { fill: #263238; stroke: #fff; stroke-width: 1.5; }
.posicao-significancia text { fill: #fff; font-size: 13px; font-weight: 700; }
.posicao-sem-dados { fill: #666; }
.posicao-leitura { margin: .65rem 0; color: #475467; font-size: .9rem; line-height: 1.5; }
.posicao-notas { margin-top: 1rem; color: #555; font-size: .88rem; line-height: 1.5; }
.posicao-notas p + p { margin-top: .65rem; }
.posicao-mais-info { margin: 1rem 0 0; }
.posicao-status, .posicao-vazio { padding: 1rem; border-radius: 6px; background: #f8fafc; color: #475467; }
.posicao-erro { border-left: 4px solid #ef4444; background: #fff1f0; color: #912018; }
.posicao-seletor-area { display: inline-flex; align-items: center; gap: .65rem; margin: .25rem 0 .75rem; color: #344054; font-weight: 600; }
.posicao-seletor-area select { padding: .45rem .65rem; border: 1px solid #d0d5dd; border-radius: 6px; background: #fff; color: #344054; font: inherit; }
.posicao-dispersao, .posicao-variacao { display: block; width: 100%; max-width: 1000px; height: auto; margin: 0 auto; font-family: Arial, Helvetica, sans-serif; }
.posicao-grade { stroke: #e4e7ec; stroke-width: 1; }
.posicao-grade-vertical { stroke: #f0f2f5; stroke-width: 1; }
.posicao-tick { fill: #475467; font-size: 12px; }
.posicao-linha-media { fill: none; stroke: #c4458a; stroke-width: 2.5; stroke-linejoin: round; stroke-linecap: round; }
.posicao-legenda-cadernos { display: flex; justify-content: center; gap: 1.5rem; flex-wrap: wrap; margin: .25rem 0 0; color: #344054; font-size: .85rem; }
.posicao-legenda-cadernos span { display: inline-flex; align-items: center; gap: .45rem; }
.posicao-legenda-cadernos i { display: inline-block; width: 12px; height: 12px; border-radius: 50%; }
.posicao-legenda-cadernos .posicao-legenda-media { width: 20px; height: 3px; border-radius: 0; background: #c4458a; }
@media (max-width: 600px) {
  .posicao-bloco { padding: 1rem; }
  .posicao-cabecalho { align-items: flex-start; flex-wrap: wrap; }
}
</style>
