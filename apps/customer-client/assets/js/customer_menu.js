const API_BASE = "https://restoran-muio.onrender.com/api";

const kategoriler= document.getElementById("kategori-tab-list")
const tumUrunlerButonu= document.getElementById("tum-urunler-btn")
const urunCard= document.getElementById("menu-grid")
const app = document.getElementById("app");
app.hidden = false;


/*Ürünleri ekrana basma fonksiyonu */
function urunleriEkranaBas(urunler){
    urunCard.innerHTML=""
    urunler.forEach(urun=>{
        const card= document.createElement("div")
        card.className="urun-card"
        const imageHTML = (urun.image_url && urun.image_url !== "null" && urun.image_url !== "") 
            ? `<img src="${urun.image_url}" alt="${urun.name}">` 
            : '';
        card.innerHTML=`
        <img src=${imageHTML} class="urun-resmi>
        <h3 class="urun-ismi">${urun.name}</h3>
        <p class="urun-aciklamasi">${urun.description}</p>
        <span class="urun-fiyat">${urun.price}</span>
        
        `
        urunCard.appendChild(card)
    })

}

/*Ürünleri ekrana basma fonksiyonu bitti*/

/*Basılan buton aktif olsun diğerleri deaktif*/
function aktifButon(buton){
    document.querySelectorAll(".chip").forEach(btn=>{
        btn.classList.remove("is-active")
    })
    buton.classList.add("is-active")
}
/*Basılan buton aktif olsun diğerleri deaktif bitti*/


/*Tüm Ürünler kategorisi ve tüm ürünler*/
async function tumUrunler() {
    const res= await fetch(`${API_BASE}/menu/products`, {
        method: "GET"
    })
    const urunler= await res.json()
    urunleriEkranaBas(urunler)
    return urunler
}

tumUrunlerButonu.addEventListener("click", function(){
    aktifButon(tumUrunlerButonu)
    tumUrunler()
})
/*Tüm Ürünler kategorisi ve tüm ürünler bitti*/

/*Seçilen kategoriye ait ürünleri gösterme*/
async function kategoriyeAitUrunlerGoster(kategori_id) {
    const res= await fetch(`${API_BASE}/menu/categories/${kategori_id}/products`,{
        method: "GET"
    })
    const urunler= await res.json()
    urunleriEkranaBas(urunler)
    return urunler   
}

/*Seçilen kategoriye ait ürünleri gösterme bitti*/

/*Kategorilerin butonları */
async function kategorileriGoster() {
    const res= await fetch(`${API_BASE}/menu/categories`,{
        method: "GET"
    })

    const categories= await res.json()
    kategoriler.innerHTML= ""
    categories.forEach(category => {
        const butonolustur= document.createElement("button")
        butonolustur.type= "button"
        butonolustur.className= "chip"
        butonolustur.textContent= category.name

        butonolustur.addEventListener("click", ()=>{
            /*olusturulan butona basıldığında kategoriyeAitUrunlerGoster fonksiyonu çağrılarak urunler gösterilir*/
            kategoriyeAitUrunlerGoster(category.id)
            aktifButon(butonolustur)
        })
        kategoriler.appendChild(butonolustur)
    });
    tumUrunler()  
}
kategorileriGoster()
/*Kategorilerin butonları bitti*/
