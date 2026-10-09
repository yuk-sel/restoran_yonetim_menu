const loginForm= document.getElementById('login-form')
const API_BASE = window.location.origin + '/api';
loginForm.addEventListener("submit", async function(event){
  event.preventDefault();
  const email= document.getElementById('email').value
  const sifre= document.getElementById('password').value

    const res= await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {'Content-Type': "application/json"},
    body: JSON.stringify({email: email, password: sifre  })
  });
const data = await res.json();

if(data.token){
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  window.location.href = "index.html";
}
else{
  document.getElementById("error-message").textContent = data.error;

}
});

