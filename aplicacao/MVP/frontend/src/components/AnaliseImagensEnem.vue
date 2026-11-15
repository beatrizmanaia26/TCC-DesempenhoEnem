<template>
  <div class="imagem-enem">
    <p v-if="carregando" class="imagem-status">Carregando análise de imagens do ENEM {{ ano }}...</p>
    <p v-else-if="erro" class="imagem-status imagem-erro">{{ erro }}</p>
    <template v-else>
      <section v-if="secao === 'presenca'" class="imagem-bloco">
        <div class="imagem-cabecalho">
          <h3>Presença de imagens na prova</h3>
          <InfoIcon :largura="360" tooltip="Consideramos imagem qualquer elemento visual da questão, incluindo gráficos e tabelas. A contagem usa o indicador tem_imagem dos JSONs do caderno Azul. Inglês e Espanhol nas questões 1 a 5 são itens separados; por isso, a base contém 185 itens, embora cada participante responda a 180 questões." />
          <div class="filter-wrapper">
            <button type="button" class="filter-btn" @click="alternarFiltroPresenca"><FilterIcon />Filtro</button>
            <div v-if="mostrarFiltroPresenca" class="filter-menu">
              <div class="filter-secao">
                <p class="filter-titulo">DIA</p>
                <div class="filter-lista">
                  <div class="filter-option" v-for="opcao in opcoesDiaTabela" :key="`presenca-dia-${opcao.valor}`">
                    <input type="radio" name="imagem-presenca-dia" :id="`imagem-presenca-dia-${opcao.valor}`" :checked="rascunhoDiaPresenca === opcao.valor" @change="rascunhoDiaPresenca = opcao.valor" />
                    <label :for="`imagem-presenca-dia-${opcao.valor}`">{{ opcao.rotulo }}</label>
                  </div>
                </div>
              </div>
              <div class="filter-secao">
                <p class="filter-titulo">ÁREA</p>
                <div class="filter-lista">
                  <div class="filter-option" v-for="opcao in opcoesAreaPresenca" :key="`presenca-area-${opcao.valor}`">
                    <input type="checkbox" :id="`imagem-presenca-area-${opcao.valor}`" :checked="!rascunhoAreasPresenca.length || rascunhoAreasPresenca.includes(opcao.valor)" @change="alternarAreaPresenca(opcao.valor)" />
                    <label :for="`imagem-presenca-area-${opcao.valor}`">{{ opcao.rotulo }}</label>
                  </div>
                </div>
                <small class="filter-ajuda">Nenhuma área marcada equivale a todas as áreas do dia.</small>
              </div>
              <div class="filter-secao">
                <p class="filter-titulo">DIFICULDADE</p>
                <div class="filter-lista">
                  <div class="filter-option" v-for="opcao in opcoesDificuldade" :key="`presenca-dificuldade-${opcao.valor}`">
                    <input type="radio" name="imagem-presenca-dificuldade" :id="`imagem-presenca-dificuldade-${opcao.valor}`" :checked="rascunhoDificuldadePresenca === opcao.valor" @change="rascunhoDificuldadePresenca = opcao.valor" />
                    <label :for="`imagem-presenca-dificuldade-${opcao.valor}`">{{ opcao.rotulo }}</label>
                  </div>
                </div>
              </div>
              <div class="filter-rodape"><button type="button" class="filter-aplicar" @click="aplicarFiltroPresenca">Aplicar</button></div>
            </div>
          </div>
        </div>
        <p class="imagem-subtitulo">{{ itensComImagem.length }} de {{ questoesFiltradas.length }} itens têm imagem ({{ formatarPercentual(percentualComImagem) }}%).</p>
        <div v-if="questoesFiltradas.length" class="imagem-pizza-conteudo">
          <svg viewBox="0 0 200 200" class="imagem-pizza" role="img" aria-label="Proporção de itens com e sem imagem">
            <path v-for="fatia in fatias" :key="fatia.chave" :d="fatia.caminho" :fill="fatia.cor" />
          </svg>
          <ul class="imagem-legenda">
            <li v-for="fatia in fatias" :key="fatia.chave"><i :style="{ background: fatia.cor }"></i>{{ fatia.rotulo }}: {{ fatia.valor }} ({{ formatarPercentual(fatia.percentual) }}%)</li>
          </ul>
        </div>
        <p v-else class="imagem-vazio">Não há itens para a área selecionada.</p>
      </section>

      <section v-else-if="secao === 'caracteres'" class="imagem-bloco">
        <div class="imagem-cabecalho">
          <h3>Quantidade de caracteres por presença de imagem</h3>
          <InfoIcon :largura="360" tooltip="Cada ponto representa uma questão do caderno Azul. A contagem considera o texto extraído da questão e das alternativas, sem espaços, tabulações ou quebras de linha; questões sem texto extraído não aparecem. Inglês e Espanhol nas questões 1 a 5 são itens separados, totalizando 185 itens, embora cada participante responda a 180 questões." />
          <div class="filter-wrapper">
            <button type="button" class="filter-btn" @click="alternarFiltroCaracteres"><FilterIcon />Filtro</button>
            <div v-if="mostrarFiltroCaracteres" class="filter-menu">
              <div class="filter-secao">
                <p class="filter-titulo">DIA</p>
                <div class="filter-lista">
                  <div class="filter-option" v-for="opcao in opcoesDiaTabela" :key="`caracteres-dia-${opcao.valor}`">
                    <input type="radio" name="imagem-caracteres-dia" :id="`imagem-caracteres-dia-${opcao.valor}`" :checked="rascunhoDiaCaracteres === opcao.valor" @change="rascunhoDiaCaracteres = opcao.valor" />
                    <label :for="`imagem-caracteres-dia-${opcao.valor}`">{{ opcao.rotulo }}</label>
                  </div>
                </div>
              </div>
              <div class="filter-secao">
                <p class="filter-titulo">ÁREA</p>
                <div class="filter-lista">
                  <div class="filter-option" v-for="opcao in opcoesAreaCaracteres" :key="`caracteres-area-${opcao.valor}`">
                    <input type="checkbox" :id="`imagem-caracteres-area-${opcao.valor}`" :checked="!rascunhoAreasCaracteres.length || rascunhoAreasCaracteres.includes(opcao.valor)" @change="alternarAreaCaracteres(opcao.valor)" />
                    <label :for="`imagem-caracteres-area-${opcao.valor}`">{{ opcao.rotulo }}</label>
                  </div>
                </div>
                <small class="filter-ajuda">Nenhuma área marcada equivale a todas as áreas do dia.</small>
              </div>
              <div class="filter-secao">
                <p class="filter-titulo">DIFICULDADE</p>
                <div class="filter-lista">
                  <div class="filter-option" v-for="opcao in opcoesDificuldade" :key="`caracteres-dificuldade-${opcao.valor}`">
                    <input type="radio" name="imagem-caracteres-dificuldade" :id="`imagem-caracteres-dificuldade-${opcao.valor}`" :checked="rascunhoDificuldadeCaracteres === opcao.valor" @change="rascunhoDificuldadeCaracteres = opcao.valor" />
                    <label :for="`imagem-caracteres-dificuldade-${opcao.valor}`">{{ opcao.rotulo }}</label>
                  </div>
                </div>
              </div>
              <div class="filter-secao">
                <p class="filter-titulo">PRESENÇA DE IMAGEM</p>
                <div class="filter-lista">
                  <div class="filter-option" v-for="opcao in opcoesImagem" :key="`caracteres-imagem-${opcao.valor}`">
                    <input type="radio" name="imagem-caracteres-presenca" :id="`imagem-caracteres-presenca-${opcao.valor}`" :checked="rascunhoImagemCaracteres === opcao.valor" @change="rascunhoImagemCaracteres = opcao.valor" />
                    <label :for="`imagem-caracteres-presenca-${opcao.valor}`">{{ opcao.rotulo }}</label>
                  </div>
                </div>
              </div>
              <div class="filter-rodape"><button type="button" class="filter-aplicar" @click="aplicarFiltroCaracteres">Aplicar</button></div>
            </div>
          </div>
        </div>
        <p class="imagem-subtitulo">Distribuição dos caracteres em {{ questoesCaracteresFiltradas.length }} questões com texto extraído. Passe o cursor sobre um ponto para ver a questão e o valor.</p>
        <svg v-if="questoesCaracteresFiltradas.length" class="imagem-grafico-caracteres" viewBox="0 0 760 400" role="img" aria-label="Distribuição de caracteres dos itens com e sem imagem">
          <text x="410" y="20" text-anchor="middle" class="imagem-eixo">Caracteres (sem espaços)</text>
          <g v-for="marca in marcasCaracteres" :key="`caracteres-eixo-${marca.proporcao}`">
            <line x1="80" :y1="marca.y" x2="740" :y2="marca.y" class="imagem-grade" />
            <text x="70" :y="marca.y + 4" text-anchor="end" class="imagem-eixo">{{ formatarNumero(marca.valor) }}</text>
          </g>
          <g v-for="grupo in gruposCaracteres" :key="grupo.key">
            <template v-if="grupo.resumo">
              <line :x1="grupo.centro" :y1="escalaYCaracteres(grupo.resumo.maxHaste)" :x2="grupo.centro" :y2="escalaYCaracteres(grupo.resumo.minHaste)" :stroke="grupo.cor" stroke-width="2" />
              <line :x1="grupo.centro - 16" :y1="escalaYCaracteres(grupo.resumo.maxHaste)" :x2="grupo.centro + 16" :y2="escalaYCaracteres(grupo.resumo.maxHaste)" :stroke="grupo.cor" stroke-width="2" />
              <line :x1="grupo.centro - 16" :y1="escalaYCaracteres(grupo.resumo.minHaste)" :x2="grupo.centro + 16" :y2="escalaYCaracteres(grupo.resumo.minHaste)" :stroke="grupo.cor" stroke-width="2" />
              <rect :x="grupo.centro - 30" :y="escalaYCaracteres(grupo.resumo.q3)" width="60" :height="Math.max(1, escalaYCaracteres(grupo.resumo.q1) - escalaYCaracteres(grupo.resumo.q3))" :fill="grupo.cor" fill-opacity=".2" :stroke="grupo.cor" stroke-width="2" />
              <line :x1="grupo.centro - 30" :y1="escalaYCaracteres(grupo.resumo.mediana)" :x2="grupo.centro + 30" :y2="escalaYCaracteres(grupo.resumo.mediana)" :stroke="grupo.cor" stroke-width="3" />
            </template>
            <circle v-for="ponto in grupo.pontos" :key="ponto.chave" :cx="grupo.centro + ponto.deslocamento" :cy="escalaYCaracteres(ponto.caracteres)" r="4" :fill="grupo.cor" fill-opacity=".7">
              <title>{{ rotuloQuestao(ponto) }} · {{ formatarNumero(ponto.caracteres) }} caracteres</title>
            </circle>
            <text :x="grupo.centro" y="350" text-anchor="middle" class="imagem-categoria">{{ grupo.rotulo }}</text>
            <text :x="grupo.centro" y="372" text-anchor="middle" class="imagem-eixo">n = {{ grupo.pontos.length }} questões</text>
          </g>
        </svg>
        <button v-if="questoesCaracteresFiltradas.length" type="button" class="filter-btn botao-mais-info" @click="mostrarMaisCaracteres = !mostrarMaisCaracteres">
          {{ mostrarMaisCaracteres ? 'Ocultar informações sobre este gráfico' : 'Mais informações sobre este gráfico' }}
        </button>
        <ul v-if="mostrarMaisCaracteres && questoesCaracteresFiltradas.length" class="imagem-notas">
          <li><strong>Pontos:</strong> cada ponto representa uma questão. A cor indica se o extrator identificou imagem naquela questão; ela não entra no cálculo da quantidade de caracteres.</li>
          <li><strong>Contagem:</strong> considera o texto extraído da questão e suas alternativas, sem espaços, tabulações ou quebras de linha. Questões sem texto extraído não entram no gráfico.</li>
          <li><strong>Linha dentro da caixa:</strong> representa a mediana, o valor central quando as questões do grupo são ordenadas por quantidade de caracteres.</li>
          <li><strong>Caixa:</strong> vai do 1º ao 3º quartil e reúne os 50% centrais das questões. Uma caixa mais alta indica maior variação nos tamanhos desse grupo.</li>
          <li><strong>Hastes e pontos extremos:</strong> as hastes chegam aos menores e maiores valores dentro de 1,5 intervalo interquartil. Valores além das hastes são considerados outliers, mas continuam visíveis como pontos.</li>
          <li><strong>n:</strong> indica quantas questões com texto extraído há em cada grupo. Os filtros atualizam os pontos, as caixas e esses totais; grupos pequenos tornam a distribuição menos representativa.</li>
        </ul>
        <p v-if="!questoesCaracteresFiltradas.length" class="imagem-vazio">Não há questões com texto extraído para os filtros selecionados.</p>
      </section>

      <section v-else-if="secao === 'acertos'" class="imagem-bloco">
        <div class="imagem-cabecalho">
          <h3>Percentual médio de acertos por presença de imagem</h3>
          <InfoIcon :largura="360" tooltip="Cada barra mostra a média simples dos percentuais de acerto das questões com imagem ou sem imagem na área selecionada. Cada questão tem o mesmo peso na média; questões anuladas não entram no cálculo. Os dados são dos microdados do ENEM relacionados ao caderno Azul. Inglês e Espanhol nas questões 1 a 5 são itens separados, totalizando 185 itens, embora cada participante responda a 180 questões." />
          <div class="filter-wrapper">
            <button type="button" class="filter-btn" @click="alternarFiltroAcertos"><FilterIcon />Filtro</button>
            <div v-if="mostrarFiltroAcertos" class="filter-menu">
              <div class="filter-secao">
                <p class="filter-titulo">DIA</p>
                <div class="filter-lista">
                  <div class="filter-option" v-for="opcao in opcoesDiaTabela" :key="`acertos-dia-${opcao.valor}`">
                    <input type="radio" name="imagem-acertos-dia" :id="`imagem-acertos-dia-${opcao.valor}`" :checked="rascunhoDiaAcertos === opcao.valor" @change="rascunhoDiaAcertos = opcao.valor" />
                    <label :for="`imagem-acertos-dia-${opcao.valor}`">{{ opcao.rotulo }}</label>
                  </div>
                </div>
              </div>
              <div class="filter-secao">
                <p class="filter-titulo">ÁREA</p>
                <div class="filter-lista">
                  <div class="filter-option" v-for="opcao in opcoesAreaAcertos" :key="`acertos-area-${opcao.valor}`">
                    <input type="checkbox" :id="`imagem-acertos-area-${opcao.valor}`" :checked="!rascunhoAreasAcertos.length || rascunhoAreasAcertos.includes(opcao.valor)" @change="alternarAreaAcertos(opcao.valor)" />
                    <label :for="`imagem-acertos-area-${opcao.valor}`">{{ opcao.rotulo }}</label>
                  </div>
                </div>
                <small class="filter-ajuda">Nenhuma área marcada equivale a todas as áreas do dia.</small>
              </div>
              <div class="filter-secao">
                <p class="filter-titulo">DIFICULDADE</p>
                <div class="filter-lista">
                  <div class="filter-option" v-for="opcao in opcoesDificuldade" :key="`acertos-dificuldade-${opcao.valor}`">
                    <input type="radio" name="imagem-acertos-dificuldade" :id="`imagem-acertos-dificuldade-${opcao.valor}`" :checked="rascunhoDificuldadeAcertos === opcao.valor" @change="rascunhoDificuldadeAcertos = opcao.valor" />
                    <label :for="`imagem-acertos-dificuldade-${opcao.valor}`">{{ opcao.rotulo }}</label>
                  </div>
                </div>
              </div>
              <div class="filter-secao">
                <p class="filter-titulo">PRESENÇA DE IMAGEM</p>
                <div class="filter-lista">
                  <div class="filter-option" v-for="opcao in opcoesImagem" :key="`acertos-imagem-${opcao.valor}`">
                    <input type="radio" name="imagem-acertos-presenca" :id="`imagem-acertos-presenca-${opcao.valor}`" :checked="rascunhoImagemAcertos === opcao.valor" @change="rascunhoImagemAcertos = opcao.valor" />
                    <label :for="`imagem-acertos-presenca-${opcao.valor}`">{{ opcao.rotulo }}</label>
                  </div>
                </div>
              </div>
              <div class="filter-rodape"><button type="button" class="filter-aplicar" @click="aplicarFiltroAcertos">Aplicar</button></div>
            </div>
          </div>
        </div>
        <p class="imagem-subtitulo">Média simples dos percentuais de acerto dos itens por área e presença de imagem.</p>
        <div class="imagem-legenda-barras"><span><i class="imagem-cor-com"></i>Com imagem</span><span><i class="imagem-cor-sem"></i>Sem imagem</span></div>
        <svg v-if="gruposAcertos.length" class="imagem-grafico-acertos" :viewBox="`0 0 ${larguraGrafico} 400`" role="img" aria-label="Percentual médio de acertos por área e presença de imagem">
          <g v-for="marca in marcasAcerto" :key="`acertos-eixo-${marca.valor}`">
            <line x1="70" :y1="marca.y" :x2="larguraGrafico - 18" :y2="marca.y" class="imagem-grade" />
            <text x="60" :y="marca.y + 4" text-anchor="end" class="imagem-eixo">{{ marca.valor }}%</text>
          </g>
          <g v-for="grupo in gruposAcertos" :key="grupo.area">
            <g v-for="barra in grupo.barras" :key="barra.key">
              <rect :x="barra.x" :y="escalaYAcerto(barra.valor)" :width="barra.largura" :height="340 - escalaYAcerto(barra.valor)" :fill="barra.cor" rx="3">
                <title>{{ grupo.rotulo }} · {{ barra.rotulo }}: {{ formatarPercentual(barra.valor) }}% ({{ barra.n }} itens)</title>
              </rect>
              <text :x="barra.x + barra.largura / 2" :y="escalaYAcerto(barra.valor) - 6" text-anchor="middle" class="imagem-valor">{{ formatarPercentual(barra.valor) }}%</text>
            </g>
            <text :x="grupo.centro" y="368" text-anchor="middle" class="imagem-categoria">{{ grupo.rotulo }}</text>
          </g>
        </svg>
        <p v-else class="imagem-vazio">Não há percentuais de acerto para os filtros selecionados.</p>
        <button v-if="gruposAcertos.length" type="button" class="filter-btn botao-mais-info" @click="mostrarMaisAcertos = !mostrarMaisAcertos">
          {{ mostrarMaisAcertos ? 'Ocultar informações sobre este gráfico' : 'Mais informações sobre este gráfico' }}
        </button>
        <div v-if="mostrarMaisAcertos && gruposAcertos.length" class="imagem-notas">
          <p>Cada questão com percentual de acertos informado contribui igualmente para a média da sua área e do grupo com ou sem imagem. Portanto, a barra resume as questões do grupo e não representa uma média ponderada pelo número de participantes que responderam a cada questão. Questões anuladas não entram nesse cálculo.</p>
        </div>
      </section>

      <section v-else-if="secao === 'correlacao'" class="imagem-bloco">
        <div class="imagem-cabecalho">
          <h3>Relação entre presença de imagem e percentual de acertos por dificuldade</h3>
          <InfoIcon :largura="420" tooltip="Cada célula representa uma dificuldade e uma área do ENEM selecionado. A cor indica a direção e a intensidade da correlação ponto-bisserial entre ter imagem e o percentual de acertos. O p bruto é ajustado pelo método de Holm entre as combinações válidas de área e dificuldade deste ano (até 12 testes)." />
        </div>
        <p class="imagem-subtitulo">Cada célula reúne as questões de uma dificuldade e de uma área. O mapa mostra se a associação entre imagem e percentual de acertos varia entre questões fáceis, médias e difíceis.</p>
        <p class="imagem-correlacao-mini-legenda"><strong>Legenda:</strong> azul = associação negativa · branco = próxima de zero · verde = positiva · círculo escuro com ★ = p (Holm) &lt; 0,05.</p>
        <div v-if="celulasMapaCorrelacao.length" class="imagem-correlacao-mapa-scroll">
          <svg :viewBox="`0 0 ${larguraMapaCorrelacao} ${alturaMapaCorrelacao}`" class="imagem-mapa-correlacao" role="img" :aria-label="`Mapa de calor da correlação ponto-bisserial entre presença de imagem e percentual de acertos no ENEM ${ano}, por área e dificuldade`">
            <text v-for="(area, indice) in areasMapaCorrelacao" :key="`imagem-correlacao-coluna-${area.valor}`" :x="margemMapaEsquerda + indice * tamanhoCelulaMapa + (tamanhoCelulaMapa - espacamentoCelulaMapa) / 2" :y="margemMapaTopo - 12" text-anchor="middle" class="imagem-heatmap-eixo">{{ area.rotulo }}</text>
            <text v-for="(dificuldade, indice) in dificuldadesMapaCorrelacao" :key="`imagem-correlacao-linha-${dificuldade.valor}`" :x="margemMapaEsquerda - 12" :y="margemMapaTopo + indice * tamanhoCelulaMapa + (tamanhoCelulaMapa - espacamentoCelulaMapa) / 2" text-anchor="end" dominant-baseline="middle" class="imagem-heatmap-eixo">{{ dificuldade.rotulo }}</text>
            <g v-for="celula in celulasMapaCorrelacao" :key="celula.chave">
              <rect class="imagem-heatmap-celula" :x="celula.x" :y="celula.y" :width="tamanhoCelulaMapa - espacamentoCelulaMapa" :height="tamanhoCelulaMapa - espacamentoCelulaMapa" :fill="celula.cor" :stroke="celula.pHolm !== null && celula.pHolm < 0.05 ? '#263238' : '#ffffff'" :stroke-width="celula.pHolm !== null && celula.pHolm < 0.05 ? 3 : 1">
                <title>{{ celula.rotuloDificuldade }} · {{ celula.rotuloArea }}</title>
              </rect>
              <g v-if="celula.pHolm !== null && celula.pHolm < 0.05" class="imagem-heatmap-significancia" aria-label="Resultado significativo após ajuste de Holm">
                <circle :cx="celula.x + tamanhoCelulaMapa - espacamentoCelulaMapa - 17" :cy="celula.y + 17" r="12" />
                <text :x="celula.x + tamanhoCelulaMapa - espacamentoCelulaMapa - 17" :y="celula.y + 17" text-anchor="middle" dominant-baseline="middle">★</text>
                <title>p (Holm) abaixo de 0,05</title>
              </g>
              <template v-if="celula.correlacao !== null">
                <text :x="celula.x + (tamanhoCelulaMapa - espacamentoCelulaMapa) / 2" :y="celula.y + (tamanhoCelulaMapa - espacamentoCelulaMapa) / 2 - 8" text-anchor="middle" dominant-baseline="middle" :fill="celula.corTexto" class="imagem-heatmap-valor">{{ formatarCorrelacaoMapa(celula.correlacao) }}</text>
                <text :x="celula.x + (tamanhoCelulaMapa - espacamentoCelulaMapa) / 2" :y="celula.y + (tamanhoCelulaMapa - espacamentoCelulaMapa) / 2 + 14" text-anchor="middle" dominant-baseline="middle" :fill="celula.corTexto" class="imagem-heatmap-p">p bruto = {{ formatarPMapa(celula.p) }}</text>
                <text :x="celula.x + (tamanhoCelulaMapa - espacamentoCelulaMapa) / 2" :y="celula.y + (tamanhoCelulaMapa - espacamentoCelulaMapa) / 2 + 32" text-anchor="middle" dominant-baseline="middle" :fill="celula.corTexto" class="imagem-heatmap-p">p (Holm) = {{ formatarPMapa(celula.pHolm) }}</text>
              </template>
              <text v-else :x="celula.x + (tamanhoCelulaMapa - espacamentoCelulaMapa) / 2" :y="celula.y + (tamanhoCelulaMapa - espacamentoCelulaMapa) / 2" text-anchor="middle" dominant-baseline="middle" class="imagem-heatmap-valor" fill="#666666">—</text>
            </g>
            <defs>
              <linearGradient id="imagem-correlacao-gradiente" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stop-color="#0070C0" />
                <stop offset="50%" stop-color="#FFFFFF" />
                <stop offset="100%" stop-color="#10B981" />
              </linearGradient>
            </defs>
            <rect :x="barraMapaX" :y="margemMapaTopo" width="22" :height="alturaGradeMapa" fill="url(#imagem-correlacao-gradiente)" />
            <text v-for="marca in marcasBarraMapa" :key="`imagem-correlacao-marca-${marca.valor}`" :x="barraMapaX + 30" :y="margemMapaTopo + ((1 - marca.valor) / 2) * alturaGradeMapa" class="imagem-heatmap-barra" dominant-baseline="middle">{{ marca.rotulo }}</text>
            <text :x="barraMapaX + 70" :y="margemMapaTopo + alturaGradeMapa / 2" text-anchor="middle" dominant-baseline="middle" class="imagem-heatmap-barra" :transform="`rotate(90 ${barraMapaX + 70} ${margemMapaTopo + alturaGradeMapa / 2})`">Correlação ponto-bisserial (r<tspan baseline-shift="sub" font-size="9">pb</tspan>)</text>
          </svg>
        </div>
        <p v-else class="imagem-vazio">Não há resultados de correlação disponíveis para montar o mapa.</p>
        <p v-if="quantidadeCorrelacoesValidas" class="imagem-correlacao-leitura"><strong>Resultado:</strong> {{ quantidadeCorrelacoesSignificativas }} de {{ quantidadeCorrelacoesValidas }} combinações válidas têm p (Holm) abaixo de 0,05. {{ quantidadeCorrelacoesSignificativas ? 'Mesmo uma associação estatisticamente significativa não prova que a imagem causou mudança no desempenho.' : 'Neste ENEM, não encontramos evidência estatística clara de associação após o ajuste; isso não prova que a imagem não tenha efeito.' }}</p>
        <p v-else class="imagem-correlacao-leitura"><strong>Resultado:</strong> Não há combinações com dados suficientes para calcular a correlação por dificuldade e área neste ENEM.</p>
        <button v-if="celulasMapaCorrelacao.length" type="button" class="filter-btn botao-mais-info" @click="mostrarMaisCorrelacao = !mostrarMaisCorrelacao">
          {{ mostrarMaisCorrelacao ? 'Ocultar informações sobre este gráfico' : 'Mais informações sobre este gráfico' }}
        </button>
        <div v-if="mostrarMaisCorrelacao && celulasMapaCorrelacao.length" class="imagem-notas">
          <p><strong>O que cada célula representa:</strong> uma combinação de nível de dificuldade e área no ano selecionado. Questões anuladas, sem percentual de acertos ou sem classificação de dificuldade não entram na análise. Cada questão tem o mesmo peso na correlação.</p>
          <p><strong>Correlação ponto-bisserial (r<sub>pb</sub>):</strong> relaciona a presença ou ausência de imagem ao percentual de acertos e varia de −1 a +1. Um valor positivo indica que, nesse grupo, as questões com imagem tendem a ter percentual de acertos maior do que as sem imagem; um valor negativo indica que tendem a ter percentual menor. Valores próximos de zero indicam pouca associação linear. Quanto mais distante de zero, mais forte é a associação observada. A cor representa esse valor.</p>
          <p><strong>p bruto e p (Holm):</strong> o p bruto corresponde ao teste de uma combinação de área e dificuldade. O p (Holm) ajusta em conjunto os testes válidos do ano selecionado (até 12 combinações), reduzindo o risco de encontrar uma associação por acaso ao analisar várias células. Consideramos evidência estatística quando p (Holm) &lt; 0,05; um valor maior não prova que a hipótese nula seja verdadeira.</p>
          <p><strong>Limite da análise:</strong> correlação mostra associação, não causa. Dificuldade, conteúdo, texto e outros fatores podem estar relacionados ao percentual de acertos; por isso, este mapa não permite concluir que imagens aumentem ou reduzam o desempenho.</p>
        </div>
      </section>

      <section v-else-if="secao === 'tabela'" class="imagem-bloco">
        <div class="imagem-cabecalho">
          <h3>Detalhamento dos itens por imagem</h3>
          <InfoIcon :largura="360" tooltip="Os dados são do caderno Azul. Inglês e Espanhol nas questões 1 a 5 são itens separados; por isso, a base contém 185 itens, embora cada participante responda a 180 questões. A dificuldade considera o parâmetro b do TRI: em cada área, as questões foram classificadas em três grupos (fácil, média e difícil). Questões sem classificação não têm parâmetro b calculado pelo Inep ou foram anuladas." />
          <div class="filter-wrapper">
            <button type="button" class="filter-btn" @click="alternarFiltroTabela"><FilterIcon />Filtro</button>
            <div v-if="mostrarFiltroTabela" class="filter-menu">
              <div class="filter-secao">
                <p class="filter-titulo">DIA</p>
                <div class="filter-lista">
                  <div class="filter-option" v-for="opcao in opcoesDiaTabela" :key="`tabela-dia-${opcao.valor}`">
                    <input type="radio" name="imagem-tabela-dia" :id="`imagem-tabela-dia-${opcao.valor}`" :checked="rascunhoDiaTabela === opcao.valor" @change="rascunhoDiaTabela = opcao.valor" />
                    <label :for="`imagem-tabela-dia-${opcao.valor}`">{{ opcao.rotulo }}</label>
                  </div>
                </div>
              </div>
              <div class="filter-secao">
                <p class="filter-titulo">ÁREA</p>
                <div class="filter-lista">
                  <div class="filter-option" v-for="opcao in opcoesAreaTabela" :key="`tabela-area-${opcao.valor}`">
                    <input type="checkbox" :id="`imagem-tabela-area-${opcao.valor}`" :checked="!rascunhoAreasTabela.length || rascunhoAreasTabela.includes(opcao.valor)" @change="alternarAreaTabela(opcao.valor)" />
                    <label :for="`imagem-tabela-area-${opcao.valor}`">{{ opcao.rotulo }}</label>
                  </div>
                </div>
                <small class="filter-ajuda">Nenhuma área marcada equivale a todas as áreas do dia.</small>
              </div>
              <div class="filter-secao">
                <p class="filter-titulo">DIFICULDADE</p>
                <div class="filter-lista">
                  <div class="filter-option" v-for="opcao in opcoesDificuldade" :key="`tabela-dificuldade-${opcao.valor}`">
                    <input type="radio" name="imagem-tabela-dificuldade" :id="`imagem-tabela-dificuldade-${opcao.valor}`" :checked="rascunhoDificuldadeTabela === opcao.valor" @change="rascunhoDificuldadeTabela = opcao.valor" />
                    <label :for="`imagem-tabela-dificuldade-${opcao.valor}`">{{ opcao.rotulo }}</label>
                  </div>
                </div>
              </div>
              <div class="filter-secao">
                <p class="filter-titulo">PRESENÇA DE IMAGEM</p>
                <div class="filter-lista">
                  <div class="filter-option" v-for="opcao in opcoesImagem" :key="`tabela-imagem-${opcao.valor}`">
                    <input type="radio" name="imagem-tabela-presenca" :id="`imagem-tabela-presenca-${opcao.valor}`" :checked="rascunhoImagemTabela === opcao.valor" @change="rascunhoImagemTabela = opcao.valor" />
                    <label :for="`imagem-tabela-presenca-${opcao.valor}`">{{ opcao.rotulo }}</label>
                  </div>
                </div>
              </div>
              <div class="filter-secao">
                <p class="filter-titulo">QUESTÕES ANULADAS</p>
                <div class="filter-lista">
                  <div class="filter-option" v-for="opcao in opcoesAnuladas" :key="`tabela-anuladas-${opcao.valor}`">
                    <input type="radio" name="imagem-tabela-anuladas" :id="`imagem-tabela-anuladas-${opcao.valor}`" :checked="rascunhoAnuladasTabela === opcao.valor" @change="rascunhoAnuladasTabela = opcao.valor" />
                    <label :for="`imagem-tabela-anuladas-${opcao.valor}`">{{ opcao.rotulo }}</label>
                  </div>
                </div>
              </div>
              <div class="filter-rodape"><button type="button" class="filter-aplicar" @click="aplicarFiltroTabela">Aplicar</button></div>
            </div>
          </div>
        </div>
        <p class="imagem-subtitulo">{{ questoesTabela.length }} de {{ questoes.length }} itens exibidos.</p>
        <div v-if="questoesTabela.length" class="imagem-tabela-scroll">
          <table class="imagem-tabela">
            <thead><tr><th>Questão</th><th>Área</th><th>Dificuldade</th><th>Imagem</th><th>Acertos</th></tr></thead>
            <tbody>
              <tr v-for="questao in questoesTabela" :key="questao.chave">
                <th scope="row">{{ rotuloQuestao(questao) }}</th>
                <td>{{ rotuloArea(questao.area) }}</td>
                <td>{{ rotuloDificuldade(questao.dificuldade) }}</td>
                <td><span class="imagem-selo" :class="questao.temImagem ? 'selo-com-imagem' : 'selo-sem-imagem'">{{ questao.temImagem ? 'Com imagem' : 'Sem imagem' }}</span></td>
                <td>{{ questao.percentualAcertos === null ? 'Anulada' : `${formatarPercentual(questao.percentualAcertos)}%` }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="imagem-vazio"><p>Nenhum item corresponde aos filtros selecionados.</p><button type="button" class="filter-btn" @click="limparFiltrosTabela">Limpar filtros</button></div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import http from '@/services/http.js'
import { pValorT } from '@/services/correlacaoProva.js'
import FilterIcon from '@/components/icons/FilterIcon.vue'
import InfoIcon from '@/components/icons/InfoIcon.vue'

const props = defineProps({
  ano: { type: Number, required: true },
  secao: { type: String, required: true }
})

const CORES = { com: '#0070C0', sem: '#C4458A' }
const opcoesArea = [
  { valor: 'todas', rotulo: 'Todas as áreas' },
  { valor: 'LC', rotulo: 'Linguagens e Códigos' },
  { valor: 'CH', rotulo: 'Ciências Humanas' },
  { valor: 'CN', rotulo: 'Ciências da Natureza' },
  { valor: 'MT', rotulo: 'Matemática' }
]
const opcoesImagem = [
  { valor: 'ambas', rotulo: 'Com e sem imagem' },
  { valor: 'com', rotulo: 'Somente com imagem' },
  { valor: 'sem', rotulo: 'Somente sem imagem' }
]
const opcoesDiaTabela = [
  { valor: 'todos', rotulo: 'Todos os dias' },
  { valor: 1, rotulo: 'Dia 1' },
  { valor: 2, rotulo: 'Dia 2' }
]
const opcoesAreaTabelaTodas = [
  { valor: 'LC', rotulo: 'Linguagens e Códigos', dia: 1 },
  { valor: 'CH', rotulo: 'Ciências Humanas', dia: 1 },
  { valor: 'CN', rotulo: 'Ciências da Natureza', dia: 2 },
  { valor: 'MT', rotulo: 'Matemática', dia: 2 }
]
const opcoesAnuladas = [
  { valor: 'todas', rotulo: 'Todas as questões' },
  { valor: 'ocultar', rotulo: 'Ocultar anuladas' },
  { valor: 'somente', rotulo: 'Somente anuladas' }
]
const opcoesDificuldade = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'facil', rotulo: 'Fácil' },
  { valor: 'media', rotulo: 'Média' },
  { valor: 'dificil', rotulo: 'Difícil' }
]
const dados = ref({ questoes: [], estatisticas: [], comparacoes: [] })
const carregando = ref(false)
const erro = ref('')
const filtroDiaPresenca = ref('todos')
const rascunhoDiaPresenca = ref('todos')
const filtroAreasPresenca = ref([])
const rascunhoAreasPresenca = ref([])
const filtroDificuldadePresenca = ref('todas')
const rascunhoDificuldadePresenca = ref('todas')
const mostrarFiltroPresenca = ref(false)
const filtroDiaCaracteres = ref('todos')
const rascunhoDiaCaracteres = ref('todos')
const filtroAreasCaracteres = ref([])
const rascunhoAreasCaracteres = ref([])
const filtroDificuldadeCaracteres = ref('todas')
const rascunhoDificuldadeCaracteres = ref('todas')
const filtroImagemCaracteres = ref('ambas')
const rascunhoImagemCaracteres = ref('ambas')
const mostrarFiltroCaracteres = ref(false)
const mostrarMaisCaracteres = ref(false)
const filtroDiaAcertos = ref('todos')
const rascunhoDiaAcertos = ref('todos')
const filtroAreasAcertos = ref([])
const rascunhoAreasAcertos = ref([])
const filtroDificuldadeAcertos = ref('todas')
const rascunhoDificuldadeAcertos = ref('todas')
const filtroImagemAcertos = ref('ambas')
const rascunhoImagemAcertos = ref('ambas')
const mostrarFiltroAcertos = ref(false)
const mostrarMaisCorrelacao = ref(false)
const filtroDiaTabela = ref('todos')
const rascunhoDiaTabela = ref('todos')
const filtroAreasTabela = ref([])
const rascunhoAreasTabela = ref([])
const filtroImagemTabela = ref('ambas')
const rascunhoImagemTabela = ref('ambas')
const filtroAnuladasTabela = ref('todas')
const rascunhoAnuladasTabela = ref('todas')
const filtroDificuldadeTabela = ref('todas')
const rascunhoDificuldadeTabela = ref('todas')
const mostrarFiltroTabela = ref(false)
const mostrarMaisAcertos = ref(false)

