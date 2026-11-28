// Drives the 4-step sign-up (MV-D2) in a Playwright page for the older live matrices, which used to fill the one-page form.
// The code is read from the mailbox of the run: MAIL_URL is `GET <url>?to=<address>` -> `{ text }` (the stand-in that
// `registro-backend-local.mjs` serves as /__test/mail). Without it a run against a real gateway cannot read the e-mail: say so
// instead of guessing. The full contract of the steps is checked by `registro-4-pasos.mjs`; this helper only gets an account made.
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function readCode(address, mailUrl = process.env.MAIL_URL) {
  if (!mailUrl) throw new Error("Set MAIL_URL (GET <url>?to=<address> -> { text }) so the code of the e-mail can be read");
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const answer = await fetch(`${mailUrl}?to=${encodeURIComponent(address)}`);
    if (answer.ok) { const found = /(\d{6})/.exec((await answer.json()).text ?? ""); if (found) return found[1]; }
    await sleep(250);
  }
  throw new Error(`no code mail for ${address}`);
}

/** Opens /registro, proves the e-mail and fills steps 2 and 3. `stopAtPassword` leaves the person on step 4. Returns once step 4 is shown (or the account was created). */
export async function registerThroughSteps(page, { app, email, password, role = "HOST", organization = "", stopAtPassword = false, signOutFirst = false }) {
  void signOutFirst;
  await page.goto(`${app}/registro`);
  await page.getByTestId("register-email").waitFor();
  await page.getByTestId("register-email").fill(email);
  await page.getByTestId("register-next").click();
  await page.getByTestId("register-code").waitFor();
  await page.getByTestId("register-code").fill(await readCode(email));
  await page.getByTestId("register-next").click();
  await page.getByTestId("register-givenName").waitFor();
  await page.getByTestId(`register-role-${role}`).click();
  if (organization) await page.getByTestId("register-organizationName").fill(organization);
  await page.getByTestId("register-givenName").fill("Ana"); await page.getByTestId("register-familyName").fill("Rojas");
  await page.getByTestId("register-next").click();
  await page.getByTestId("register-phone").waitFor();
  await page.getByTestId("register-phone").fill("+591 71234567");
  await page.getByTestId("register-next").click();
  await page.getByTestId("register-password").waitFor();
  await page.getByTestId("register-password").fill(password);
  if (stopAtPassword) return;
  await page.getByRole("checkbox", { name: /Acepto los Términos/ }).click();
  await page.getByTestId("register-submit").click();
}
