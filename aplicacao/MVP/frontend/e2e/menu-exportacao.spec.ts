import { test, expect } from '@playwright/test'

// Abre a página ENEM, escolhe 2025 e confere o menu de exportação com os ícones coloridos
test('menu de exportação mostra os ícones PDF, XLS e CSV', async ({ page }) => {
  const erros: string[] = []
  page.on('pageerror', (erro) => erros.push(erro.message))

  await page.goto('/enem')
  await page.getByText('2025', { exact: true }).first().click()
  await page.getByRole('button', { name: /Exportar/ }).click()

  const menu = page.locator('.menu-exportar')
  await expect(menu.getByRole('menuitem', { name: /Excel/ })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: /PDF/ })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: /CSV/ })).toBeVisible()
  expect(erros).toEqual([])
})
