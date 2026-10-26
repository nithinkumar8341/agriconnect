import { expect, test } from '@playwright/test';

// The core flow end to end on a phone-sized screen, with the demo data:
// farmer Ramu lists tomatoes (crop tile, price, own photo) -> buyer Padma (16 km away, inside his
// radius) orders them with cash on delivery -> Ramu accepts -> Padma sees "Accepted" and her
// delivery code.
// A random price makes this run's listing easy to find among earlier ones.
const price = 20 + Math.floor(Math.random() * 70);
const OTP = '123456';

async function login(page, phone) {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('agc.language', 'en'));
  await page.goto('/login');
  await page.locator('input[type=tel]').fill(phone);
  await page.locator('button[type=submit]').click();
  await page.locator('input[autocomplete=one-time-code]').fill(OTP);
}

test('farmer lists, buyer orders, farmer accepts, buyer sees the update', async ({ browser }) => {
  const farmer = await (await browser.newContext()).newPage();
  const buyer = await (await browser.newContext()).newPage();

  // 1. Farmer lists tomatoes in three screens.
  await login(farmer, '9999900011');
  await farmer.waitForURL('**/farmer');
  await farmer.goto('/farmer/sell');
  await farmer
    .getByRole('button', { name: /^Tomato/ })
    .first()
    .click();
  await farmer.getByLabel('Or type the price (₹)').fill(String(price));
  await farmer.getByRole('button', { name: 'Next' }).click();
  await farmer
    .locator('input[type=file]:not([capture])')
    .setInputFiles('e2e/fixtures/tomatoes.jpg');
  await expect(farmer.getByText('Uploaded')).toBeVisible({ timeout: 30_000 });
  await farmer.getByRole('button', { name: 'Publish listing' }).click();
  await expect(farmer.getByText('Your listing is live')).toBeVisible();

  // 2. Buyer finds it nearby and orders 5 kg (above Ramu's ₹100 minimum) with cash on delivery.
  await login(buyer, '9999900021');
  await buyer.waitForURL('**/buyer');
  await buyer
    .getByRole('article')
    .filter({ hasText: 'Tomato' })
    .filter({ hasText: `₹${price}/kg` })
    .first()
    .getByRole('link')
    .click();
  for (let i = 0; i < 4; i += 1) {
    await buyer.getByRole('button', { name: /Increase How much/ }).click();
  }
  await buyer.getByRole('button', { name: 'Add to cart' }).click();
  await buyer.goto('/buyer/cart');
  await buyer.getByRole('button', { name: 'Place order' }).click();
  await buyer.waitForURL('**/buyer/orders');
  await expect(buyer.getByText('Waiting for farmer').first()).toBeVisible();

  // 3. Farmer accepts the new order.
  await farmer.goto('/farmer/orders');
  await farmer.locator('a[href^="/farmer/orders/"]').first().click();
  await farmer.getByRole('button', { name: 'Accept order' }).click();
  await expect(farmer.getByText('Order accepted.')).toBeVisible();
  const orderId = farmer.url().split('/').pop();

  // 4. Buyer opens the same order (the demo data has older ones) and sees the code.
  await buyer.goto(`/buyer/orders/${orderId}`);
  await expect(buyer.getByRole('status').filter({ hasText: 'Accepted' })).toBeVisible({
    timeout: 20_000,
  });
  await expect(buyer.getByText('Your delivery code')).toBeVisible();
});
