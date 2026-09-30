const token = localStorage.getItem("token");
const API_BASE = "http://localhost:3000/api";

if (!token){
    window.location.href = "login.html";
}

const user= JSON.parse(localStorage.getItem("user"))
document.getElementById("userName").textContent = user.full_name
document.getElementById("userRole").textContent = user.role


const cikisButonu= document.querySelector("#logoutBtn")
cikisButonu.addEventListener("click", async function(event) {
    event.preventDefault();
    window.location.href = "login.html";   
})

const menuButonu= document.querySelector("#menuButon")
menuButonu.addEventListener("click", async function(event) {
    window.location.href= "menu.html"   
})