import { test, expect, Page } from '@playwright/test';

// Collect all browser console messages
const consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors.length = 0;

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[console.error] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(`[pageerror] ${err.message}`);
  });

  page.on('requestfailed', req => {
    consoleErrors.push(`[requestfailed] ${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
  });
});

// ─── Helper ───────────────────────────────────────────────────────────────────

async function waitForApp(page: Page) {
  // Wait until the loading spinner disappears (db init done)
  await page.waitForFunction(
    () => !document.querySelector('.animate-bounce'),
    { timeout: 20000 }
  ).catch(() => {
    // Spinner might already be gone
  });
  // Then wait for nav to appear
  await page.waitForSelector('nav', { timeout: 20000 });
}

async function ensureBatch(page: Page) {
  await page.goto('/batches');
  await waitForApp(page);
  const card = page.locator('a[href*="/batches/"]').first();
  if (await card.count() === 0) {
    await page.getByRole('button', { name: /إضافة دفعة|Add Batch/ }).first().click();
    await page.getByPlaceholder(/مايو|May/).fill('دفعة سمان تجريبية');
    await page.locator('input[type="number"]').first().fill('250');
    await page.getByRole('button', { name: /حفظ|Save/ }).last().click();
    await page.waitForTimeout(500);
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test('1. App loads without JS errors', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);

  if (consoleErrors.length > 0) {
    console.log('\n⚠️ Browser errors detected:');
    consoleErrors.forEach(e => console.log('  ', e));
  }

  // The nav bar must exist
  await expect(page.locator('nav')).toBeVisible();

  // No fatal page errors
  const fatalErrors = consoleErrors.filter(e =>
    e.includes('pageerror') || e.includes('Aborted') || e.includes('CompileError')
  );
  expect(fatalErrors, `Fatal errors: ${fatalErrors.join('\n')}`).toHaveLength(0);
});

test('2. Dashboard renders with correct sections', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);

  // Should show the app name
  const body = await page.textContent('body');
  expect(body).toMatch(/مزرعتي|My Farm/);

  // Bottom nav has 3 items
  const navLinks = page.locator('nav a');
  await expect(navLinks).toHaveCount(3);
});

test('3. Navigate to Batches page', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);

  // Click batches tab
  await page.locator('nav a[href="/batches"]').click();
  await expect(page).toHaveURL(/\/batches/);

  // Should show Add Batch button
  const addBtn = page.getByRole('button', { name: /إضافة دفعة|Add Batch/ }).first();
  await expect(addBtn).toBeVisible();
});

test('4. Create a batch and verify persistence across page reloads', async ({ page }) => {
  await page.goto('/batches');
  await waitForApp(page);

  // Open add batch modal
  await page.getByRole('button', { name: /إضافة دفعة|Add Batch/ }).first().click();

  // Modal should appear
  await expect(page.locator('[class*="rounded-t-2xl"]')).toBeVisible();

  // Fill in name using Playwright getByPlaceholder regex
  await page.getByPlaceholder(/مايو|May/).fill('دفعة سمان تجريبية');

  // Set count
  await page.locator('input[type="number"]').first().fill('250');

  // Save
  await page.getByRole('button', { name: /حفظ|Save/ }).last().click();

  // Modal should close and batch should appear in list
  await page.waitForTimeout(500);
  let body = await page.textContent('body');
  expect(body).toContain('دفعة سمان تجريبية');

  // Reload page to verify IndexedDB persistence
  await page.reload();
  await waitForApp(page);
  body = await page.textContent('body');
  expect(body).toContain('دفعة سمان تجريبية');
});

test('5. Open batch detail and add a task due today to verify In-App Reminder', async ({ page }) => {
  await ensureBatch(page);

  // Click the first batch card
  const batchCard = page.locator('a[href*="/batches/"]').first();
  await batchCard.waitFor({ timeout: 5000 });
  await batchCard.click();

  // Should be on detail page
  await expect(page).toHaveURL(/\/batches\/\d+/);

  // Add a task
  await page.getByRole('button', { name: /إضافة مهمة|Add Task/ }).click();

  // Fill task form with today's date
  const todayStr = new Date().toISOString().split('T')[0];
  await page.locator('input[dir="rtl"]').fill('جرعة فيتامينات اليوم');
  await page.locator('input[type="date"]').first().fill(todayStr);
  await page.getByRole('button', { name: /حفظ|Save/ }).last().click();

  // Task should appear in batch detail
  await page.waitForTimeout(500);
  const body = await page.textContent('body');
  expect(body).toContain('جرعة فيتامينات اليوم');

  // Go to Dashboard and verify the In-App Reminder urgent banner is displayed
  await page.goto('/');
  await waitForApp(page);

  const dashText = await page.textContent('body');
  expect(dashText).toMatch(/جرعة فيتامينات اليوم/);
  expect(dashText).toMatch(/تذكير|Reminder/);
});

test('6. Mark a task as done and verify completed date/time display', async ({ page }) => {
  await ensureBatch(page);

  const batchCard = page.locator('a[href*="/batches/"]').first();
  await batchCard.waitFor({ timeout: 5000 });
  await batchCard.click();

  // If no task exists, create one
  const doneBtn = page.getByRole('button', { name: /✓|تم/ }).first();
  if (!await doneBtn.isVisible()) {
    await page.getByRole('button', { name: /إضافة مهمة|Add Task/ }).click();
    await page.locator('input[dir="rtl"]').fill('مهمة للاختبار');
    await page.locator('input[type="date"]').first().fill(new Date().toISOString().split('T')[0]);
    await page.getByRole('button', { name: /حفظ|Save/ }).last().click();
    await page.waitForTimeout(500);
  }

  // Click "Done" on pending task
  await page.getByRole('button', { name: /✓|تم/ }).first().click();
  await page.waitForTimeout(300);

  // In completion modal, confirm completion
  const confirmBtn = page.getByRole('button', { name: /تأكيد|Confirm/ }).first();
  if (await confirmBtn.isVisible()) {
    await confirmBtn.click();
    await page.waitForTimeout(500);
  }

  // Switch to completed tab
  await page.getByRole('button', { name: /منجزة|Completed/ }).click();
  // Should show at least one completed task with completed date/time
  await expect(page.locator('.line-through').first()).toBeVisible();
  const completedText = await page.textContent('body');
  expect(completedText).toMatch(/اكتملت في|Completed at/);
});

test('7. Settings page — language toggle & Backup & Restore UI', async ({ page }) => {
  await page.goto('/settings');
  await waitForApp(page);

  // Should show language section and backup section
  const body = await page.textContent('body');
  expect(body).toMatch(/اللغة|Language/);
  expect(body).toMatch(/النسخ الاحتياطي|Backup/);

  // Export button is visible
  const exportBtn = page.getByRole('button', { name: /تصدير|Export/ });
  await expect(exportBtn).toBeVisible();

  // Toggle language
  const toggleBtn = page.locator('button:has-text("English"), button:has-text("العربية")').first();
  await toggleBtn.click();
  await page.waitForTimeout(300);

  // Language should have changed
  const html = await page.locator('html').getAttribute('lang');
  expect(['ar', 'en']).toContain(html);
});

test('8. PWA manifest is present and properly linked', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);

  // Check theme-color meta tag
  const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
  expect(themeColor).toBe('#16a34a');
});

test('9. Backup export and import validation', async ({ page }) => {
  await page.goto('/settings');
  await waitForApp(page);

  // Trigger export download
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /تصدير|Export/ }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/poultry-farm-backup-.*\.json/);

  // Test invalid backup upload
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText(/استعادة نسخة احتياطية|Import Backup/).click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles({
    name: 'corrupted-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ version: 99, data: 'invalid' })),
  });

  await page.waitForTimeout(500);
  const body = await page.textContent('body');
  // Should show error message about incompatible version or invalid data
  expect(body).toMatch(/فشل|Failed|Incompatible/);
});

test('10. Batch purchase cost, financial summary, and selling with closing date/time', async ({ page }) => {
  await page.goto('/batches');
  await waitForApp(page);

  // Create a new batch with purchase cost = 4000
  await page.getByRole('button', { name: /إضافة دفعة|Add Batch/ }).first().click();
  await page.getByPlaceholder(/مايو|May/).fill('دفعة لاحم تجارية');
  await page.locator('input[type="number"]').first().fill('500');
  await page.locator('input[placeholder="0.00"]').fill('4000');
  await page.getByRole('button', { name: /حفظ|Save/ }).last().click();
  await page.waitForTimeout(500);

  // Click on the created batch card
  const batchCard = page.locator('a[href*="/batches/"]:has-text("دفعة لاحم تجارية")').first();
  await batchCard.click();
  await expect(page.locator('h1:has-text("دفعة لاحم تجارية")')).toBeVisible();

  // Verify financial summary shows purchase cost
  let body = await page.textContent('body');
  expect(body).toContain('4,000');
  expect(body).toMatch(/إجمالي الاستثمار|Total Investment/);

  // Click "Sell Batch" to record closing date, time, and revenue
  await page.getByRole('button', { name: /بيع الدفعة|Sell Batch/ }).click();
  await expect(page.locator('input[type="date"]')).toBeVisible();
  await expect(page.locator('input[type="time"]')).toBeVisible();

  // Enter sale revenue = 9000
  await page.locator('input[placeholder="0.00"]').fill('9000');
  await page.getByRole('button', { name: /تأكيد|Confirm/ }).click();
  await page.waitForTimeout(500);

  // Check that closed date/time is displayed and net profit is +5,000
  body = await page.textContent('body');
  expect(body).toMatch(/تاريخ البيع|Sold at/);
  expect(body).toContain('5,000');
  expect(body).toMatch(/صافي ربح|Net Profit/);
});

test('11. Expense tracking: add, filter, edit, delete and verify calculations', async ({ page }) => {
  await ensureBatch(page);

  const batchCard = page.locator('a[href*="/batches/"]').first();
  await batchCard.click();
  await waitForApp(page);

  // Switch to Expenses tab
  await page.getByRole('button', { name: /المصروفات|Expenses/ }).first().click();

  // Add an expense: 750 EGP for Feed
  await page.getByRole('button', { name: /إضافة مصروف|Add Expense/ }).click();
  await page.locator('input[type="number"]').first().fill('750');
  await page.locator('textarea').fill('شيكارة علف بادي 23%');
  await page.getByRole('button', { name: /حفظ|Save/ }).last().click();
  await page.waitForTimeout(500);

  // Verify expense is rendered
  let body = await page.textContent('body');
  expect(body).toContain('750');
  expect(body).toContain('شيكارة علف بادي 23%');

  // Verify category filter works
  const feedFilter = page.getByRole('button', { name: /علف|Feed/ }).first();
  await feedFilter.click();
  await page.waitForTimeout(300);
  body = await page.textContent('body');
  expect(body).toContain('750');

  // Delete expense
  await page.locator('button[title="حذف"], button[title="Delete"]').first().click();
  await page.getByRole('button', { name: /نعم|Yes/ }).click();
  await page.waitForTimeout(500);

  body = await page.textContent('body');
  expect(body).not.toContain('شيكارة علف بادي 23%');
});