const carregarDados = async (ano) => {
  carregando.value = true
  erro.value = ''
  try {
    const resposta = await http.get('/metricas/imagens-enem', { params: { ano } })
    dados.value = resposta.data
  } catch (error) {
    dados.value = { questoes: [], estatisticas: [], comparacoes: [] }
    erro.value = error.response?.data?.error || `Não foi possível carregar a análise de imagens do ENEM ${ano}.`
  } finally {
    carregando.value = false
  }
}

watch(() => props.ano, carregarDados, { immediate: true })

const questoes = computed(() => dados.value.questoes ?? [])
const opcoesAreaPresenca = computed(() => opcoesAreaTabelaTodas.filter((opcao) =>
  rascunhoDiaPresenca.value === 'todos' || opcao.dia === rascunhoDiaPresenca.value))
const opcoesAreaTabela = computed(() => opcoesAreaTabelaTodas.filter((opcao) =>
  rascunhoDiaTabela.value === 'todos' || opcao.dia === rascunhoDiaTabela.value))
const opcoesAreaAcertos = computed(() => opcoesAreaTabelaTodas.filter((opcao) =>
  rascunhoDiaAcertos.value === 'todos' || opcao.dia === rascunhoDiaAcertos.value))
const opcoesAreaCaracteres = computed(() => opcoesAreaTabelaTodas.filter((opcao) =>
  rascunhoDiaCaracteres.value === 'todos' || opcao.dia === rascunhoDiaCaracteres.value))
