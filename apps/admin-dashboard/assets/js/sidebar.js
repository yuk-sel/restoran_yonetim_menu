async function loadSidebar() {
  const res = await fetch("sidebar.html");
  const html = await res.text();
  document.getElementById("sidebar-container").innerHTML = html;

  // Sidebar artık sayfada, şimdi içindeki elemanlara erişebiliriz
  const user = JSON.parse(localStorage.getItem("user"));
  document.getElementById("userName").textContent = user.full_name;
  document.getElementById("userRole").textContent = user.role;

  const cikisButonu = document.querySelector("#logoutBtn");
  cikisButonu.addEventListener("click", function() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
  });
}

loadSidebar();