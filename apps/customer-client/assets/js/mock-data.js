// Örnek (mock) veri — docs/api-spec.json içindeki
// GET /tables/{qrCode}/menu yanıt formatıyla birebir aynı yapıdadır.
// Backend hazır olunca api.js içinde USE_MOCK = false yapmak yeterli.

window.MOCK_MENU = {
  table: { id: "tbl_12", number: 12, section: "Teras", sessionId: "sess_89234" },
  categories: [
    {
      id: "cat_burger", name: "Burgerler", order: 1,
      products: [
        {
          id: "prod_101", name: "Cheeseburger",
          description: "200g dana köfte, cheddar peyniri, karamelize soğan, özel sos",
          price: 280.0, imageUrl: null, isAvailable: true,
          allergens: ["Gluten", "Süt Ürünü"],
          optionGroups: [
            { id: "optg_1", title: "Köfte pişme derecesi", isRequired: true, selectionType: "single",
              options: [ { id: "opt_11", name: "Orta", price: 0 }, { id: "opt_12", name: "İyi pişmiş", price: 0 } ] },
            { id: "optg_2", title: "Ekstralar", isRequired: false, selectionType: "multiple",
              options: [ { id: "opt_21", name: "Ekstra cheddar", price: 30 }, { id: "opt_22", name: "Ekstra füme et", price: 45 } ] }
          ]
        },
        {
          id: "prod_102", name: "Mantarlı Burger",
          description: "180g dana köfte, sote kestane mantarı, İsviçre peyniri, trüf mayonez",
          price: 310.0, imageUrl: null, isAvailable: true,
          allergens: ["Gluten", "Süt Ürünü", "Yumurta"],
          optionGroups: [
            { id: "optg_3", title: "Köfte pişme derecesi", isRequired: true, selectionType: "single",
              options: [ { id: "opt_31", name: "Orta", price: 0 }, { id: "opt_32", name: "İyi pişmiş", price: 0 } ] },
            { id: "optg_4", title: "Yanında", isRequired: false, selectionType: "single",
              options: [ { id: "opt_41", name: "Patates kızartması", price: 0 }, { id: "opt_42", name: "Tatlı patates", price: 25 }, { id: "opt_43", name: "Yeşil salata", price: 0 } ] }
          ]
        },
        {
          id: "prod_103", name: "Tavuk Burger",
          description: "Çıtır tavuk göğsü, coleslaw, turşu, acılı mayonez",
          price: 240.0, imageUrl: null, isAvailable: false,
          allergens: ["Gluten", "Yumurta"], optionGroups: []
        }
      ]
    },
    {
      id: "cat_main", name: "Ana Yemekler", order: 2,
      products: [
        {
          id: "prod_201", name: "Izgara Köfte",
          description: "Közlenmiş biber ve domates, sumaklı soğan, tereyağlı pilav ile",
          price: 295.0, imageUrl: null, isAvailable: true, allergens: ["Süt Ürünü"],
          optionGroups: [
            { id: "optg_5", title: "Porsiyon", isRequired: true, selectionType: "single",
              options: [ { id: "opt_51", name: "Normal", price: 0 }, { id: "opt_52", name: "1,5 porsiyon", price: 120 } ] }
          ]
        },
        {
          id: "prod_202", name: "Tavuk Şiş",
          description: "Yoğurtlu marine tavuk, lavaş, közlenmiş sebze",
          price: 260.0, imageUrl: null, isAvailable: true, allergens: ["Süt Ürünü", "Gluten"], optionGroups: []
        },
        {
          id: "prod_203", name: "Fırın Mantı",
          description: "Kayseri usulü, sarımsaklı yoğurt, kızdırılmış tereyağı ve pul biber",
          price: 230.0, imageUrl: null, isAvailable: true, allergens: ["Gluten", "Süt Ürünü", "Yumurta"],
          optionGroups: [
            { id: "optg_6", title: "Sarımsak", isRequired: false, selectionType: "single",
              options: [ { id: "opt_61", name: "Sarımsaklı", price: 0 }, { id: "opt_62", name: "Sarımsaksız", price: 0 } ] }
          ]
        }
      ]
    },
    {
      id: "cat_salad", name: "Salatalar", order: 3,
      products: [
        {
          id: "prod_301", name: "Çoban Salata",
          description: "Domates, salatalık, biber, kuru soğan, maydanoz, zeytinyağı",
          price: 120.0, imageUrl: null, isAvailable: true, allergens: [], optionGroups: []
        },
        {
          id: "prod_302", name: "Hellim Salata",
          description: "Izgara hellim, roka, kiraz domates, nar ekşisi",
          price: 190.0, imageUrl: null, isAvailable: true, allergens: ["Süt Ürünü"],
          optionGroups: [
            { id: "optg_7", title: "Ekstralar", isRequired: false, selectionType: "multiple",
              options: [ { id: "opt_71", name: "Ceviz", price: 20 }, { id: "opt_72", name: "Avokado", price: 40 } ] }
          ]
        }
      ]
    },
    {
      id: "cat_drink", name: "İçecekler", order: 4,
      products: [
        {
          id: "prod_401", name: "Ayran", description: "Yayık ayranı, köpüklü",
          price: 45.0, imageUrl: null, isAvailable: true, allergens: ["Süt Ürünü"], optionGroups: []
        },
        {
          id: "prod_402", name: "Ev Yapımı Limonata", description: "Taze nane ile",
          price: 75.0, imageUrl: null, isAvailable: true, allergens: [],
          optionGroups: [
            { id: "optg_8", title: "Boyut", isRequired: true, selectionType: "single",
              options: [ { id: "opt_81", name: "Küçük", price: 0 }, { id: "opt_82", name: "Büyük", price: 25 } ] }
          ]
        },
        {
          id: "prod_403", name: "Türk Kahvesi", description: "Lokum ile servis edilir",
          price: 70.0, imageUrl: null, isAvailable: true, allergens: [],
          optionGroups: [
            { id: "optg_9", title: "Şeker", isRequired: true, selectionType: "single",
              options: [ { id: "opt_91", name: "Sade", price: 0 }, { id: "opt_92", name: "Az şekerli", price: 0 }, { id: "opt_93", name: "Orta", price: 0 }, { id: "opt_94", name: "Şekerli", price: 0 } ] }
          ]
        },
        {
          id: "prod_404", name: "Çay", description: "İnce belli bardakta demlik çay",
          price: 25.0, imageUrl: null, isAvailable: true, allergens: [], optionGroups: []
        }
      ]
    },
    {
      id: "cat_dessert", name: "Tatlılar", order: 5,
      products: [
        {
          id: "prod_501", name: "Künefe", description: "Hatay usulü, Antep fıstıklı, sıcak servis",
          price: 180.0, imageUrl: null, isAvailable: true, allergens: ["Gluten", "Süt Ürünü", "Kuruyemiş"],
          optionGroups: [
            { id: "optg_10", title: "Ekstralar", isRequired: false, selectionType: "multiple",
              options: [ { id: "opt_101", name: "Kaymak", price: 35 }, { id: "opt_102", name: "Dondurma", price: 40 } ] }
          ]
        },
        {
          id: "prod_502", name: "Sütlaç", description: "Fırında, üzeri karamelize",
          price: 110.0, imageUrl: null, isAvailable: true, allergens: ["Süt Ürünü"], optionGroups: []
        }
      ]
    }
  ]
};