watch(rascunhoDiaPresenca, () => {
  const areasValidas = new Set(opcoesAreaPresenca.value.map((opcao) => opcao.valor))
  rascunhoAreasPresenca.value = rascunhoAreasPresenca.value.filter((area) => areasValidas.has(area))
})
watch(rascunhoDiaTabela, () => {
  const areasValidas = new Set(opcoesAreaTabela.value.map((opcao) => opcao.valor))
  rascunhoAreasTabela.value = rascunhoAreasTabela.value.filter((area) => areasValidas.has(area))
})
watch(rascunhoDiaAcertos, () => {
  const areasValidas = new Set(opcoesAreaAcertos.value.map((opcao) => opcao.valor))
  rascunhoAreasAcertos.value = rascunhoAreasAcertos.value.filter((area) => areasValidas.has(area))
})
watch(rascunhoDiaCaracteres, () => {
  const areasValidas = new Set(opcoesAreaCaracteres.value.map((opcao) => opcao.valor))
  rascunhoAreasCaracteres.value = rascunhoAreasCaracteres.value.filter((area) => areasValidas.has(area))
})
const rotuloArea = (area) => opcoesArea.find((opcao) => opcao.valor === area)?.rotulo ?? area
const rotuloQuestao = (questao) => questao.idioma === 'geral' ? questao.rotulo : `${questao.rotulo} (${questao.idioma})`
const rotuloDificuldade = (dificuldade) => opcoesDificuldade.find((opcao) => opcao.valor === dificuldade)?.rotulo ?? 'Sem classificação'
const formatarNumero = (valor) => Math.round(Number(valor) || 0).toLocaleString('pt-BR')
const formatarPercentual = (valor) => (Number(valor) || 0).toFixed(1).replace('.', ',')
const formatarCorrelacaoMapa = (valor) => Number(valor).toFixed(2)
const formatarPMapa = (valor) => valor === null ? '—' : Number(valor) < 0.001 ? '< 0.001' : Number(valor).toFixed(3)

