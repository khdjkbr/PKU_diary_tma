// База продуктов для диеты ФКУ. Значения указаны ориентировочно на 100 г.
// КБЖУ и ФА сверяются по открытым справочникам USDA FoodData Central / FRIDA.
// ГИ является справочным значением: у части продуктов он отсутствует или зависит от сорта и обработки.
const FOOD_DATA_SOURCE = {
  name: "USDA FoodData Central / FRIDA",
  url: "https://fdc.nal.usda.gov/",
  note: "на 100 г продукта"
};

const GI_DATA_SOURCE = {
  name: "University of Sydney GI Database",
  url: "https://glycemicindex.com/"
};

const PRODUCT_PHOTO_QUERIES = {
  "Кабачок свежий": "zucchini food",
  "Огурец свежий": "cucumber food",
  "Помидор свежий": "tomato food",
  "Морковь": "carrot food",
  "Картофель отварной": "boiled potato food",
  "Капуста белокочанная": "cabbage food",
  "Цветная капуста": "cauliflower food",
  "Брокколи": "broccoli food",
  "Тыква": "pumpkin food",
  "Свекла отварная": "beetroot food",
  "Баклажан": "eggplant food",
  "Зелень укроп петрушка": "parsley dill herbs food",
  "Яблоко свежее": "apple fruit",
  "Груша": "pear fruit",
  "Банан": "banana fruit",
  "Апельсин Мандарин": "orange mandarin fruit",
  "Персик Нектарин": "peach nectarine fruit",
  "Клубника": "strawberry fruit",
  "Малина": "raspberry fruit",
  "Арбуз": "watermelon fruit",
  "Дыня": "melon fruit",
  "Виноград": "grapes fruit",
  "МакМастер: Вермишель н/б": "low protein pasta food",
  "МакМастер: Мука безбелковая": "flour food",
  "МакМастер: Рис н/б": "rice food",
  "МакМастер: Гречка н/б": "buckwheat food",
  "Balviten: Хлеб н/б": "bread food",
  "Balviten: Мука н/б": "flour food",
  "Безглютен: Печенье н/б": "cookies food",
  "Саго крупа": "sago pearls food",
  "Заменитель яйца н/б": "egg replacer powder food",
  "Масло сливочное 82%": "butter food",
  "Масло растительное": "vegetable oil food",
  "Сахар песок": "sugar food",
  "Мед натуральный": "honey food",
  "Мармелад": "marmalade candy food",
  "Рис обычный": "white rice food",
  "Гречка обычная": "buckwheat groats food",
  "Овсяные хлопья": "oat flakes food",
  "Хлеб пшеничный": "wheat bread food",
  "Молоко 2.5%": "milk glass food",
  "Кефир 2.5%": "kefir drink food",
  "Йогурт натуральный": "plain yogurt food",
  "Творог 5%": "cottage cheese food",
  "Сыр твердый": "cheese food",
  "Куриная грудка": "chicken breast food",
  "Говядина отварная": "beef cooked food",
  "Рыба белая": "white fish fillet food",
  "Яйцо куриное": "chicken egg food",
  "Вода": "water glass",
  "Чай без сахара": "tea cup",
  "Сок яблочный": "apple juice food",
  "Компот с сахаром": "fruit compote drink"
};

function productPhotoUrl(productName) {
  const query = PRODUCT_PHOTO_QUERIES[productName] || (productName + " food");
  return "https://loremflickr.com/320/220/" + encodeURIComponent(query);
}

function enrichProduct(item) {
  const source = item.cat === "special"
    ? {
        name: "Справочно: производитель + USDA/FRIDA аналоги",
        url: "https://fdc.nal.usda.gov/",
        note: "проверяйте упаковку конкретного спецпродукта"
      }
    : FOOD_DATA_SOURCE;

  return {
    ...item,
    image_url: item.image_url || productPhotoUrl(item.name),
    source_name: item.source_name || source.name,
    source_url: item.source_url || source.url,
    gi_source_name: item.gi_source_name || GI_DATA_SOURCE.name,
    gi_source_url: item.gi_source_url || GI_DATA_SOURCE.url,
    data_note: item.data_note || source.note
  };
}

window.PRODUCT_DATA_SOURCES = {
  nutrients: FOOD_DATA_SOURCE,
  gi: GI_DATA_SOURCE
};

