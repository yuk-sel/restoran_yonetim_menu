const token = localStorage.getItem("token");
const API_BASE = window.location.origin + '/api';

if (!token){
    window.location.href = "login.html";
}