const alternarFiltroPresenca = () => {
  if (!mostrarFiltroPresenca.value) {
    rascunhoDiaPresenca.value = filtroDiaPresenca.value
    rascunhoAreasPresenca.value = [...filtroAreasPresenca.value]
    rascunhoDificuldadePresenca.value = filtroDificuldadePresenca.value
  }
  mostrarFiltroPresenca.value = !mostrarFiltroPresenca.value
}
const aplicarFiltroPresenca = () => {
  filtroDiaPresenca.value = rascunhoDiaPresenca.value
  filtroAreasPresenca.value = [...rascunhoAreasPresenca.value]
  filtroDificuldadePresenca.value = rascunhoDificuldadePresenca.value
  mostrarFiltroPresenca.value = false
}
const alternarAreaPresenca = (area) => {
  const todasDoDia = opcoesAreaPresenca.value.map((opcao) => opcao.valor)
  const selecionadas = rascunhoAreasPresenca.value.length ? [...rascunhoAreasPresenca.value] : [...todasDoDia]
  rascunhoAreasPresenca.value = selecionadas.includes(area)
    ? selecionadas.filter((item) => item !== area)
    : [...selecionadas, area]
  if (rascunhoAreasPresenca.value.length === todasDoDia.length) rascunhoAreasPresenca.value = []
}
const alternarFiltroCaracteres = () => {
  if (!mostrarFiltroCaracteres.value) {
    rascunhoDiaCaracteres.value = filtroDiaCaracteres.value
    rascunhoAreasCaracteres.value = [...filtroAreasCaracteres.value]
    rascunhoDificuldadeCaracteres.value = filtroDificuldadeCaracteres.value
    rascunhoImagemCaracteres.value = filtroImagemCaracteres.value
  }
  mostrarFiltroCaracteres.value = !mostrarFiltroCaracteres.value
}
const aplicarFiltroCaracteres = () => {
  filtroDiaCaracteres.value = rascunhoDiaCaracteres.value
  filtroAreasCaracteres.value = [...rascunhoAreasCaracteres.value]
  filtroDificuldadeCaracteres.value = rascunhoDificuldadeCaracteres.value
  filtroImagemCaracteres.value = rascunhoImagemCaracteres.value
  mostrarFiltroCaracteres.value = false
}
const alternarAreaCaracteres = (area) => {
  const todasDoDia = opcoesAreaCaracteres.value.map((opcao) => opcao.valor)
  const selecionadas = rascunhoAreasCaracteres.value.length ? [...rascunhoAreasCaracteres.value] : [...todasDoDia]
  rascunhoAreasCaracteres.value = selecionadas.includes(area)
    ? selecionadas.filter((item) => item !== area)
    : [...selecionadas, area]
  if (rascunhoAreasCaracteres.value.length === todasDoDia.length) rascunhoAreasCaracteres.value = []
}
const alternarFiltroAcertos = () => {
  if (!mostrarFiltroAcertos.value) {
    rascunhoDiaAcertos.value = filtroDiaAcertos.value
    rascunhoAreasAcertos.value = [...filtroAreasAcertos.value]
    rascunhoDificuldadeAcertos.value = filtroDificuldadeAcertos.value
    rascunhoImagemAcertos.value = filtroImagemAcertos.value
  }
  mostrarFiltroAcertos.value = !mostrarFiltroAcertos.value
}
const aplicarFiltroAcertos = () => {
  filtroDiaAcertos.value = rascunhoDiaAcertos.value
  filtroAreasAcertos.value = [...rascunhoAreasAcertos.value]
  filtroDificuldadeAcertos.value = rascunhoDificuldadeAcertos.value
  filtroImagemAcertos.value = rascunhoImagemAcertos.value
  mostrarFiltroAcertos.value = false
}
const alternarAreaAcertos = (area) => {
  const todasDoDia = opcoesAreaAcertos.value.map((opcao) => opcao.valor)
  const selecionadas = rascunhoAreasAcertos.value.length ? [...rascunhoAreasAcertos.value] : [...todasDoDia]
  rascunhoAreasAcertos.value = selecionadas.includes(area)
    ? selecionadas.filter((item) => item !== area)
    : [...selecionadas, area]
  if (rascunhoAreasAcertos.value.length === todasDoDia.length) rascunhoAreasAcertos.value = []
}
const alternarFiltroTabela = () => {
  if (!mostrarFiltroTabela.value) {
    rascunhoDiaTabela.value = filtroDiaTabela.value
    rascunhoAreasTabela.value = [...filtroAreasTabela.value]
    rascunhoImagemTabela.value = filtroImagemTabela.value
    rascunhoAnuladasTabela.value = filtroAnuladasTabela.value
    rascunhoDificuldadeTabela.value = filtroDificuldadeTabela.value
  }
  mostrarFiltroTabela.value = !mostrarFiltroTabela.value
}
const aplicarFiltroTabela = () => {
  filtroDiaTabela.value = rascunhoDiaTabela.value
  filtroAreasTabela.value = [...rascunhoAreasTabela.value]
  filtroImagemTabela.value = rascunhoImagemTabela.value
  filtroAnuladasTabela.value = rascunhoAnuladasTabela.value
  filtroDificuldadeTabela.value = rascunhoDificuldadeTabela.value
  mostrarFiltroTabela.value = false
}
const alternarAreaTabela = (area) => {
  const todasDoDia = opcoesAreaTabela.value.map((opcao) => opcao.valor)
  const selecionadas = rascunhoAreasTabela.value.length ? [...rascunhoAreasTabela.value] : [...todasDoDia]
  rascunhoAreasTabela.value = selecionadas.includes(area)
    ? selecionadas.filter((item) => item !== area)
    : [...selecionadas, area]
  if (rascunhoAreasTabela.value.length === todasDoDia.length) rascunhoAreasTabela.value = []
}
const limparFiltrosTabela = () => {
  filtroDiaTabela.value = 'todos'
  filtroAreasTabela.value = []
  filtroImagemTabela.value = 'ambas'
  filtroAnuladasTabela.value = 'todas'
  filtroDificuldadeTabela.value = 'todas'
  rascunhoDiaTabela.value = 'todos'
  rascunhoAreasTabela.value = []
  rascunhoImagemTabela.value = 'ambas'
  rascunhoAnuladasTabela.value = 'todas'
  rascunhoDificuldadeTabela.value = 'todas'
}