window.FOOD_BASE = [
  { name: "Кабачок свежий", cat: "veg", kcal: 24, protein: 0.6, prot: 0.6, fat: 0.3, carbs: 4.6, phe: 30, gi: 15 },
  { name: "Огурец свежий", cat: "veg", kcal: 15, protein: 0.8, prot: 0.8, fat: 0.1, carbs: 2.8, phe: 20, gi: 15 },
  { name: "Помидор свежий", cat: "veg", kcal: 20, protein: 0.9, prot: 0.9, fat: 0.2, carbs: 3.9, phe: 25, gi: 10 },
  { name: "Морковь", cat: "veg", kcal: 35, protein: 1.3, prot: 1.3, fat: 0.1, carbs: 6.9, phe: 35, gi: 35 },
  { name: "Картофель отварной", cat: "veg", kcal: 82, protein: 2.0, prot: 2.0, fat: 0.4, carbs: 16.7, phe: 85, gi: 65 },
  { name: "Капуста белокочанная", cat: "veg", kcal: 27, protein: 1.8, prot: 1.8, fat: 0.1, carbs: 4.7, phe: 45, gi: 10 },
  { name: "Цветная капуста", cat: "veg", kcal: 30, protein: 2.5, prot: 2.5, fat: 0.3, carbs: 4.2, phe: 65, gi: 15 },
  { name: "Брокколи", cat: "veg", kcal: 34, protein: 3.0, prot: 3.0, fat: 0.4, carbs: 6.6, phe: 80, gi: 15 },
  { name: "Тыква", cat: "veg", kcal: 26, protein: 1.0, prot: 1.0, fat: 0.1, carbs: 6.5, phe: 30, gi: 75 },
  { name: "Свекла отварная", cat: "veg", kcal: 44, protein: 1.7, prot: 1.7, fat: 0.2, carbs: 8.8, phe: 45, gi: 65 },
  { name: "Баклажан", cat: "veg", kcal: 24, protein: 1.2, prot: 1.2, fat: 0.1, carbs: 4.5, phe: 35, gi: 20 },
  { name: "Зелень укроп петрушка", cat: "veg", kcal: 40, protein: 2.5, prot: 2.5, fat: 0.7, carbs: 6.3, phe: 60, gi: 15 },

  { name: "Яблоко свежее", cat: "fruit", kcal: 52, protein: 0.4, prot: 0.4, fat: 0.2, carbs: 13.8, phe: 15, gi: 35 },
  { name: "Груша", cat: "fruit", kcal: 57, protein: 0.4, prot: 0.4, fat: 0.1, carbs: 15.2, phe: 15, gi: 38 },
  { name: "Банан", cat: "fruit", kcal: 89, protein: 1.1, prot: 1.1, fat: 0.3, carbs: 22.8, phe: 45, gi: 51 },
  { name: "Апельсин Мандарин", cat: "fruit", kcal: 43, protein: 0.9, prot: 0.9, fat: 0.2, carbs: 8.1, phe: 30, gi: 35 },
  { name: "Персик Нектарин", cat: "fruit", kcal: 44, protein: 0.9, prot: 0.9, fat: 0.2, carbs: 10.5, phe: 30, gi: 42 },
  { name: "Клубника", cat: "fruit", kcal: 32, protein: 0.8, prot: 0.8, fat: 0.3, carbs: 7.7, phe: 25, gi: 40 },
  { name: "Малина", cat: "fruit", kcal: 52, protein: 0.8, prot: 0.8, fat: 0.7, carbs: 12.0, phe: 25, gi: 32 },
  { name: "Арбуз", cat: "fruit", kcal: 30, protein: 0.6, prot: 0.6, fat: 0.2, carbs: 7.6, phe: 15, gi: 72 },
  { name: "Дыня", cat: "fruit", kcal: 35, protein: 0.6, prot: 0.6, fat: 0.3, carbs: 8.3, phe: 20, gi: 65 },
  { name: "Виноград", cat: "fruit", kcal: 69, protein: 0.6, prot: 0.6, fat: 0.2, carbs: 18.1, phe: 20, gi: 45 },

  { name: "МакМастер: Вермишель н/б", cat: "special", kcal: 350, protein: 0.5, prot: 0.5, fat: 0.6, carbs: 84.0, phe: 15, gi: 70 },
  { name: "МакМастер: Мука безбелковая", cat: "special", kcal: 340, protein: 0.3, prot: 0.3, fat: 0.8, carbs: 82.0, phe: 10, gi: 75 },
  { name: "МакМастер: Рис н/б", cat: "special", kcal: 350, protein: 0.5, prot: 0.5, fat: 0.4, carbs: 85.0, phe: 15, gi: 72 },
  { name: "МакМастер: Гречка н/б", cat: "special", kcal: 340, protein: 0.5, prot: 0.5, fat: 0.6, carbs: 82.0, phe: 15, gi: 65 },
  { name: "Balviten: Хлеб н/б", cat: "special", kcal: 250, protein: 0.6, prot: 0.6, fat: 4.0, carbs: 50.0, phe: 20, gi: 70 },
  { name: "Balviten: Мука н/б", cat: "special", kcal: 345, protein: 0.5, prot: 0.5, fat: 0.7, carbs: 83.0, phe: 15, gi: 75 },
  { name: "Безглютен: Печенье н/б", cat: "special", kcal: 430, protein: 0.8, prot: 0.8, fat: 12.0, carbs: 78.0, phe: 25, gi: 70 },
  { name: "Саго крупа", cat: "special", kcal: 335, protein: 0.3, prot: 0.3, fat: 0.2, carbs: 83.0, phe: 12, gi: 70 },
  { name: "Заменитель яйца н/б", cat: "special", kcal: 320, protein: 0.2, prot: 0.2, fat: 0.5, carbs: 78.0, phe: 10, gi: 60 },

  { name: "Масло сливочное 82%", cat: "sweet", kcal: 748, protein: 0.5, prot: 0.5, fat: 82.0, carbs: 0.8, phe: 25, gi: 0 },
  { name: "Масло растительное", cat: "sweet", kcal: 899, protein: 0.0, prot: 0.0, fat: 99.9, carbs: 0.0, phe: 0, gi: 0 },
  { name: "Сахар песок", cat: "sweet", kcal: 399, protein: 0.0, prot: 0.0, fat: 0.0, carbs: 99.8, phe: 0, gi: 70 },
  { name: "Мед натуральный", cat: "sweet", kcal: 329, protein: 0.3, prot: 0.3, fat: 0.0, carbs: 81.5, phe: 10, gi: 60 },
  { name: "Мармелад", cat: "sweet", kcal: 320, protein: 0.1, prot: 0.1, fat: 0.0, carbs: 79.0, phe: 5, gi: 65 },

  { name: "Рис обычный", cat: "grain", kcal: 344, protein: 7.0, prot: 7.0, fat: 0.7, carbs: 78.9, phe: 320, gi: 70 },
  { name: "Гречка обычная", cat: "grain", kcal: 343, protein: 12.0, prot: 12.0, fat: 3.4, carbs: 71.5, phe: 450, gi: 50 },
  { name: "Овсяные хлопья", cat: "grain", kcal: 366, protein: 12.5, prot: 12.5, fat: 6.2, carbs: 61.0, phe: 480, gi: 55 },
  { name: "Хлеб пшеничный", cat: "grain", kcal: 265, protein: 7.5, prot: 7.5, fat: 3.2, carbs: 49.0, phe: 380, gi: 75 },

  { name: "Молоко 2.5%", cat: "dairy", kcal: 52, protein: 2.9, prot: 2.9, fat: 2.5, carbs: 4.8, phe: 145, gi: 30 },
  { name: "Кефир 2.5%", cat: "dairy", kcal: 53, protein: 3.0, prot: 3.0, fat: 2.5, carbs: 4.0, phe: 150, gi: 25 },
  { name: "Йогурт натуральный", cat: "dairy", kcal: 66, protein: 4.3, prot: 4.3, fat: 3.2, carbs: 4.7, phe: 215, gi: 35 },
  { name: "Творог 5%", cat: "dairy", kcal: 121, protein: 17.0, prot: 17.0, fat: 5.0, carbs: 1.8, phe: 850, gi: 30 },
  { name: "Сыр твердый", cat: "dairy", kcal: 350, protein: 24.0, prot: 24.0, fat: 28.0, carbs: 0.0, phe: 1200, gi: 0 },

  { name: "Куриная грудка", cat: "protein", kcal: 165, protein: 31.0, prot: 31.0, fat: 3.6, carbs: 0.0, phe: 1550, gi: 0 },
  { name: "Говядина отварная", cat: "protein", kcal: 254, protein: 26.0, prot: 26.0, fat: 17.0, carbs: 0.0, phe: 1300, gi: 0 },
  { name: "Рыба белая", cat: "protein", kcal: 90, protein: 18.0, prot: 18.0, fat: 1.5, carbs: 0.0, phe: 900, gi: 0 },
  { name: "Яйцо куриное", cat: "protein", kcal: 157, protein: 12.7, prot: 12.7, fat: 10.9, carbs: 0.7, phe: 635, gi: 0 },

  { name: "Вода", cat: "drink", kcal: 0, protein: 0.0, prot: 0.0, fat: 0.0, carbs: 0.0, phe: 0, gi: 0 },
  { name: "Чай без сахара", cat: "drink", kcal: 1, protein: 0.0, prot: 0.0, fat: 0.0, carbs: 0.0, phe: 0, gi: 0 },
  { name: "Сок яблочный", cat: "drink", kcal: 46, protein: 0.1, prot: 0.1, fat: 0.1, carbs: 11.3, phe: 5, gi: 40 },
  { name: "Компот с сахаром", cat: "drink", kcal: 55, protein: 0.2, prot: 0.2, fat: 0.0, carbs: 13.5, phe: 5, gi: 60 }
].map(enrichProduct);
