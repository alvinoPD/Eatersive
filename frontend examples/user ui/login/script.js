const passwordInput = document.querySelector("#password");
const passwordToggle = document.querySelector("#toggle-password");
const formMessage = document.querySelector("#form-message");

passwordToggle.addEventListener("click", () => {
  const shouldShowPassword = passwordInput.type === "password";
  passwordInput.type = shouldShowPassword ? "text" : "password";
  passwordToggle.setAttribute("aria-pressed", String(shouldShowPassword));
  passwordToggle.setAttribute(
    "aria-label",
    shouldShowPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi",
  );
});

document.querySelector("#login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  formMessage.textContent =
    "Tampilan login siap digunakan. Hubungkan form ini ke backend untuk masuk.";
});

document.querySelector("#forgot-password").addEventListener("click", () => {
  formMessage.textContent =
    "Fitur reset kata sandi belum terhubung. Silakan hubungi dukungan EaterSive.";
});

document.querySelectorAll("[data-provider]").forEach((button) => {
  button.addEventListener("click", () => {
    formMessage.textContent = `Login dengan ${button.dataset.provider} belum terhubung.`;
  });
});
