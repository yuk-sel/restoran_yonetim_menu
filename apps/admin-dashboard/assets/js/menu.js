const urunForm= document.getElementById("urun-form")
const kategoriForm= document.getElementById("kategori-form")
const API_BASE = window.location.origin + '/api';

const urunEklemeButonu= document.getElementById("urunEkleButon")
const kategoriEklemeButonu= document.getElementById('kategoriButon')
const menuGrid = document.querySelector(".menu-grid");
const kategoriTabs = document.querySelector(".category-tabs");
const token = localStorage.getItem("token");
const kategoriSelect= document.getElementById("urun-kategori")
const tumUrunlerButon= document.getElementById("tum-urunler-btn")
const kategoriTabList = document.getElementById("kategori-tab-list");



/* Yeni ürün ekleme */
urunForm.addEventListener("submit", async function(event) {
    event.preventDefault()

    const urunAdi= document.getElementById('urun-adi').value
    const urunKategori= document.getElementById('urun-kategori').value
    const urunFiyat= document.getElementById('urun-fiyat').value
    const urunResmi= document.getElementById('urun-resim').files[0]
    const urunAciklama= document.getElementById('urun-aciklama').value

    const formData= new FormData()
    formData.append('name', urunAdi)
    formData.append('category_id', urunKategori)
    formData.append('description', urunAciklama)
    formData.append('price', urunFiyat)
    formData.append('image_url', urunResmi)

    const res= await fetch(`${API_BASE}/menu/products`, {
        method: "POST",
        headers: {'Authorization': `Bearer ${token}`},
        body: formData
    })
    const data= await res.json()
    loadAllProducts()
    localStorage.setItem("products", JSON.stringify(data))
    urunForm.reset();



})
    /*Kategori ekleme*/
kategoriForm.addEventListener("submit", async function(event) {
    event.preventDefault()
    
    const kategoriAdi= document.getElementById('kategori-adi').value
    const siralamaNo= document.getElementById('kategori-sira').value
    const user = JSON.parse(localStorage.getItem("user"));
    
    const kategori= await fetch(`${API_BASE}/menu/categories`, {
        method: "POST",
        headers: {'Content-Type': "application/json", 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({restaurant_id:user.restaurant_id, name: kategoriAdi, sort_order: siralamaNo})
    })
    const kategoriData= await kategori.json()

    loadCategories()

    localStorage.setItem("category", JSON.stringify(kategoriData))
    kategoriForm.reset()
    
})

async function loadProducts(categoryId) {
    const res= await fetch(`${API_BASE}/menu/categories/${categoryId}/products`)
    const products= await res.json()

    menuGrid.innerHTML= ""
    products.forEach(product => {
        const card= document.createElement("div")
        card.className= "menu-card"
        card.innerHTML= `
        <img src="${product.image_url}" alt="${product.name}" class="card-img">
        <h3 class="card-title">${product.name}</h3>
        <p class="card-desc">${product.description}</p>
        <span class="card-price">${product.price} TL</span>
        <button class="duzenle-btn icon-btn" type="button" title="Düzenle">✎ <button class="sil-btn icon-btn" type="button" title="Sil">✕</button>
        
    `
    card.querySelector(".sil-btn").addEventListener("click", async function(event) {
        event.preventDefault();
        const productId = product.id;
        const res = await fetch(`${API_BASE}/menu/products/${productId}/status`,{
            method: "PATCH",
            headers: {'Content-Type': "application/json", 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({status: "OUT_OF_STOCK"})
        })
        loadProducts(categoryId);
    });
    menuGrid.appendChild(card)
    })
    return products
}

async function loadCategories() {
    const res= await fetch(`${API_BASE}/menu/categories`,
        {method: "GET"}
    )
    const categories= await res.json()
    kategoriTabList.innerHTML= ""
    categories.forEach(category => {
        const newTab = document.createElement("button");
        newTab.type = "button";
        newTab.className = "tab-btn";
        newTab.textContent = category.name;
        newTab.addEventListener("click", () => {
            loadProducts(category.id);
        });
        kategoriTabList.appendChild(newTab)

        const option= document.createElement("option")
        option.value= category.id
        option.textContent= category.name
        kategoriSelect.appendChild(option)
    }

)
    if (categories.length > 0) {
    loadProducts(categories[0].id);
  }
}

loadCategories()

async function loadAllProducts(){
    const res= await fetch(`${API_BASE}/menu/products`, {
        method: "GET"
    })
    const products= await res.json()
    menuGrid.innerHTML= ""
    products.forEach(product => {
        const card= document.createElement("div")
        card.className= "menu-card"
        card.innerHTML= `
        <img src="${product.image_url}" alt="${product.name}">
        <h3 class="card-title">${product.name}</h3>
        <p class="card-desc">${product.description}</p>
        <span class="card-price">${product.price} TL</span>
        <button class="duzenle-btn icon-btn" type="button" title="Düzenle">✎</button>
        <button class="sil-btn icon-btn" type="button" title="Sil">✕</button>
    `
    card.querySelector(".sil-btn").addEventListener("click", async function(event) {
        event.preventDefault();
        const productId = product.id;
        const res = await fetch(`${API_BASE}/menu/products/${productId}/status`,{
            method: "PATCH",
            headers: {'Content-Type': "application/json", 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({status: "OUT_OF_STOCK"})
        })
        loadAllProducts();
    });
    menuGrid.appendChild(card)
    })
    return products
} 

tumUrunlerButon.addEventListener("click", function() {
    loadAllProducts();
});