const questoesFiltradas = computed(() => questoes.value
  .filter((questao) => filtroDiaPresenca.value === 'todos' || questao.dia === filtroDiaPresenca.value)
  .filter((questao) => !filtroAreasPresenca.value.length || filtroAreasPresenca.value.includes(questao.area))
  .filter((questao) => filtroDificuldadePresenca.value === 'todas' || questao.dificuldade === filtroDificuldadePresenca.value))
const itensComImagem = computed(() => questoesFiltradas.value.filter((questao) => questao.temImagem))
const percentualComImagem = computed(() => questoesFiltradas.value.length
  ? itensComImagem.value.length / questoesFiltradas.value.length * 100
  : 0)
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
const fatias = computed(() => {
  const itens = [
    { chave: 'com', rotulo: 'Com imagem', valor: itensComImagem.value.length, cor: CORES.com },
    { chave: 'sem', rotulo: 'Sem imagem', valor: questoesFiltradas.value.length - itensComImagem.value.length, cor: CORES.sem }
  ]
  let angulo = 0
  return itens.map((item) => {
    const fracao = questoesFiltradas.value.length ? item.valor / questoesFiltradas.value.length : 0
    const inicio = angulo
    angulo += fracao * 360
    return { ...item, percentual: fracao * 100, caminho: caminhoSetor(inicio, angulo) }
  })
})

