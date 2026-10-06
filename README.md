# Sofra — QR Menü ve Restoran Yönetim Sistemi

Müşteri masadaki QR kodu okutur, menüyü görür ve telefonundan sipariş verir. Sipariş anında yönetim paneline ve mutfak ekranına düşer; garson çağırma ve hesap isteme de aynı yoldan gelir.

| Bölüm | Klasör | Kim kullanır |
|---|---|---|
| Sunucu (API) | `server/` | — |
| Yönetim paneli | `apps/admin-dashboard/` | Yönetici, garson, mutfak |
| Müşteri ekranı | `apps/customer-client/` | Masadaki müşteri (telefon) |

---

## Gereksinimler

- [Node.js](https://nodejs.org) 18 veya üstü
- [Git](https://git-scm.com/download/win)
- PostgreSQL veritabanı bağlantı adresi (ekip ortak bir Neon veritabanı kullanıyor; adresi ekipten alın)

## Kurulum

```bash
git clone https://github.com/yuk-sel/vahoo.git
cd vahoo/server
npm install
```

Ardından `server` klasöründe `.env` dosyasını oluşturun. Windows Komut İstemi'nde:

```bat
copy .env.example .env
notepad .env
```

Dosyayı şöyle doldurun:

```env
PORT=3000
DATABASE_URL=postgresql://...ekipten aldığınız adres...
JWT_SECRET=uzun-ve-tahmin-edilemez-bir-yazi
```

> `.env` dosyası şifre içerir, `.gitignore` sayesinde GitHub'a yüklenmez. Bu dosyayı kimseyle mesaj dışında paylaşmayın.

Yeni ve boş bir veritabanı kullanıyorsanız tabloları oluşturmak için `server/schema.sql` dosyasını veritabanında bir kez çalıştırın (Neon'da: SQL Editor → dosya içeriğini yapıştır → Run).

## Çalıştırma

### 1. Sunucu

```bash
cd server
node src/app.js
```

Her şey doğruysa şunları görürsünüz:

```
◇ injected env (3) from .env
Sunucu 3000 portunda çalışıyor
Veritabanı bağlantısı başarılı: ...
```

Sunucu çalıştığı sürece bu pencereyi kapatmayın. Durdurmak için **Ctrl + C**.

### 2. Yönetim paneli

`apps/admin-dashboard/login.html` dosyasını tarayıcıda açın ve ekip test hesabıyla giriş yapın.

Sunucu çalışmıyorsa giriş sayfasındaki **“Örnek verilerle göz at”** bağlantısı paneli örnek verilerle açar. Bu modda yapılan değişiklikler kaydedilmez; tasarımı incelemek içindir.

Paneldeki bölümler:

| Bölüm | Ne yapar |
|---|---|
| Genel Bakış | Bekleyen siparişler, mutfaktakiler, bugünkü ciro, masa çağrıları |
| Siparişler | Duruma göre filtreleme; Onayla → Hazırlamaya başla → Hazır → Teslim edildi; iptal |
| Menü | Kategori ve ürün ekleme, “Satışta / Tükendi” anahtarı |
| Masalar & QR | Masa ekleme, her masanın QR kodu, tek tek veya toplu yazdırma |
| Mutfak Ekranı | Tablet için büyük sipariş kartları, 15 dakikayı geçenler kırmızı, tam ekran |
| Raporlar | Saatlik / günlük ciro, en çok satanlar, en çok harcama yapan masalar |
| Personel | Garson, mutfak ve yönetici hesabı oluşturma |

Yeni sipariş ve garson çağrılarında sesli bildirim çalar (sağ üstten kapatılabilir).

### 3. Müşteri ekranı

`apps/customer-client/index.html` dosyasını açın. Gerçek kullanımda adres QR koddan gelir: `.../customer-client/index.html?qr=MASANIN_QR_KODU`. Panelde **Masalar & QR** bölümündeki kodlar bu adresi üretir.

Müşteri ekranı şu an örnek verilerle çalışır. Sunucuya bağlamak için `apps/customer-client/assets/js/api.js` içinde `USE_MOCK = false` yapın (önce aşağıdaki “Yapılacaklar” listesindeki müşteri adreslerinin sunucuya eklenmesi gerekir).

---

## API adresleri

Taban adres: `http://localhost:3000/api`. 🔒 işaretli adresler `Authorization: Bearer <token>` başlığı ister (token girişte alınır).

| Yöntem | Adres | Açıklama |
|---|---|---|
| POST | `/auth/login` | Giriş. Gövde: `{ email, password }` → `{ token, user }` |
| POST | `/auth/register` | Personel hesabı oluşturma. Gövde: `{ restaurant_id, role, full_name, email, password }` |
| GET | `/menu/categories` | Kategoriler |
| GET | `/menu/categories/:id/products` | Kategorideki ürünler |
| POST 🔒 | `/menu/categories` | Kategori ekle `{ restaurant_id, name }` |
| POST 🔒 | `/menu/products` | Ürün ekle `{ category_id, name, description, price }` |
| GET | `/table/tables` | Masalar |
| POST 🔒 | `/table/tables` | Masa ekle `{ restaurant_id, table_number, qr_code }` |
| POST 🔒 | `/table/tables/:id/start-session` | Masada oturum aç |
| GET | `/order/orders` | Siparişler |
| POST 🔒 | `/order/orders` | Sipariş oluştur |
| PATCH 🔒 | `/order/orders/:id/status` | Durum değiştir `{ status }` |
| GET | `/waiter/active-calls` | Bekleyen garson / hesap çağrıları |
| POST 🔒 | `/waiter/waiter-call` | Garson çağır |
| POST 🔒 | `/waiter/request-bill` | Hesap iste |
| PATCH 🔒 | `/waiter/calls/:id/resolve` | Çağrıyı kapat |

Sipariş durumları: `PENDING` (yeni) → `APPROVED` → `PREPARING` → `READY` → `DELIVERED`, ayrıca `CANCELLED`.
Roller: `ADMIN`, `YONETICI`, `GARSON`, `MUTFAK`.

Müşteri ekranının beklediği istek ve yanıt biçimleri `docs/api-spec.json` dosyasındadır.

---

## Sık karşılaşılan hatalar

| Hata | Sebep ve çözüm |
|---|---|
| `injected env (0) from .env` ve `ECONNREFUSED ::1:5432` | `server/.env` dosyası yok ya da boş. Yukarıdaki kurulum adımıyla oluşturun. |
| `getaddrinfo ENOTFOUND ...` | `DATABASE_URL` yanlış yazılmış. Adresin tamamını, başında ve sonunda boşluk ya da tırnak olmadan yapıştırın. |
| Girişte `secretOrPrivateKey must have a value` | `.env` içinde `JWT_SECRET` yok. |
| Panelde “Sunucuya ulaşılamadı” | Sunucu çalışmıyor. `cd server` → `node src/app.js`. |
| Girişte “Geçersiz e-posta veya şifre” | Bilgiler yanlış. Türkçe klavyede `.` yerine `ç` yazılmadığından emin olun. |

---

## Çalışma düzeni (Git)

Herkes kendi branch'inde çalışır, `main`'e pull request ile geçilir.

```bash
git checkout main
git pull                 # en güncel kodu al
git checkout benim-branch
git merge main           # güncel kodu kendi branch'ine al

# ... değişiklikler ...

git add .
git commit -m "Ne yaptığınızı kısaca yazın"
git push origin benim-branch
```

Sonra GitHub'da **Compare & pull request** ile inceleme isteği açın.

---

## Yapılacaklar

**Müşteri ekranının sunucuya bağlanması için (öncelikli)**
- [ ] `GET /tables/:qrCode/menu`: QR kodla masa + menü + ürün seçenekleri
- [ ] Sipariş verme, garson çağırma ve hesap isteme müşteriden token istememeli (masa oturumu `session_id` ile doğrulanmalı)
- [ ] `GET /orders/:id/status`: müşteri ekranındaki sipariş takibi için
- [ ] Sipariş kaydında ürün seçenekleri (`selected_options`) ve notlar saklanmalı, seçenek fiyatları toplama eklenmeli
- [ ] Ürün seçenek grupları için zorunlu / tekli-çoklu bilgisi (`OptionGroup` modeli)

**Yönetim paneli için**
- [ ] `PATCH /menu/products/:id/status`: “Tükendi” anahtarının kaydedilmesi
- [ ] Ürün düzenleme ve silme adresleri
- [ ] `GET /order/orders` yanıtına ürünlerin (`order_items`) eklenmesi: mutfak ekranı ve “en çok satanlar” raporu için
- [ ] `GET /auth/users`: personel listesi
- [ ] Rol bazlı erişim (ör. mutfak hesabı sadece mutfak ekranını görsün)

**Güvenlik ve altyapı**
- [ ] `/auth/register` şu an herkese açık; sadece giriş yapmış admin kullanabilmeli
- [ ] Sipariş ve çağrı listeleri giriş istemeli ve sadece kullanıcının restoranına ait kayıtları döndürmeli
- [ ] Var olmayan ya da tükenmiş ürünle sipariş verilememeli
- [ ] WebSocket ile anlık bildirim (`config/socket.js`, `services/socketService.js`)
- [ ] `server/package.json` içine `"start": "node src/app.js"` komutu
- [ ] Docker ve GitHub Actions dosyaları, testler

---

## Ekip

- **Yüksel Yılmaz**: Sunucu (API), veritabanı
- **Melisa Gözel**: Yönetim paneli ve müşteri ekranı tasarımı
