import { test, expect } from '@playwright/test'

// Exporta o Excel pelo menu da página ENEM e confere que o arquivo baixado é um .xlsx válido
test('exporta o Excel pelo menu e baixa um arquivo .xlsx', async ({ page }, testInfo) => {
  const erros: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') erros.push(msg.text())
  })
  page.on('pageerror', (erro) => erros.push(`pageerror: ${erro.message}`))
  page.on('dialog', async (dialogo) => {
    erros.push(`alert: ${dialogo.message()}`)
    await dialogo.dismiss()
  })

  await page.goto('/enem')
  await page.getByText('2025', { exact: true }).first().click()
  await page.getByRole('button', { name: /Exportar/ }).click()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: /Excel/ }).click()
  ])

  // Arquivo dentro da pasta de saída deste teste (isolada e removida pelo Playwright)
  const caminho = testInfo.outputPath(download.suggestedFilename())
  await download.saveAs(caminho)

  expect(download.suggestedFilename()).toMatch(/\.xlsx$/)
  expect(erros).toEqual([])
})