const areasAcertosSelecionadas = computed(() => {
  const areasDoDia = opcoesAreaTabelaTodas
    .filter((opcao) => filtroDiaAcertos.value === 'todos' || opcao.dia === filtroDiaAcertos.value)
    .map((opcao) => opcao.valor)
  return filtroAreasAcertos.value.length
    ? areasDoDia.filter((area) => filtroAreasAcertos.value.includes(area))
    : areasDoDia
})
const questoesAcertosFiltradas = computed(() => questoes.value
  .filter((questao) => filtroDiaAcertos.value === 'todos' || questao.dia === filtroDiaAcertos.value)
  .filter((questao) => !filtroAreasAcertos.value.length || filtroAreasAcertos.value.includes(questao.area))
  .filter((questao) => filtroDificuldadeAcertos.value === 'todas' || questao.dificuldade === filtroDificuldadeAcertos.value)
  .filter((questao) => filtroImagemAcertos.value === 'ambas'
    || (filtroImagemAcertos.value === 'com' ? questao.temImagem : !questao.temImagem)))
const larguraGrafico = computed(() => Math.max(700, areasAcertosSelecionadas.value.length * 250 + 100))
const escalaYAcerto = (valor) => 340 - (valor / 100) * 270
const marcasAcerto = [0, 25, 50, 75, 100].map((valor) => ({ valor, y: escalaYAcerto(valor) }))
const gruposAcertos = computed(() => {
  const espacamento = (larguraGrafico.value - 100) / areasAcertosSelecionadas.value.length
  return areasAcertosSelecionadas.value.map((area, indice) => {
    const centro = 70 + espacamento * (indice + 0.5)
    const series = [
      { chave: 'com', rotulo: 'Com imagem', temImagem: true, cor: CORES.com },
      { chave: 'sem', rotulo: 'Sem imagem', temImagem: false, cor: CORES.sem }
    ]
    const barras = series.flatMap((item, serieIndice) => {
      const itens = questoesAcertosFiltradas.value.filter((questao) =>
        questao.area === area && questao.temImagem === item.temImagem && questao.percentualAcertos !== null)
      if (!itens.length) return []
      const media = itens.reduce((soma, questao) => soma + Number(questao.percentualAcertos), 0) / itens.length
      const largura = 44
      const gap = 10
      return [{
        key: `${area}-${item.chave}`,
        rotulo: item.rotulo,
        cor: item.cor,
        valor: media,
        n: itens.length,
        largura,
        x: centro - (2 * largura + gap) / 2 + serieIndice * (largura + gap)
      }]
    })
    return { area, rotulo: rotuloArea(area), centro, barras }
  }).filter((grupo) => grupo.barras.length)
})

