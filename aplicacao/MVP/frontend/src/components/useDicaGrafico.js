import { nextTick, onBeforeUnmount, onMounted, reactive, ref, useId } from 'vue'

export function useDicaGrafico() {
  const tooltipId = useId()
  const tooltipElemento = ref(null)
  const flutuante = reactive({ visivel: false, texto: '', x: 0, y: 0 })
  let ancora = { x: 0, y: 0 }
  function posicionarDica() {
    const el = tooltipElemento.value
    const largura = el?.getBoundingClientRect().width || 290
    const altura = el?.getBoundingClientRect().height || 130
    const margem = 8,
      deslocamento = 14
    let x = ancora.x + deslocamento,
      y = ancora.y + deslocamento
    if (x + largura > window.innerWidth - margem) x = ancora.x - largura - deslocamento
    if (y + altura > window.innerHeight - margem) y = ancora.y - altura - deslocamento
    flutuante.x = Math.max(margem, Math.min(x, window.innerWidth - largura - margem))
    flutuante.y = Math.max(margem, Math.min(y, window.innerHeight - altura - margem))
  }
  async function mostrarDica(evento, texto) {
    if (evento.type === 'focus') {
      const rect = evento.currentTarget.getBoundingClientRect()
      ancora = { x: rect.right, y: rect.bottom }
    } else ancora = { x: evento.clientX, y: evento.clientY }
    flutuante.texto = texto.split(' · ').join('\n')
    flutuante.visivel = true
    posicionarDica()
    await nextTick()
    if (flutuante.visivel) posicionarDica()
  }
  function moverDica(evento) {
    if (flutuante.visivel) {
      ancora = { x: evento.clientX, y: evento.clientY }
      posicionarDica()
    }
  }
  function ocultarDica() {
    flutuante.visivel = false
  }
  onMounted(() => {
    window.addEventListener('scroll', ocultarDica, true)
    window.addEventListener('resize', ocultarDica)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('scroll', ocultarDica, true)
    window.removeEventListener('resize', ocultarDica)
  })

  return { tooltipId, tooltipElemento, flutuante, mostrarDica, moverDica, ocultarDica }
}
