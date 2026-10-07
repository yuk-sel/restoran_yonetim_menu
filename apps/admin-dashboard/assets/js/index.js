const token = localStorage.getItem("token");
const API_BASE = "http://localhost:3000/api";

if (!token){
    window.location.href = "login.html";
}