const questoesCaracteresFiltradas = computed(() => questoes.value
  .filter((questao) => questao.dia === filtroDiaCaracteres.value || filtroDiaCaracteres.value === 'todos')
  .filter((questao) => !filtroAreasCaracteres.value.length || filtroAreasCaracteres.value.includes(questao.area))
  .filter((questao) => filtroDificuldadeCaracteres.value === 'todas' || questao.dificuldade === filtroDificuldadeCaracteres.value)
  .filter((questao) => filtroImagemCaracteres.value === 'ambas'
    || (filtroImagemCaracteres.value === 'com' ? questao.temImagem : !questao.temImagem))
  .filter((questao) => questao.caracteres > 0))
const maiorQuantidadeCaracteres = computed(() => Math.max(1, ...questoesCaracteresFiltradas.value.map((questao) => questao.caracteres)))
const escalaYCaracteres = (valor) => 310 - (valor / maiorQuantidadeCaracteres.value) * 270
const marcasCaracteres = computed(() => [0, 0.25, 0.5, 0.75, 1].map((proporcao) => {
  const valor = maiorQuantidadeCaracteres.value * proporcao
  return { proporcao, valor, y: escalaYCaracteres(valor) }
}))
const quantil = (valores, proporcao) => {
  const posicao = (valores.length - 1) * proporcao
  const inferior = Math.floor(posicao)
  const superior = Math.ceil(posicao)
  return valores[inferior] + (valores[superior] - valores[inferior]) * (posicao - inferior)
}
const gruposCaracteres = computed(() => {
  const grupos = [
    { key: 'com', rotulo: 'Com imagem', temImagem: true, cor: CORES.com, centro: 260 },
    { key: 'sem', rotulo: 'Sem imagem', temImagem: false, cor: CORES.sem, centro: 560 }
  ].map((grupo) => {
    const itens = questoesCaracteresFiltradas.value.filter((questao) => questao.temImagem === grupo.temImagem)
    const valores = itens.map((questao) => questao.caracteres).sort((a, b) => a - b)
    let resumo = null
    if (valores.length) {
      const q1 = quantil(valores, 0.25)
      const mediana = quantil(valores, 0.5)
      const q3 = quantil(valores, 0.75)
      const iqr = q3 - q1
      const dentroDasHastes = valores.filter((valor) => valor >= q1 - 1.5 * iqr && valor <= q3 + 1.5 * iqr)
      resumo = { q1, mediana, q3, minHaste: dentroDasHastes[0], maxHaste: dentroDasHastes[dentroDasHastes.length - 1] }
    }
    return {
      ...grupo,
      resumo,
      pontos: itens.map((questao, indice) => ({
        ...questao,
        chave: `${questao.posicao}-${questao.idioma}`,
        deslocamento: ((indice * 7) % 17 - 8) * 5
      }))
    }
  }).filter((grupo) => grupo.pontos.length)
  return grupos.length === 1 ? [{ ...grupos[0], centro: 410 }] : grupos
})

const areasMapaCorrelacao = [
  { valor: 'LC', rotulo: 'Linguagens e Códigos' },
  { valor: 'CH', rotulo: 'Ciências Humanas' },
  { valor: 'CN', rotulo: 'Ciências da Natureza' },
  { valor: 'MT', rotulo: 'Matemática' }
]
const dificuldadesMapaCorrelacao = [
  { valor: 'facil', rotulo: 'Fácil' },
  { valor: 'media', rotulo: 'Média' },
  { valor: 'dificil', rotulo: 'Difícil' }
]
const tamanhoCelulaMapa = 175
const espacamentoCelulaMapa = 4
const margemMapaEsquerda = 170
const margemMapaTopo = 65
const alturaGradeMapa = dificuldadesMapaCorrelacao.length * tamanhoCelulaMapa - espacamentoCelulaMapa
const barraMapaX = margemMapaEsquerda + areasMapaCorrelacao.length * tamanhoCelulaMapa + 30
const larguraMapaCorrelacao = barraMapaX + 100
const alturaMapaCorrelacao = margemMapaTopo + alturaGradeMapa + 10
const marcasBarraMapa = [
  { valor: 1, rotulo: '1' },
  { valor: 0.5, rotulo: '0.5' },
  { valor: 0, rotulo: '0' },
  { valor: -0.5, rotulo: '-0.5' },
  { valor: -1, rotulo: '-1' }
]
const interpolarCor = (inicio, fim, proporcao) => inicio.map((valor, indice) => Math.round(valor + (fim[indice] - valor) * proporcao))
const rgbPorCorrelacao = (valor) => {
  const limitado = Math.max(-1, Math.min(1, Number(valor)))
  return limitado >= 0
    ? interpolarCor([255, 255, 255], [16, 185, 129], limitado)
    : interpolarCor([255, 255, 255], [0, 112, 192], -limitado)
}
const corTextoHeatmap = (rgb) => {
  const canais = rgb.map((valor) => {
    const canal = valor / 255
    return canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4
  })
  const luminancia = 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2]
  const contrasteBranco = 1.05 / (luminancia + 0.05)
  const contrasteEscuro = (luminancia + 0.05) / 0.05
  return contrasteBranco > contrasteEscuro ? '#FFFFFF' : '#000000'
}
const calcularCorrelacaoPorImagem = (itens) => {
  const n = itens.length
  const temImagem = itens.some((questao) => questao.temImagem)
  const semImagem = itens.some((questao) => !questao.temImagem)
  if (n < 3 || !temImagem || !semImagem) return { n, correlacao: null, p: null }

  const mediaImagem = itens.filter((questao) => questao.temImagem).length / n
  const mediaAcertos = itens.reduce((soma, questao) => soma + questao.percentualAcertos, 0) / n
  let covariancia = 0
  let varianciaImagem = 0
  let varianciaAcertos = 0
  itens.forEach((questao) => {
    const imagem = questao.temImagem ? 1 : 0
    const diferencaImagem = imagem - mediaImagem
    const diferencaAcertos = questao.percentualAcertos - mediaAcertos
    covariancia += diferencaImagem * diferencaAcertos
    varianciaImagem += diferencaImagem ** 2
    varianciaAcertos += diferencaAcertos ** 2
  })
  if (!varianciaAcertos) return { n, correlacao: null, p: null }
  const correlacao = covariancia / Math.sqrt(varianciaImagem * varianciaAcertos)
  return { n, correlacao, p: pValorT(correlacao, n) }
}
const celulasMapaCorrelacao = computed(() => {
  const celulas = dificuldadesMapaCorrelacao.flatMap((dificuldade, indiceDificuldade) =>
    areasMapaCorrelacao.map((area, indiceArea) => {
      const itens = questoes.value.filter((questao) => questao.area === area.valor
        && questao.dificuldade === dificuldade.valor
        && questao.percentualAcertos !== null
        && questao.percentualAcertos !== undefined)
      const resumo = calcularCorrelacaoPorImagem(itens)
      const rgb = resumo.correlacao === null ? [243, 244, 246] : rgbPorCorrelacao(resumo.correlacao)
      return {
        chave: `${dificuldade.valor}-${area.valor}`,
        rotuloDificuldade: dificuldade.rotulo,
        rotuloArea: area.rotulo,
        x: margemMapaEsquerda + indiceArea * tamanhoCelulaMapa,
        y: margemMapaTopo + indiceDificuldade * tamanhoCelulaMapa,
        ...resumo,
        pHolm: null,
        cor: `rgb(${rgb.join(', ')})`,
        corTexto: corTextoHeatmap(rgb)
      }
    }))

  const validas = celulas.filter((celula) => celula.p !== null).sort((a, b) => a.p - b.p)
  let maiorAjustadoAnterior = 0
  validas.forEach((celula, indice) => {
    maiorAjustadoAnterior = Math.max(maiorAjustadoAnterior, Math.min(1, celula.p * (validas.length - indice)))
    celula.pHolm = maiorAjustadoAnterior
  })
  return celulas
})
const quantidadeCorrelacoesValidas = computed(() => celulasMapaCorrelacao.value
  .filter((celula) => celula.p !== null).length)
