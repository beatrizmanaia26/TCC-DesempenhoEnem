import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FileUpload from '../components/FileUpload.vue'
import { useAnalysisStore } from '../stores/analysisStore'

const criarPdf = (nome: string, tamanho = 10) =>
  new File(['x'.repeat(tamanho)], nome, { type: 'application/pdf' })

const enviarArquivo = async (wrapper: ReturnType<typeof mount>, arquivo: File) => {
  const input = wrapper.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [arquivo], configurable: true })
  await input.trigger('change')
}

describe('FileUpload - arquivo com mesmo nome', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('aceita o primeiro arquivo sem abrir o modal de sobreposição', async () => {
    const wrapper = mount(FileUpload)
    await enviarArquivo(wrapper, criarPdf('prova.pdf'))

    expect(wrapper.find('dialog.modal-content').exists()).toBe(false)
    expect(wrapper.find('.file-name').text()).toContain('prova.pdf')
    expect(wrapper.emitted('file-selected')).toHaveLength(1)
  })

  it('abre o modal de sobreposição ao enviar arquivo com mesmo nome', async () => {
    const wrapper = mount(FileUpload)
    await enviarArquivo(wrapper, criarPdf('prova.pdf'))
    await enviarArquivo(wrapper, criarPdf('prova.pdf', 50))

    const modal = wrapper.find('dialog.modal-content')
    expect(modal.exists()).toBe(true)
    expect(modal.text()).toContain('Deseja sobrepor o material existente?')
    expect(modal.text()).toContain('prova.pdf')
  })

  it('mantém o arquivo atual ao cancelar a sobreposição', async () => {
    const wrapper = mount(FileUpload)
    await enviarArquivo(wrapper, criarPdf('prova.pdf', 10))
    await enviarArquivo(wrapper, criarPdf('prova.pdf', 50))

    const botoes = wrapper.findAll('.modal-footer button')
    await botoes[0].trigger('click')

    expect(wrapper.find('dialog.modal-content').exists()).toBe(false)
    expect(wrapper.emitted('file-selected')).toHaveLength(1)
    expect(wrapper.find('.file-size').text()).toContain('10 Bytes')
  })

  it('substitui o arquivo ao confirmar a sobreposição', async () => {
    const wrapper = mount(FileUpload)
    await enviarArquivo(wrapper, criarPdf('prova.pdf', 10))
    await enviarArquivo(wrapper, criarPdf('prova.pdf', 50))

    const botoes = wrapper.findAll('.modal-footer button')
    await botoes[1].trigger('click')

    expect(wrapper.find('dialog.modal-content').exists()).toBe(false)
    const emitidos = wrapper.emitted('file-selected') as File[][]
    expect(emitidos).toHaveLength(2)
    expect(emitidos[1][0].size).toBe(50)
    expect(wrapper.find('.file-size').text()).toContain('50 Bytes')
  })

  it('não abre o modal quando o nome é diferente', async () => {
    const wrapper = mount(FileUpload)
    await enviarArquivo(wrapper, criarPdf('prova-2023.pdf'))
    await enviarArquivo(wrapper, criarPdf('prova-2024.pdf'))

    expect(wrapper.find('dialog.modal-content').exists()).toBe(false)
    expect(wrapper.find('.file-name').text()).toContain('prova-2024.pdf')
  })
})
