import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FileUpload from '../components/FileUpload.vue'

const DEZ_MB = 10 * 1024 * 1024

const criarArquivo = (nome: string, tipo: string, tamanho: number) => {
  const arquivo = new File(['x'], nome, { type: tipo })
  Object.defineProperty(arquivo, 'size', { value: tamanho })
  return arquivo
}

const selecionarArquivo = async (wrapper: ReturnType<typeof mount>, arquivo: File) => {
  const input = wrapper.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [arquivo], configurable: true })
  await input.trigger('change')
}

const arrastarArquivo = async (wrapper: ReturnType<typeof mount>, arquivo: File) => {
  const area = wrapper.find('.upload-area')
  await area.trigger('drop', { dataTransfer: { files: [arquivo] } })
}

describe('FileUpload - limite de tamanho de 10 MB', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('aceita PDF dentro do limite pela seleção', async () => {
    const wrapper = mount(FileUpload)
    await selecionarArquivo(wrapper, criarArquivo('prova.pdf', 'application/pdf', DEZ_MB))
    expect(wrapper.emitted('file-selected')).toBeTruthy()
    expect(wrapper.find('.error-section').exists()).toBe(false)
  })

  it('recusa PDF acima de 10 MB pela seleção com mensagem de tamanho', async () => {
    const wrapper = mount(FileUpload)
    await selecionarArquivo(wrapper, criarArquivo('grande.pdf', 'application/pdf', DEZ_MB + 1))
    expect(wrapper.emitted('file-selected')).toBeFalsy()
    expect(wrapper.find('.error-section').exists()).toBe(true)
    expect(wrapper.find('.error-box h3').text()).toBe('Arquivo muito grande')
    expect(wrapper.text()).toContain('grande.pdf')
  })

  it('recusa PDF acima de 10 MB ao arrastar com a mesma mensagem', async () => {
    const wrapper = mount(FileUpload)
    await arrastarArquivo(wrapper, criarArquivo('arrastado.pdf', 'application/pdf', DEZ_MB + 1))
    expect(wrapper.emitted('file-selected')).toBeFalsy()
    expect(wrapper.find('.error-box h3').text()).toBe('Arquivo muito grande')
    expect(wrapper.text()).toContain('arrastado.pdf')
  })

  it('mantém a mensagem de formato para arquivo que não é PDF', async () => {
    const wrapper = mount(FileUpload)
    await arrastarArquivo(wrapper, criarArquivo('foto.jpeg', 'image/jpeg', 1000))
    expect(wrapper.emitted('file-selected')).toBeFalsy()
    expect(wrapper.find('.error-box h3').text()).toBe('Formato Inválido')
  })

  it('ao clicar em Tentar novamente fecha o erro e abre o seletor de arquivos', async () => {
    const wrapper = mount(FileUpload)
    await arrastarArquivo(wrapper, criarArquivo('grande.pdf', 'application/pdf', DEZ_MB + 1))
    const input = wrapper.find('input[type="file"]').element as HTMLInputElement
    const clique = vi.spyOn(input, 'click').mockImplementation(() => {})
    await wrapper.find('.error-section button').trigger('click')
    expect(wrapper.find('.error-section').exists()).toBe(false)
    expect(clique).toHaveBeenCalled()
  })
})