const quantidadeCorrelacoesSignificativas = computed(() => celulasMapaCorrelacao.value
  .filter((celula) => celula.pHolm !== null && celula.pHolm < 0.05).length)

const questoesTabela = computed(() => questoes.value
  .filter((questao) => filtroDiaTabela.value === 'todos' || questao.dia === filtroDiaTabela.value)
  .filter((questao) => !filtroAreasTabela.value.length || filtroAreasTabela.value.includes(questao.area))
  .filter((questao) => filtroImagemTabela.value === 'ambas'
    || (filtroImagemTabela.value === 'com' ? questao.temImagem : !questao.temImagem))
  .filter((questao) => filtroDificuldadeTabela.value === 'todas'
    || questao.dificuldade === filtroDificuldadeTabela.value)
  .filter((questao) => filtroAnuladasTabela.value === 'todas'
    || (filtroAnuladasTabela.value === 'somente' ? questao.percentualAcertos === null : questao.percentualAcertos !== null))
  .slice()
  .sort((a, b) => a.posicao - b.posicao || a.idioma.localeCompare(b.idioma)))
</script>

<style scoped>
.imagem-enem { margin-top: 1.5rem; }
.imagem-bloco { padding: 1.5rem; background: white; border-radius: 8px; margin: 1.5rem 0; box-shadow: 0 1px 4px rgba(0, 0, 0, .08); }
.imagem-cabecalho { display: flex; align-items: center; gap: .5rem; }
.imagem-cabecalho h3 { margin: 0; color: #263238; font-size: 1.25rem; }
.imagem-subtitulo { margin: .5rem 0 1rem; color: #666; font-size: .9rem; }
.imagem-pizza-conteudo { display: flex; align-items: center; justify-content: center; gap: 2rem; flex-wrap: wrap; }
.imagem-pizza { width: 340px; height: 340px; max-width: 100%; flex-shrink: 0; }
.imagem-legenda { list-style: none; margin: 0; padding: 0; color: #333; font-size: .9rem; }
.imagem-legenda li { display: flex; align-items: center; gap: .5rem; margin: .6rem 0; }
.imagem-legenda i, .imagem-legenda-barras i { display: inline-block; width: 14px; height: 14px; border-radius: 3px; flex-shrink: 0; }
.imagem-cor-com { background: #0070C0; }
.imagem-cor-sem { background: #C4458A; }
.imagem-legenda-barras { display: flex; justify-content: center; gap: 2rem; flex-wrap: wrap; margin: .5rem 0 0; color: #333; }
.imagem-legenda-barras span { display: inline-flex; align-items: center; gap: .5rem; }
.imagem-grafico-caracteres, .imagem-grafico-acertos { display: block; width: 100%; max-width: 100%; height: auto; margin: 0 auto; }
.imagem-correlacao-mapa-scroll { overflow-x: auto; }
.imagem-mapa-correlacao { display: block; width: 100%; min-width: 1000px; max-width: 1000px; height: auto; margin: 0 auto; font-family: Arial, Helvetica, sans-serif; }
.imagem-heatmap-eixo, .imagem-heatmap-barra { font-size: 15px; fill: #000000; }
.imagem-heatmap-valor { font-size: 22px; font-weight: 600; }
.imagem-heatmap-p { font-size: 13px; }
.imagem-heatmap-celula { stroke: #ffffff; }
.imagem-heatmap-significancia circle { fill: #263238; stroke: #ffffff; stroke-width: 1.5; }
.imagem-heatmap-significancia text { fill: #ffffff; font-size: 13px; font-weight: 700; }
.imagem-correlacao-mini-legenda { margin: 0 0 .75rem; color: #475467; font-size: .85rem; line-height: 1.45; }
.imagem-correlacao-leitura { margin: .65rem 0; color: #475467; font-size: .9rem; line-height: 1.5; }
.imagem-grade { stroke: #e4e7ec; stroke-width: 1; }
.imagem-eixo, .imagem-categoria { fill: #333; font-size: 13px; }
.imagem-valor { fill: #333; font-size: 12px; font-weight: 600; }
.imagem-tabela-scroll { max-height: 520px; overflow: auto; border: 1px solid #e0e0e0; border-radius: 8px; }
.imagem-tabela { width: 100%; border-collapse: collapse; text-align: left; font-size: .9rem; }
.imagem-tabela th, .imagem-tabela td { padding: .7rem .85rem; border-bottom: 1px solid #eaecf0; white-space: nowrap; }
.imagem-tabela thead th { position: sticky; top: 0; z-index: 1; background: #f8fafc; color: #475467; font-size: .8rem; }
.imagem-tabela tbody th { color: #263238; font-weight: 600; }
.imagem-selo { display: inline-flex; padding: .25rem .55rem; border-radius: 999px; font-size: .8rem; font-weight: 600; }
.selo-com-imagem { background: #e6f0fa; color: #0065a8; }
.selo-sem-imagem { background: #FCE7F3; color: #9D174D; }
.imagem-vazio, .imagem-status { padding: 1rem; border-radius: 6px; background: #f8fafc; color: #475467; }
.imagem-erro { border-left: 4px solid #EF4444; background: #fff1f0; color: #912018; }
.imagem-notas { margin-top: 1rem; color: #555; font-size: .88rem; line-height: 1.5; }
.imagem-notas ul { padding-left: 1.3rem; }
.imagem-notas p + p { margin-top: .65rem; }
.imagem-notas li + li { margin-top: .35rem; }
.botao-mais-info { margin: 1rem 0 0; }
.filter-wrapper { position: relative; display: inline-block; margin-left: auto; }
.filter-btn { display: flex; align-items: center; gap: .5rem; padding: .45rem .8rem; border: 2px solid #0070C0; border-radius: 6px; background: white; color: #0070C0; cursor: pointer; font-weight: 600; white-space: nowrap; }
.filter-menu { position: absolute; top: calc(100% + .5rem); right: 0; z-index: 10; min-width: 230px; padding: .75rem; border: 1px solid #e0e0e0; border-radius: 8px; background: white; box-shadow: 0 10px 30px rgba(0, 0, 0, .15); }
.filter-secao + .filter-secao { margin-top: .75rem; padding-top: .75rem; border-top: 1px solid #e0e0e0; }
.filter-lista { max-height: 4.5rem; overflow-y: auto; }
.filter-lista > .filter-option { box-sizing: border-box; height: 2.25rem; padding: 0 .5rem; }
.filter-titulo { margin: .25rem .5rem; color: #667085; font-size: .75rem; font-weight: 700; }
.filter-ajuda { display: block; padding: 0 .5rem .4rem; color: #667085; font-size: .75rem; }
.filter-option { display: flex; align-items: center; padding: .55rem .5rem; border-radius: 4px; }
.filter-option:hover { background: #f5f5f5; }
.filter-option input { margin: 0 .6rem 0 0; accent-color: #0070C0; }
.filter-option label { flex: 1; color: #333; font-size: .9rem; cursor: pointer; }
.filter-rodape { display: flex; justify-content: flex-end; margin-top: .5rem; padding-top: .75rem; border-top: 1px solid #e0e0e0; }
.filter-aplicar { padding: .5rem 1rem; border: none; border-radius: 6px; background: #0070C0; color: white; cursor: pointer; font-weight: 600; }
.imagem-vazio p { margin-top: 0; }
@media (max-width: 600px) {
  .imagem-bloco { padding: 1rem; }
  .imagem-cabecalho { align-items: flex-start; flex-wrap: wrap; }
  .filter-wrapper { margin-left: auto; }
  .imagem-tabela { min-width: 700px; }
}
</style>
