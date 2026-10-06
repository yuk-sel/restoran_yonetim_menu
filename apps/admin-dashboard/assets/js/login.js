// Giriş sayfası — POST /api/auth/login
(function () {
  const form = document.getElementById("login-form");
  const err = document.getElementById("error-message");
  const btn = document.getElementById("submitBtn");
  const pw = document.getElementById("password");

  // Zaten giriş yapılmışsa panele geç
  if (Auth.token) { location.replace("index.html"); return; }

  if (new URLSearchParams(location.search).get("expired")) showError("Oturumunuzun süresi doldu. Tekrar giriş yapın.");

  function showError(msg) { err.textContent = msg; err.hidden = !msg; }

  document.getElementById("pwToggle").addEventListener("click", (e) => {
    const show = pw.type === "password";
    pw.type = show ? "text" : "password";
    e.currentTarget.textContent = show ? "Gizle" : "Göster";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = pw.value;
    if (!email || !password) { showError("E-posta ve şifreyi girin."); return; }

    showError("");
    btn.disabled = true;
    btn.textContent = "Giriş yapılıyor…";
    try {
      const data = await Api.login(email, password);
      if (!data.token) throw new Error(data.error || "Giriş yapılamadı.");
      Auth.save(data.token, data.user, false);
      location.href = "index.html";
    } catch (ex) {
      showError(ex instanceof NetworkError
        ? "Sunucuya ulaşılamadı. Terminalde server klasöründe \"node src/app.js\" çalışıyor mu?"
        : ex.message);
      btn.disabled = false;
      btn.textContent = "Giriş yap";
    }
  });

  document.getElementById("demoBtn").addEventListener("click", () => {
    Auth.save("demo", { id: 0, full_name: "Örnek Yönetici", role: "ADMIN" }, true);
    location.href = "index.html";
  });
})();
