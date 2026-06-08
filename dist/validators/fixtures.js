export const checkoutWithUxIssues = `
<main>
  <section class="checkout-hero">
    <h1>Complete checkout</h1>
    <h3>Payment details</h3>
    <button class="btn-primary">Continue</button>
    <button className="primary">Pay now</button>
  </section>
  <form>
    <input name="email" type="email" />
    <button class="btn-primary">Submit order</button>
  </form>
  <style>
    .checkout-hero { color: #111111; background: rgba(255, 255, 255, 0.92); }
  </style>
</main>
`;
export const checkoutWithStrongStructure = `
<header>
  <nav aria-label="Checkout">
    <a href="/cart">Cart</a>
  </nav>
</header>
<main>
  <section>
    <h1>Complete checkout</h1>
    <h2>Payment details</h2>
    <form>
      <label for="email">Email</label>
      <input id="email" name="email" type="email" aria-invalid="true" aria-describedby="email-error" />
      <p id="email-error" role="alert">Enter a valid email address.</p>
      <button class="btn-primary">Submit order</button>
    </form>
  </section>
</main>
`;
