import html2canvas from 'html2canvas'

// Raízes dos cartões de correlação, na ordem em que aparecem na página
const SELETORES_CARTOES = [
  '.correlacoes-tempo',
  '.correlacao-dificuldade-mapa',
  '.metades-caracteres',
  '.dispersao-itens'
]

// Fotografa cada cartão de correlação como está na tela: o filtro, a página do paginador
// e o menu aberto ou fechado valem como estão naquele momento. Cartões que não estão na
// página (análise do tamanho das questões desligada) não são capturados.
// A imagem é o cartão inteiro, com o mesmo padding interno da tela, e a largura em px
// da tela é guardada para que o PDF use a mesma proporção.
const ESCALA_CAPTURA = 2

export async function capturarCartoesCorrelacao() {
  const cartoes = []
  for (const seletor of SELETORES_CARTOES) {
    const elemento = document.querySelector(seletor)
    if (!elemento) continue
    const canvasCompleto = await html2canvas(elemento, {
      scale: ESCALA_CAPTURA,
      backgroundColor: '#ffffff',
      logging: false,
      width: elemento.offsetWidth,
      height: elemento.offsetHeight,
      windowWidth: document.documentElement.offsetWidth,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      // No clone, o cartão volta a ocupar a largura inteira, sem deslocamento
      onclone: (documento) => {
        const clone = documento.querySelector(seletor)
        if (clone) {
          clone.style.transform = 'none'
          clone.style.marginLeft = '0'
          clone.style.marginRight = '0'
        }
      }
    })
    cartoes.push({
      titulo: elemento.querySelector('h3')?.textContent?.trim() ?? '',
      dataUrl: canvasCompleto.toDataURL('image/png'),
      larguraTela: canvasCompleto.width / ESCALA_CAPTURA,
      alturaTela: canvasCompleto.height / ESCALA_CAPTURA,
      larguraCartao: elemento.offsetWidth
    })
  }
  return cartoes
}
