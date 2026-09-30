// app.js — Логика приложения ФКУ Компас

// 1. ИНИЦИАЛИЗАЦИЯ КЛЮЧЕЙ И TELEGRAM
    const DB_URL = (typeof window.SUPABASE_URL !== 'undefined') ? window.SUPABASE_URL : '';
    const DB_KEY = (typeof window.SUPABASE_KEY !== 'undefined') ? window.SUPABASE_KEY : '';
    const hasSupabase = DB_URL.startsWith('http') && !DB_URL.includes('ВАШ_ПРОЕКТ') && DB_KEY.startsWith('eyJ');

    const tg = window?.Telegram?.WebApp;
    if (tg) {
      try { tg.ready(); tg.expand(); } catch(e){}
    }

    const tgUser = tg?.initDataUnsafe?.user || { id: 99999999, first_name: "" };
    const currentTelegramId = tgUser.id;
    let userCustomProducts = [];
    let serverProducts = [];
    let wikiArticles = [];
    let allRecipes = [];
    let currentRecipeIngredients = [];
    let selectedRecipeForQuickAdd = null;

    let currentFilteredList = [];
    let currentDateObj = new Date();
    let currentCategory = 'all';
    let currentProductCategory = 'all';
    let currentExpandedProductIndex = null;
    let currentRecipeFilter = 'all';
    let currentRecipeCategory = 'all';

    const defaultSettings = {
      dailyPhe: 300,
      aksPortions: 4,
      age: '',
      weightKg: '',
      naturalProteinLimit: '',
      clinicianName: '',
      careNotes: '',
      showPheWarnings: true,
      aksReminders: false,
      language: 'ru'
    };

    const i18n = {
      ru: {
        appTitle: '🥑 ФКУ Компас',
        recipes: 'Рецепты',
        products: 'Продукты',
        diary: 'Дневник',
        wiki: 'Вики',
        profile: 'Профиль',
        recipesTitle: '🍲 Рецепты сообщества',
        create: '+ Создать',
        productsTitle: '🥦 Продукты',
        productSearch: '🔍 Найти продукт...',
        wikiTitle: '📚 Вики',
        allRecipes: '🌍 Все рецепты',
        myRecipes: '⭐ Только мои',
        allCategories: 'Все категории',
        breakfast: 'Завтраки',
        soup: 'Супы',
        main: 'Основные',
        bakery: 'Выпечка',
        dessert: 'Десерты',
        snack: 'Перекусы',
        profileMain: 'Основное',
        profilePku: 'ФКУ',
        language: 'Язык приложения',
        saveSettings: 'Сохранить настройки',
        savePersonalization: 'Сохранить персонализацию'
      },
      en: {
        appTitle: '🥑 PKU Compass',
        recipes: 'Recipes',
        products: 'Foods',
        diary: 'Diary',
        wiki: 'Wiki',
        profile: 'Profile',
        recipesTitle: '🍲 Community recipes',
        create: '+ Create',
        productsTitle: '🥦 Foods',
        productSearch: '🔍 Find food...',
        wikiTitle: '📚 Wiki',
        allRecipes: '🌍 All recipes',
        myRecipes: '⭐ Mine',
        allCategories: 'All categories',
        breakfast: 'Breakfasts',
        soup: 'Soups',
        main: 'Main dishes',
        bakery: 'Bakery',
        dessert: 'Desserts',
        snack: 'Snacks',
        profileMain: 'Settings',
        profilePku: 'PKU',
        language: 'App language',
        saveSettings: 'Save settings',
        savePersonalization: 'Save personalization'
      },
      uz: {
        appTitle: '🥑 FKU Kompas',
        recipes: 'Retseptlar',
        products: 'Mahsulotlar',
        diary: 'Kundalik',
        wiki: 'Viki',
        profile: 'Profil',
        recipesTitle: '🍲 Jamiyat retseptlari',
        create: '+ Yaratish',
        productsTitle: '🥦 Mahsulotlar',
        productSearch: '🔍 Mahsulot topish...',
        wikiTitle: '📚 Viki',
        allRecipes: '🌍 Barcha retseptlar',
        myRecipes: '⭐ Mening',
        allCategories: 'Barcha toifalar',
        breakfast: 'Nonushta',
        soup: 'Sho‘rvalar',
        main: 'Asosiy',
        bakery: 'Pishiriqlar',
        dessert: 'Desertlar',
        snack: 'Tamaddilar',
        profileMain: 'Sozlamalar',
        profilePku: 'FKU',
        language: 'Ilova tili',
        saveSettings: 'Sozlamalarni saqlash',
        savePersonalization: 'Shaxsiy sozlamalarni saqlash'
      },
      kk: {
        appTitle: '🥑 ФКУ Компас',
        recipes: 'Рецепттер',
        products: 'Өнімдер',
        diary: 'Күнделік',
        wiki: 'Вики',
        profile: 'Профиль',
        recipesTitle: '🍲 Қауымдастық рецепттері',
        create: '+ Қосу',
        productsTitle: '🥦 Өнімдер',
        productSearch: '🔍 Өнім табу...',
        wikiTitle: '📚 Вики',
        allRecipes: '🌍 Барлық рецепттер',
        myRecipes: '⭐ Менің',
        allCategories: 'Барлық санаттар',
        breakfast: 'Таңғы ас',
        soup: 'Сорпалар',
        main: 'Негізгі',
        bakery: 'Пісірме',
        dessert: 'Десерттер',
        snack: 'Тіскебасар',
        profileMain: 'Баптаулар',
        profilePku: 'ФКУ',
        language: 'Қолданба тілі',
        saveSettings: 'Баптауларды сақтау',
        savePersonalization: 'Жеке баптауларды сақтау'
      },
      tg: {
        appTitle: '🥑 ФКУ Компас',
        recipes: 'Дорухатҳо',
        products: 'Маҳсулот',
        diary: 'Рӯзнома',
        wiki: 'Вики',
        profile: 'Профил',
        recipesTitle: '🍲 Дорухатҳои ҷомеа',
        create: '+ Эҷод',
        productsTitle: '🥦 Маҳсулот',
        productSearch: '🔍 Ҷустуҷӯи маҳсулот...',
        wikiTitle: '📚 Вики',
        allRecipes: '🌍 Ҳамаи дорухатҳо',
        myRecipes: '⭐ Аз ман',
        allCategories: 'Ҳамаи гурӯҳҳо',
        breakfast: 'Наҳорӣ',
        soup: 'Шӯрбоҳо',
        main: 'Асосӣ',
        bakery: 'Нонӣ',
        dessert: 'Ширинӣ',
        snack: 'Газакҳо',
        profileMain: 'Танзимот',
        profilePku: 'ФКУ',
        language: 'Забони барнома',
        saveSettings: 'Сабти танзимот',
        savePersonalization: 'Сабти шахсисозӣ'
      }
    };

    const extendedTranslations = {
      ru: {
        user: 'Пользователь Telegram',
        cloudOn: 'Облачная синхронизация активна',
        cloudOff: 'Облачная синхронизация не настроена',
        cloudSync: 'Синхронизация...',
        cloudSaved: 'Данные сохранены на сервере',
        cloudLoaded: 'Данные загружены с сервера',
        localMode: 'Локальный режим',
        yesterday: 'Вчера',
        today: 'Сегодня',
        tomorrow: 'Завтра',
        pheTitle: 'Фенилаланин (Фа)',
        statusOk: 'В норме',
        statusOver: 'Превышено!',
        remaining: 'Осталось',
        overLimit: 'Перебор',
        naturalProtein: 'Естеств. белок',
        limit: 'Лимит',
        aksTitle: 'Смесь (АКС)',
        portions: 'порций',
        portion: 'порция',
        portionButton: '-я порция',
        mealBreakfast: 'Завтрак',
        mealLunch: 'Обед',
        mealDinner: 'Ужин',
        mealSnack: 'Перекус',
        addToMeal: 'Добавить в',
        addBreakfast: '+ Добавить в завтрак',
        addLunch: '+ Добавить в обед',
        addDinner: '+ Добавить в ужин',
        addSnack: '+ Добавить в перекус',
        mg: 'мг',
        gram: 'г',
        proteinShort: 'г б.',
        proteinFull: 'г белка',
        all: 'Все',
        myProducts: 'Мои продукты',
        veg: 'Овощи',
        fruit: 'Фрукты',
        grain: 'Зерновые',
        dairy: 'Молочные',
        proteinFoods: 'Белковые',
        special: 'Спецпродукты',
        sweet: 'Сладости',
        drink: 'Напитки',
        food: 'Продукт',
        photo: 'Фото',
        nothingFound: 'Ничего не найдено',
        kcal: 'Ккал',
        proteins: 'Белки',
        fats: 'Жиры',
        carbs: 'Углеводы',
        phe: 'ФА',
        gi: 'ГИ',
        productsSourcePrefix: 'Источники данных',
        nutrientsAndPhe: 'КБЖУ и ФА',
        giSource: 'ГИ',
        productsSourceNote: 'Значения справочные, на 100 г продукта; фотографии иллюстративные. Для лечебного питания сверяйте с врачом и упаковкой продукта.',
        wikiPheTitle: 'Что такое ФА',
        wikiPheBody: 'Фенилаланин - аминокислота из белковых продуктов. При ФКУ важно учитывать его количество за день и сравнивать с индивидуальной нормой.',
        wikiPortionTitle: 'Как считать порцию',
        wikiPortionBody: 'Берите значение ФА на 100 г, умножайте на вес порции и делите на 100. Например: 30 мг x 80 г / 100 = 24 мг ФА.',
        wikiAksTitle: 'Смесь АКС',
        wikiAksBody: 'Отмечайте каждую порцию смеси в течение дня. Так легче видеть, что дневной режим выполнен и ничего не забыто.',
        wikiKbjuTitle: 'КБЖУ и ГИ',
        wikiKbjuBody: 'Калории, белки, жиры, углеводы и гликемический индекс помогают оценивать продукт шире, но при ФКУ главным остается контроль ФА и натурального белка.',
        wikiLabelTitle: 'Как читать этикетку',
        wikiLabelBody: 'Смотрите белок на 100 г, состав и вес порции. Если ФА не указан, используйте расчет от натурального белка только как приблизительную оценку.',
        wikiOverTitle: 'Если лимит превышен',
        wikiOverBody: 'Не паникуйте и не отменяйте смесь самостоятельно. Зафиксируйте день в дневнике и обсудите повторяющиеся превышения со специалистом.',
        wikiSwapTitle: 'Низкобелковые замены',
        wikiSwapBody: 'Держите под рукой разрешенные макароны, хлеб, муку и крупы. Замена обычного продукта на низкобелковый часто сильно снижает ФА блюда.',
        wikiMistakesTitle: 'Частые ошибки',
        wikiMistakesBody: 'Не забывайте учитывать перекусы, напитки с добавками, соусы и изменение веса блюда после приготовления.',
        wikiNote: 'Информация в разделе справочная. Индивидуальные нормы и лечебное питание нужно согласовывать с врачом или диетологом.',
        dailyPhe: 'Суточная норма Фа (мг)',
        proteinEquivalent: 'Эквивалент естеств. белка',
        aksPortionsPerDay: 'Количество порций смеси (АКС) в день',
        age: 'Возраст',
        weightKg: 'Вес, кг',
        naturalProteinLimit: 'Лимит натурального белка, г',
        clinician: 'Специалист / диетолог',
        careNotes: 'Заметки по лечению',
        pheWarnings: 'Показывать предупреждения при приближении к лимиту ФА',
        aksReminders: 'Напоминать про порции АКС',
        exampleAge: 'Напр. 8',
        exampleWeight: 'Напр. 24',
        autoByPhe: 'Авто по ФА',
        clinicianPlaceholder: 'Имя или клиника',
        careNotesPlaceholder: 'Например: схема смеси, важные продукты, рекомендации врача',
        addProduct: 'Добавить продукт',
        foodSearch: '🔍 Поиск продукта в базе...',
        foodName: 'Название продукта',
        foodNamePlaceholder: 'Например: Кабачок',
        phePer100: 'Фа на 100г (мг)',
        proteinPer100: 'Белок на 100г (г)',
        portionWeight: 'Вес порции (в граммах)',
        portionTotal: 'Итого в порции:',
        saveToDiary: 'Сохранить в дневник',
        recipeBuilder: '🥣 Конструктор рецепта',
        dishName: 'Название блюда',
        dishNamePlaceholder: 'Например: Овощной суп с вермишелью',
        recipeCategory: 'Категория рецепта',
        addIngredient: 'Добавить ингредиент:',
        chooseProduct: '-- Выберите продукт из базы --',
        ingredientWeight: 'Вес (г)',
        add: '+ Добавить',
        dishIngredients: 'Ингредиенты блюда:',
        noIngredients: 'Ингредиенты еще не добавлены',
        cookedWeight: 'Итоговый вес готового блюда (г)',
        cookedWeightPlaceholder: 'Например: 500',
        weighAfterCooking: 'Взвесьте блюдо после приготовления',
        onePortionWeight: 'Вес одной порции (г)',
        portionPlaceholder: 'Например: 180',
        per100Ready: 'РАСЧЕТ НА 100 Г ГОТОВОГО БЛЮДА:',
        portionSetWeight: 'Порция: укажите вес',
        publishRecipe: '🌍 Опубликовать в общую книгу (виден всем)',
        saveRecipe: 'Сохранить рецепт',
        quickAddDiary: 'Добавить в дневник',
        meal: 'Прием пищи',
        eatenWeight: 'Вес съеденной порции (г)',
        writeToDiary: 'Записать в дневник',
        noMyRecipes: 'У вас пока нет личных рецептов',
        noCommunityRecipes: 'В книге сообщества пока нет рецептов',
        createFirstRecipe: 'Нажмите "+ Создать", чтобы добавить первое блюдо!',
        community: 'Сообщество',
        yourRecipe: 'Ваш рецепт',
        author: 'Автор',
        yield: 'Выход',
        composition: 'Состав:',
        recipePortion: 'Порция',
        toDiary: 'В дневник',
        share: 'Поделиться',
        public: 'Публичный',
        private: 'Личный',
        copiedRecipe: 'Ссылка на рецепт скопирована! Можете отправить её в Telegram.',
        makePublicConfirm: 'Этот рецепт сейчас личный. Сделать его публичным, чтобы получатель смог его открыть?',
        shareRecipeIntro: 'Попробуйте рецепт для диеты ФКУ',
        openRecipeInApp: 'Открыть рецепт в приложении:',
        chooseProductAlert: 'Пожалуйста, выберите продукт',
        ingredientWeightAlert: 'Укажите вес ингредиента в граммах',
        recipeNameAlert: 'Введите название рецепта',
        recipeIngredientAlert: 'Добавьте хотя бы один ингредиент',
        saveRecipeError: 'Не удалось сохранить рецепт на сервере. Проверьте подключение и настройки Supabase.',
        recipeSaved: 'Рецепт успешно сохранен!',
        deleteRecipeConfirm: 'Удалить этот рецепт?',
        diaryWeightAlert: 'Укажите вес съеденной порции',
        foodWeightAlert: 'Укажите вес в граммах',
        diaryServerError: 'Не удалось сохранить запись на сервере. Запись не добавлена.',
        deleteServerError: 'Не удалось удалить запись на сервере.',
        settingsLocalOnly: 'Настройки сохранены локально, но не дошли до сервера.',
        recipeAdded: 'Блюдо "{title}" ({weight}г) добавлено в {meal}!'
      },
      en: {
        user: 'Telegram user',
        cloudOn: 'Cloud sync is active',
        cloudOff: 'Cloud sync is not configured',
        cloudSync: 'Syncing...',
        cloudSaved: 'Data saved to server',
        cloudLoaded: 'Data loaded from server',
        localMode: 'Local mode',
        yesterday: 'Yesterday',
        today: 'Today',
        tomorrow: 'Tomorrow',
        pheTitle: 'Phenylalanine (Phe)',
        statusOk: 'Within limit',
        statusOver: 'Exceeded!',
        remaining: 'Remaining',
        overLimit: 'Over',
        naturalProtein: 'Natural protein',
        limit: 'Limit',
        aksTitle: 'Formula (AA mix)',
        portions: 'portions',
        portion: 'portion',
        portionButton: ' portion',
        mealBreakfast: 'Breakfast',
        mealLunch: 'Lunch',
        mealDinner: 'Dinner',
        mealSnack: 'Snack',
        addToMeal: 'Add to',
        addBreakfast: '+ Add to breakfast',
        addLunch: '+ Add to lunch',
        addDinner: '+ Add to dinner',
        addSnack: '+ Add to snack',
        mg: 'mg',
        gram: 'g',
        proteinShort: 'g prot.',
        proteinFull: 'g protein',
        all: 'All',
        myProducts: 'My foods',
        veg: 'Vegetables',
        fruit: 'Fruits',
        grain: 'Grains',
        dairy: 'Dairy',
        proteinFoods: 'Protein foods',
        special: 'Special foods',
        sweet: 'Sweets',
        drink: 'Drinks',
        food: 'Food',
        photo: 'Photo',
        nothingFound: 'Nothing found',
        kcal: 'Kcal',
        proteins: 'Protein',
        fats: 'Fat',
        carbs: 'Carbs',
        phe: 'Phe',
        gi: 'GI',
        productsSourcePrefix: 'Data sources',
        nutrientsAndPhe: 'nutrition and Phe',
        giSource: 'GI',
        productsSourceNote: 'Values are reference data per 100 g of food; photos are illustrative. For medical nutrition, check with your clinician and the product label.',
        wikiPheTitle: 'What is Phe',
        wikiPheBody: 'Phenylalanine is an amino acid from protein foods. With PKU, it is important to count the daily amount and compare it with your individual limit.',
        wikiPortionTitle: 'How to calculate a portion',
        wikiPortionBody: 'Take the Phe value per 100 g, multiply by portion weight, then divide by 100. Example: 30 mg x 80 g / 100 = 24 mg Phe.',
        wikiAksTitle: 'AA formula',
        wikiAksBody: 'Mark each formula portion during the day. This makes it easier to see that the daily routine is complete.',
        wikiKbjuTitle: 'Nutrition and GI',
        wikiKbjuBody: 'Calories, protein, fat, carbs, and glycemic index help assess food more broadly, but with PKU the key focus remains Phe and natural protein.',
        wikiLabelTitle: 'How to read labels',
        wikiLabelBody: 'Check protein per 100 g, ingredients, and portion weight. If Phe is not listed, estimating from natural protein is only approximate.',
        wikiOverTitle: 'If the limit is exceeded',
        wikiOverBody: 'Do not panic or stop formula on your own. Record the day in the diary and discuss repeated exceedances with your specialist.',
        wikiSwapTitle: 'Low-protein swaps',
        wikiSwapBody: 'Keep approved pasta, bread, flour, and grains nearby. Replacing regular foods with low-protein versions can greatly reduce dish Phe.',
        wikiMistakesTitle: 'Common mistakes',
        wikiMistakesBody: 'Do not forget snacks, flavored drinks, sauces, and changes in dish weight after cooking.',
        wikiNote: 'This section is for reference. Individual limits and medical nutrition should be agreed with a doctor or dietitian.',
        dailyPhe: 'Daily Phe limit (mg)',
        proteinEquivalent: 'Natural protein equivalent',
        aksPortionsPerDay: 'Formula portions per day',
        age: 'Age',
        weightKg: 'Weight, kg',
        naturalProteinLimit: 'Natural protein limit, g',
        clinician: 'Specialist / dietitian',
        careNotes: 'Treatment notes',
        pheWarnings: 'Show warnings when approaching the Phe limit',
        aksReminders: 'Remind me about formula portions',
        exampleAge: 'E.g. 8',
        exampleWeight: 'E.g. 24',
        autoByPhe: 'Auto by Phe',
        clinicianPlaceholder: 'Name or clinic',
        careNotesPlaceholder: 'Example: formula schedule, important foods, doctor recommendations',
        addProduct: 'Add food',
        foodSearch: '🔍 Search foods...',
        foodName: 'Food name',
        foodNamePlaceholder: 'Example: Zucchini',
        phePer100: 'Phe per 100g (mg)',
        proteinPer100: 'Protein per 100g (g)',
        portionWeight: 'Portion weight (grams)',
        portionTotal: 'Portion total:',
        saveToDiary: 'Save to diary',
        recipeBuilder: '🥣 Recipe builder',
        dishName: 'Dish name',
        dishNamePlaceholder: 'Example: vegetable soup with noodles',
        recipeCategory: 'Recipe category',
        addIngredient: 'Add ingredient:',
        chooseProduct: '-- Choose a food from the database --',
        ingredientWeight: 'Weight (g)',
        add: '+ Add',
        dishIngredients: 'Dish ingredients:',
        noIngredients: 'No ingredients added yet',
        cookedWeight: 'Final cooked dish weight (g)',
        cookedWeightPlaceholder: 'Example: 500',
        weighAfterCooking: 'Weigh the dish after cooking',
        onePortionWeight: 'One portion weight (g)',
        portionPlaceholder: 'Example: 180',
        per100Ready: 'CALCULATION PER 100 G OF COOKED DISH:',
        portionSetWeight: 'Portion: enter weight',
        publishRecipe: '🌍 Publish to the shared book (visible to everyone)',
        saveRecipe: 'Save recipe',
        quickAddDiary: 'Add to diary',
        meal: 'Meal',
        eatenWeight: 'Eaten portion weight (g)',
        writeToDiary: 'Record in diary',
        noMyRecipes: 'You do not have personal recipes yet',
        noCommunityRecipes: 'The community book has no recipes yet',
        createFirstRecipe: 'Tap "+ Create" to add the first dish!',
        community: 'Community',
        yourRecipe: 'Your recipe',
        author: 'Author',
        yield: 'Yield',
        composition: 'Ingredients:',
        recipePortion: 'Portion',
        toDiary: 'To diary',
        share: 'Share',
        public: 'Public',
        private: 'Private',
        copiedRecipe: 'Recipe link copied! You can send it in Telegram.',
        makePublicConfirm: 'This recipe is private. Make it public so the recipient can open it?',
        shareRecipeIntro: 'Try this PKU diet recipe',
        openRecipeInApp: 'Open the recipe in the app:',
        chooseProductAlert: 'Please choose a food',
        ingredientWeightAlert: 'Enter ingredient weight in grams',
        recipeNameAlert: 'Enter a recipe name',
        recipeIngredientAlert: 'Add at least one ingredient',
        saveRecipeError: 'Could not save the recipe to the server. Check the connection and Supabase settings.',
        recipeSaved: 'Recipe saved!',
        deleteRecipeConfirm: 'Delete this recipe?',
        diaryWeightAlert: 'Enter eaten portion weight',
        foodWeightAlert: 'Enter weight in grams',
        diaryServerError: 'Could not save the entry to the server. The entry was not added.',
        deleteServerError: 'Could not delete the entry from the server.',
        settingsLocalOnly: 'Settings were saved locally but did not reach the server.',
        recipeAdded: 'Dish "{title}" ({weight}g) was added to {meal}!'
      },
      uz: {
        user: 'Telegram foydalanuvchisi',
        cloudOn: 'Bulutli sinxronlash faol',
        cloudOff: 'Bulutli sinxronlash sozlanmagan',
        cloudSync: 'Sinxronlanmoqda...',
        cloudSaved: 'Ma’lumotlar serverga saqlandi',
        cloudLoaded: 'Ma’lumotlar serverdan yuklandi',
        localMode: 'Mahalliy rejim',
        yesterday: 'Kecha',
        today: 'Bugun',
        tomorrow: 'Ertaga',
        pheTitle: 'Fenilalanin (FA)',
        statusOk: 'Me’yorda',
        statusOver: 'Oshib ketdi!',
        remaining: 'Qoldi',
        overLimit: 'Ortiqcha',
        naturalProtein: 'Tabiiy oqsil',
        limit: 'Limit',
        aksTitle: 'Aralashma (AKS)',
        portions: 'porsiya',
        portion: 'porsiya',
        portionButton: '-porsiya',
        mealBreakfast: 'Nonushta',
        mealLunch: 'Tushlik',
        mealDinner: 'Kechki ovqat',
        mealSnack: 'Tamaddi',
        addToMeal: 'Qo‘shish',
        addBreakfast: '+ Nonushtaga qo‘shish',
        addLunch: '+ Tushlikka qo‘shish',
        addDinner: '+ Kechki ovqatga qo‘shish',
        addSnack: '+ Tamaddiga qo‘shish',
        mg: 'mg',
        gram: 'g',
        proteinShort: 'g oqsil',
        proteinFull: 'g oqsil',
        all: 'Hammasi',
        myProducts: 'Mening mahsulotlarim',
        veg: 'Sabzavotlar',
        fruit: 'Mevalar',
        grain: 'Don mahsulotlari',
        dairy: 'Sut mahsulotlari',
        proteinFoods: 'Oqsilli',
        special: 'Maxsus mahsulotlar',
        sweet: 'Shirinliklar',
        drink: 'Ichimliklar',
        food: 'Mahsulot',
        photo: 'Foto',
        nothingFound: 'Hech narsa topilmadi',
        kcal: 'Kkal',
        proteins: 'Oqsil',
        fats: 'Yog‘',
        carbs: 'Uglevod',
        phe: 'FA',
        gi: 'GI',
        productsSourcePrefix: 'Ma’lumot manbalari',
        nutrientsAndPhe: 'KBJU va FA',
        giSource: 'GI',
        productsSourceNote: 'Qiymatlar 100 g mahsulot uchun ma’lumot sifatida berilgan; suratlar tasviriy. Davolovchi ovqatlanish bo‘yicha shifokor va mahsulot yorlig‘i bilan solishtiring.',
        wikiPheTitle: 'FA nima',
        wikiPheBody: 'Fenilalanin oqsilli mahsulotlardagi aminokislotadir. FKUda uning kunlik miqdorini hisoblash va shaxsiy norma bilan solishtirish muhim.',
        wikiPortionTitle: 'Porsiyani qanday hisoblash',
        wikiPortionBody: '100 g dagi FA qiymatini porsiya vazniga ko‘paytiring va 100 ga bo‘ling. Masalan: 30 mg x 80 g / 100 = 24 mg FA.',
        wikiAksTitle: 'AKS aralashmasi',
        wikiAksBody: 'Kun davomida har bir aralashma porsiyasini belgilang. Bu kunlik tartib bajarilganini ko‘rishga yordam beradi.',
        wikiKbjuTitle: 'KBJU va GI',
        wikiKbjuBody: 'Kaloriya, oqsil, yog‘, uglevod va glikemik indeks mahsulotni kengroq baholashga yordam beradi, ammo FKUda asosiy nazorat FA va tabiiy oqsildir.',
        wikiLabelTitle: 'Yorliqni qanday o‘qish',
        wikiLabelBody: '100 g dagi oqsil, tarkib va porsiya vazniga qarang. FA ko‘rsatilmagan bo‘lsa, tabiiy oqsil bo‘yicha hisob faqat taxminiydir.',
        wikiOverTitle: 'Limit oshib ketsa',
        wikiOverBody: 'Vahima qilmang va aralashmani mustaqil bekor qilmang. Kunni kundalikda yozib boring va takroriy oshishlarni mutaxassis bilan muhokama qiling.',
        wikiSwapTitle: 'Kam oqsilli almashtirishlar',
        wikiSwapBody: 'Ruxsat etilgan makaron, non, un va yormalarni qo‘lda saqlang. Oddiy mahsulotni kam oqsilli turiga almashtirish taomdagi FAni kamaytiradi.',
        wikiMistakesTitle: 'Ko‘p uchraydigan xatolar',
        wikiMistakesBody: 'Tamaddilar, qo‘shimchali ichimliklar, souslar va pishirgandan keyin taom vazni o‘zgarishini unutmaslik kerak.',
        wikiNote: 'Bu bo‘lim ma’lumot uchun. Shaxsiy normalar va davolovchi ovqatlanish shifokor yoki dietolog bilan kelishilishi kerak.',
        dailyPhe: 'Kunlik FA normasi (mg)',
        proteinEquivalent: 'Tabiiy oqsil ekvivalenti',
        aksPortionsPerDay: 'Kunlik aralashma (AKS) porsiyalari',
        age: 'Yosh',
        weightKg: 'Vazn, kg',
        naturalProteinLimit: 'Tabiiy oqsil limiti, g',
        clinician: 'Mutaxassis / dietolog',
        careNotes: 'Davolash qaydlari',
        pheWarnings: 'FA limitiga yaqinlashganda ogohlantirish ko‘rsatish',
        aksReminders: 'AKS porsiyalari haqida eslatish',
        exampleAge: 'Masalan: 8',
        exampleWeight: 'Masalan: 24',
        autoByPhe: 'FA bo‘yicha avtomatik',
        clinicianPlaceholder: 'Ism yoki klinika',
        careNotesPlaceholder: 'Masalan: aralashma rejasi, muhim mahsulotlar, shifokor tavsiyalari',
        addProduct: 'Mahsulot qo‘shish',
        foodSearch: '🔍 Bazadan mahsulot qidirish...',
        foodName: 'Mahsulot nomi',
        foodNamePlaceholder: 'Masalan: Qovoqcha',
        phePer100: '100g dagi FA (mg)',
        proteinPer100: '100g dagi oqsil (g)',
        portionWeight: 'Porsiya vazni (gramm)',
        portionTotal: 'Porsiya jami:',
        saveToDiary: 'Kundalikka saqlash',
        recipeBuilder: '🥣 Retsept konstruktori',
        dishName: 'Taom nomi',
        dishNamePlaceholder: 'Masalan: vermishelli sabzavot sho‘rva',
        recipeCategory: 'Retsept toifasi',
        addIngredient: 'Ingredient qo‘shish:',
        chooseProduct: '-- Bazadan mahsulot tanlang --',
        ingredientWeight: 'Vazn (g)',
        add: '+ Qo‘shish',
        dishIngredients: 'Taom ingredientlari:',
        noIngredients: 'Ingredientlar hali qo‘shilmagan',
        cookedWeight: 'Tayyor taomning yakuniy vazni (g)',
        cookedWeightPlaceholder: 'Masalan: 500',
        weighAfterCooking: 'Taomni pishirgandan keyin torting',
        onePortionWeight: 'Bitta porsiya vazni (g)',
        portionPlaceholder: 'Masalan: 180',
        per100Ready: 'TAYYOR TAOMNING 100 G UCHUN HISOBI:',
        portionSetWeight: 'Porsiya: vazn kiriting',
        publishRecipe: '🌍 Umumiy kitobga chiqarish (hammaga ko‘rinadi)',
        saveRecipe: 'Retseptni saqlash',
        quickAddDiary: 'Kundalikka qo‘shish',
        meal: 'Ovqatlanish',
        eatenWeight: 'Yeyilgan porsiya vazni (g)',
        writeToDiary: 'Kundalikka yozish',
        noMyRecipes: 'Sizda hali shaxsiy retseptlar yo‘q',
        noCommunityRecipes: 'Jamiyat kitobida hali retseptlar yo‘q',
        createFirstRecipe: 'Birinchi taomni qo‘shish uchun "+ Yaratish" tugmasini bosing!',
        community: 'Jamiyat',
        yourRecipe: 'Sizning retseptingiz',
        author: 'Muallif',
        yield: 'Chiqish',
        composition: 'Tarkib:',
        recipePortion: 'Porsiya',
        toDiary: 'Kundalikka',
        share: 'Ulashish',
        public: 'Ommaviy',
        private: 'Shaxsiy',
        copiedRecipe: 'Retsept havolasi nusxalandi! Uni Telegramda yuborishingiz mumkin.',
        makePublicConfirm: 'Bu retsept hozir shaxsiy. Qabul qiluvchi ochishi uchun uni ommaviy qilasizmi?',
        shareRecipeIntro: 'FKU dietasi uchun retseptni sinab ko‘ring',
        openRecipeInApp: 'Retseptni ilovada ochish:',
        chooseProductAlert: 'Iltimos, mahsulot tanlang',
        ingredientWeightAlert: 'Ingredient vaznini grammda kiriting',
        recipeNameAlert: 'Retsept nomini kiriting',
        recipeIngredientAlert: 'Kamida bitta ingredient qo‘shing',
        saveRecipeError: 'Retseptni serverga saqlab bo‘lmadi. Ulanish va Supabase sozlamalarini tekshiring.',
        recipeSaved: 'Retsept saqlandi!',
        deleteRecipeConfirm: 'Bu retsept o‘chirilsinmi?',
        diaryWeightAlert: 'Yeyilgan porsiya vaznini kiriting',
        foodWeightAlert: 'Vaznni grammda kiriting',
        diaryServerError: 'Yozuvni serverga saqlab bo‘lmadi. Yozuv qo‘shilmadi.',
        deleteServerError: 'Yozuvni serverdan o‘chirib bo‘lmadi.',
        settingsLocalOnly: 'Sozlamalar mahalliy saqlandi, lekin serverga yetib bormadi.',
        recipeAdded: '"{title}" taomi ({weight}g) {meal}ga qo‘shildi!'
      },
      kk: {
        user: 'Telegram пайдаланушысы',
        cloudOn: 'Бұлттық синхрондау белсенді',
        cloudOff: 'Бұлттық синхрондау бапталмаған',
        cloudSync: 'Синхрондалуда...',
        cloudSaved: 'Деректер серверге сақталды',
        cloudLoaded: 'Деректер серверден жүктелді',
        localMode: 'Жергілікті режим',
        yesterday: 'Кеше',
        today: 'Бүгін',
        tomorrow: 'Ертең',
        pheTitle: 'Фенилаланин (ФА)',
        statusOk: 'Нормада',
        statusOver: 'Артық!',
        remaining: 'Қалды',
        overLimit: 'Артық',
        naturalProtein: 'Табиғи ақуыз',
        limit: 'Лимит',
        aksTitle: 'Қоспа (АКС)',
        portions: 'порция',
        portion: 'порция',
        portionButton: '-порция',
        mealBreakfast: 'Таңғы ас',
        mealLunch: 'Түскі ас',
        mealDinner: 'Кешкі ас',
        mealSnack: 'Тіскебасар',
        addToMeal: 'Қосу',
        addBreakfast: '+ Таңғы асқа қосу',
        addLunch: '+ Түскі асқа қосу',
        addDinner: '+ Кешкі асқа қосу',
        addSnack: '+ Тіскебасарға қосу',
        mg: 'мг',
        gram: 'г',
        proteinShort: 'г ақуыз',
        proteinFull: 'г ақуыз',
        all: 'Барлығы',
        myProducts: 'Менің өнімдерім',
        veg: 'Көкөністер',
        fruit: 'Жемістер',
        grain: 'Дәнді дақылдар',
        dairy: 'Сүт өнімдері',
        proteinFoods: 'Ақуызды',
        special: 'Арнайы өнімдер',
        sweet: 'Тәттілер',
        drink: 'Сусындар',
        food: 'Өнім',
        photo: 'Фото',
        nothingFound: 'Ештеңе табылмады',
        kcal: 'Ккал',
        proteins: 'Ақуыз',
        fats: 'Май',
        carbs: 'Көмірсу',
        phe: 'ФА',
        gi: 'ГИ',
        productsSourcePrefix: 'Дереккөздер',
        nutrientsAndPhe: 'КБМУ және ФА',
        giSource: 'ГИ',
        productsSourceNote: 'Мәндер 100 г өнімге арналған анықтамалық дерек; фотосуреттер иллюстрациялық. Емдік тамақтану үшін дәрігермен және өнім қаптамасымен салыстырыңыз.',
        wikiPheTitle: 'ФА деген не',
        wikiPheBody: 'Фенилаланин - ақуызды өнімдердегі аминқышқыл. ФКУ кезінде оның күндік мөлшерін есептеп, жеке нормамен салыстыру маңызды.',
        wikiPortionTitle: 'Порцияны қалай есептеу',
        wikiPortionBody: '100 г-дағы ФА мәнін порция салмағына көбейтіп, 100-ге бөліңіз. Мысалы: 30 мг x 80 г / 100 = 24 мг ФА.',
        wikiAksTitle: 'АКС қоспасы',
        wikiAksBody: 'Күн ішінде әр қоспа порциясын белгілеңіз. Бұл күндік режимнің орындалғанын көруге көмектеседі.',
        wikiKbjuTitle: 'КБМУ және ГИ',
        wikiKbjuBody: 'Калория, ақуыз, май, көмірсу және гликемиялық индекс өнімді кеңірек бағалауға көмектеседі, бірақ ФКУ кезінде негізгі бақылау ФА мен табиғи ақуызда.',
        wikiLabelTitle: 'Заттаңбаны қалай оқу',
        wikiLabelBody: '100 г-дағы ақуызды, құрамын және порция салмағын қараңыз. ФА көрсетілмесе, табиғи ақуыз бойынша есеп тек шамамен болады.',
        wikiOverTitle: 'Лимит асып кетсе',
        wikiOverBody: 'Дүрлікпеңіз және қоспаны өз бетіңізше тоқтатпаңыз. Күнді күнделікке тіркеп, қайталанатын асып кетуді маманмен талқылаңыз.',
        wikiSwapTitle: 'Төмен ақуызды алмастырулар',
        wikiSwapBody: 'Рұқсат етілген макарон, нан, ұн және жарманы қолда ұстаңыз. Әдеттегі өнімді төмен ақуызды түріне ауыстыру тағамдағы ФА-ны едәуір азайтады.',
        wikiMistakesTitle: 'Жиі қателер',
        wikiMistakesBody: 'Тіскебасарларды, қоспалары бар сусындарды, тұздықтарды және пісіргеннен кейін тағам салмағының өзгеруін ұмытпаңыз.',
        wikiNote: 'Бұл бөлім анықтамалық. Жеке нормалар мен емдік тамақтануды дәрігер немесе диетологпен келісу керек.',
        dailyPhe: 'Күндік ФА нормасы (мг)',
        proteinEquivalent: 'Табиғи ақуыз баламасы',
        aksPortionsPerDay: 'Күніне қоспа (АКС) порциялары',
        age: 'Жас',
        weightKg: 'Салмақ, кг',
        naturalProteinLimit: 'Табиғи ақуыз лимиті, г',
        clinician: 'Маман / диетолог',
        careNotes: 'Емдеу жазбалары',
        pheWarnings: 'ФА лимитіне жақындағанда ескерту көрсету',
        aksReminders: 'АКС порцияларын еске салу',
        exampleAge: 'Мысалы: 8',
        exampleWeight: 'Мысалы: 24',
        autoByPhe: 'ФА бойынша авто',
        clinicianPlaceholder: 'Аты немесе клиника',
        careNotesPlaceholder: 'Мысалы: қоспа кестесі, маңызды өнімдер, дәрігер ұсыныстары',
        addProduct: 'Өнім қосу',
        foodSearch: '🔍 Базадан өнім іздеу...',
        foodName: 'Өнім атауы',
        foodNamePlaceholder: 'Мысалы: Кәді',
        phePer100: '100г ФА (мг)',
        proteinPer100: '100г ақуыз (г)',
        portionWeight: 'Порция салмағы (грамм)',
        portionTotal: 'Порция жиыны:',
        saveToDiary: 'Күнделікке сақтау',
        recipeBuilder: '🥣 Рецепт құрастырғыш',
        dishName: 'Тағам атауы',
        dishNamePlaceholder: 'Мысалы: кеспелі көкөніс сорпасы',
        recipeCategory: 'Рецепт санаты',
        addIngredient: 'Ингредиент қосу:',
        chooseProduct: '-- Базадан өнім таңдаңыз --',
        ingredientWeight: 'Салмақ (г)',
        add: '+ Қосу',
        dishIngredients: 'Тағам ингредиенттері:',
        noIngredients: 'Ингредиенттер әлі қосылмаған',
        cookedWeight: 'Дайын тағамның соңғы салмағы (г)',
        cookedWeightPlaceholder: 'Мысалы: 500',
        weighAfterCooking: 'Тағамды пісіргеннен кейін өлшеңіз',
        onePortionWeight: 'Бір порция салмағы (г)',
        portionPlaceholder: 'Мысалы: 180',
        per100Ready: 'ДАЙЫН ТАҒАМНЫҢ 100 Г ЕСЕБІ:',
        portionSetWeight: 'Порция: салмақ енгізіңіз',
        publishRecipe: '🌍 Ортақ кітапқа жариялау (бәріне көрінеді)',
        saveRecipe: 'Рецептті сақтау',
        quickAddDiary: 'Күнделікке қосу',
        meal: 'Тамақтану',
        eatenWeight: 'Желінген порция салмағы (г)',
        writeToDiary: 'Күнделікке жазу',
        noMyRecipes: 'Сізде әзірше жеке рецепт жоқ',
        noCommunityRecipes: 'Қауымдастық кітабында әзірше рецепт жоқ',
        createFirstRecipe: 'Алғашқы тағамды қосу үшін "+ Қосу" басыңыз!',
        community: 'Қауымдастық',
        yourRecipe: 'Сіздің рецептіңіз',
        author: 'Автор',
        yield: 'Шығым',
        composition: 'Құрамы:',
        recipePortion: 'Порция',
        toDiary: 'Күнделікке',
        share: 'Бөлісу',
        public: 'Жария',
        private: 'Жеке',
        copiedRecipe: 'Рецепт сілтемесі көшірілді! Оны Telegram арқылы жібере аласыз.',
        makePublicConfirm: 'Бұл рецепт қазір жеке. Алушы аша алуы үшін оны жария етесіз бе?',
        shareRecipeIntro: 'ФКУ диетасына арналған рецептті байқап көріңіз',
        openRecipeInApp: 'Рецептті қолданбада ашу:',
        chooseProductAlert: 'Өнім таңдаңыз',
        ingredientWeightAlert: 'Ингредиент салмағын граммен енгізіңіз',
        recipeNameAlert: 'Рецепт атауын енгізіңіз',
        recipeIngredientAlert: 'Кемінде бір ингредиент қосыңыз',
        saveRecipeError: 'Рецептті серверге сақтау мүмкін болмады. Байланыс пен Supabase баптауларын тексеріңіз.',
        recipeSaved: 'Рецепт сақталды!',
        deleteRecipeConfirm: 'Бұл рецепт жойылсын ба?',
        diaryWeightAlert: 'Желінген порция салмағын енгізіңіз',
        foodWeightAlert: 'Салмақты граммен енгізіңіз',
        diaryServerError: 'Жазбаны серверге сақтау мүмкін болмады. Жазба қосылмады.',
        deleteServerError: 'Жазбаны серверден жою мүмкін болмады.',
        settingsLocalOnly: 'Баптаулар жергілікті сақталды, бірақ серверге жетпеді.',
        recipeAdded: '"{title}" тағамы ({weight}г) {meal} ішіне қосылды!'
      },
      tg: {
        user: 'Корбари Telegram',
        cloudOn: 'Ҳамоҳангсозии абрӣ фаъол аст',
        cloudOff: 'Ҳамоҳангсозии абрӣ танзим нашудааст',
        cloudSync: 'Ҳамоҳангсозӣ...',
        cloudSaved: 'Маълумот дар сервер сабт шуд',
        cloudLoaded: 'Маълумот аз сервер бор шуд',
        localMode: 'Ҳолати маҳаллӣ',
        yesterday: 'Дирӯз',
        today: 'Имрӯз',
        tomorrow: 'Пагоҳ',
        pheTitle: 'Фенилаланин (ФА)',
        statusOk: 'Дар меъёр',
        statusOver: 'Зиёд шуд!',
        remaining: 'Боқӣ',
        overLimit: 'Зиёдатӣ',
        naturalProtein: 'Сафедаи табиӣ',
        limit: 'Лимит',
        aksTitle: 'Омехта (АКС)',
        portions: 'порсия',
        portion: 'порсия',
        portionButton: '-ум порсия',
        mealBreakfast: 'Наҳорӣ',
        mealLunch: 'Хӯроки нисфирӯзӣ',
        mealDinner: 'Шом',
        mealSnack: 'Газак',
        addToMeal: 'Илова ба',
        addBreakfast: '+ Ба наҳорӣ илова кунед',
        addLunch: '+ Ба нисфирӯзӣ илова кунед',
        addDinner: '+ Ба шом илова кунед',
        addSnack: '+ Ба газак илова кунед',
        mg: 'мг',
        gram: 'г',
        proteinShort: 'г сафеда',
        proteinFull: 'г сафеда',
        all: 'Ҳама',
        myProducts: 'Маҳсулоти ман',
        veg: 'Сабзавот',
        fruit: 'Меваҳо',
        grain: 'Ғалладона',
        dairy: 'Ширӣ',
        proteinFoods: 'Сафедадор',
        special: 'Маҳсулоти махсус',
        sweet: 'Шириниҳо',
        drink: 'Нӯшокиҳо',
        food: 'Маҳсулот',
        photo: 'Акс',
        nothingFound: 'Ҳеҷ чиз ёфт нашуд',
        kcal: 'Ккал',
        proteins: 'Сафеда',
        fats: 'Равған',
        carbs: 'Карб.',
        phe: 'ФА',
        gi: 'ГИ',
        productsSourcePrefix: 'Манбаъҳои маълумот',
        nutrientsAndPhe: 'КБЖУ ва ФА',
        giSource: 'ГИ',
        productsSourceNote: 'Арзишҳо маълумотӣ буда, барои 100 г маҳсулот дода шудаанд; аксҳо тасвирӣ мебошанд. Барои ғизои табобатӣ бо духтур ва тамғаи маҳсулот санҷед.',
        wikiPheTitle: 'ФА чист',
        wikiPheBody: 'Фенилаланин аминокислотаест аз маҳсулоти сафедадор. Ҳангоми ФКУ ҳисоб кардани миқдори рӯзона ва муқоиса бо меъёри шахсӣ муҳим аст.',
        wikiPortionTitle: 'Порсияро чӣ гуна ҳисоб кардан',
        wikiPortionBody: 'Қимати ФА барои 100 г-ро ба вазни порсия зарб кунед ва ба 100 тақсим кунед. Масалан: 30 мг x 80 г / 100 = 24 мг ФА.',
        wikiAksTitle: 'Омехтаи АКС',
        wikiAksBody: 'Ҳар порсияи омехтаро дар давоми рӯз қайд кунед. Ин кӯмак мекунад, ки иҷрои реҷаи рӯзона дида шавад.',
        wikiKbjuTitle: 'КБЖУ ва ГИ',
        wikiKbjuBody: 'Калория, сафеда, равған, карбогидрат ва индекси гликемикӣ маҳсулотро васеътар арзёбӣ мекунанд, аммо дар ФКУ назорати асосӣ ФА ва сафедаи табиӣ аст.',
        wikiLabelTitle: 'Тамғаро чӣ гуна хондан',
        wikiLabelBody: 'Сафеда барои 100 г, таркиб ва вазни порсияро бинед. Агар ФА нишон дода нашуда бошад, ҳисоб аз сафедаи табиӣ танҳо тахминӣ аст.',
        wikiOverTitle: 'Агар лимит зиёд шавад',
        wikiOverBody: 'Воҳима накунед ва омехтаро худсарона қатъ накунед. Рӯзро дар рӯзнома қайд кунед ва зиёдшавии такрориро бо мутахассис муҳокима кунед.',
        wikiSwapTitle: 'Ивазҳои камсафеда',
        wikiSwapBody: 'Макарон, нон, орд ва ғалладонаи иҷозатшударо дар даст нигоҳ доред. Иваз кардани маҳсулоти оддӣ бо камсафеда ФА-и таомро хеле кам мекунад.',
        wikiMistakesTitle: 'Хатоҳои маъмул',
        wikiMistakesBody: 'Газакҳо, нӯшокиҳои бо иловаҳо, соусҳо ва тағйири вазни таом баъди пухтанро фаромӯш накунед.',
        wikiNote: 'Ин бахш маълумотӣ аст. Меъёрҳои шахсӣ ва ғизои табобатӣ бояд бо духтур ё диетолог мувофиқа шаванд.',
        dailyPhe: 'Меъёри рӯзонаи ФА (мг)',
        proteinEquivalent: 'Муодили сафедаи табиӣ',
        aksPortionsPerDay: 'Порсияҳои омехта (АКС) дар рӯз',
        age: 'Синну сол',
        weightKg: 'Вазн, кг',
        naturalProteinLimit: 'Лимити сафедаи табиӣ, г',
        clinician: 'Мутахассис / диетолог',
        careNotes: 'Қайдҳои табобат',
        pheWarnings: 'Ҳангоми наздик шудан ба лимити ФА огоҳӣ нишон диҳед',
        aksReminders: 'Дар бораи порсияҳои АКС ёдрас кунед',
        exampleAge: 'Масалан: 8',
        exampleWeight: 'Масалан: 24',
        autoByPhe: 'Авто аз рӯи ФА',
        clinicianPlaceholder: 'Ном ё клиника',
        careNotesPlaceholder: 'Масалан: нақшаи омехта, маҳсулоти муҳим, тавсияҳои духтур',
        addProduct: 'Иловаи маҳсулот',
        foodSearch: '🔍 Ҷустуҷӯи маҳсулот дар база...',
        foodName: 'Номи маҳсулот',
        foodNamePlaceholder: 'Масалан: Кабачок',
        phePer100: 'ФА барои 100г (мг)',
        proteinPer100: 'Сафеда барои 100г (г)',
        portionWeight: 'Вазни порсия (грамм)',
        portionTotal: 'Ҳамагӣ дар порсия:',
        saveToDiary: 'Сабт ба рӯзнома',
        recipeBuilder: '🥣 Созандаи дорухат',
        dishName: 'Номи таом',
        dishNamePlaceholder: 'Масалан: шӯрбои сабзавот бо вермишел',
        recipeCategory: 'Гурӯҳи дорухат',
        addIngredient: 'Иловаи ингредиент:',
        chooseProduct: '-- Аз база маҳсулот интихоб кунед --',
        ingredientWeight: 'Вазн (г)',
        add: '+ Илова',
        dishIngredients: 'Ингредиентҳои таом:',
        noIngredients: 'Ингредиентҳо ҳанӯз илова нашудаанд',
        cookedWeight: 'Вазни ниҳоии таоми тайёр (г)',
        cookedWeightPlaceholder: 'Масалан: 500',
        weighAfterCooking: 'Таомро баъди пухтан баркашед',
        onePortionWeight: 'Вазни як порсия (г)',
        portionPlaceholder: 'Масалан: 180',
        per100Ready: 'ҲИСОБ БАРОИ 100 Г ТАОМИ ТАЙЁР:',
        portionSetWeight: 'Порсия: вазнро ворид кунед',
        publishRecipe: '🌍 Дар китоби умумӣ нашр кунед (ба ҳама намоён)',
        saveRecipe: 'Сабти дорухат',
        quickAddDiary: 'Илова ба рӯзнома',
        meal: 'Қабули ғизо',
        eatenWeight: 'Вазни порсияи хӯрдашуда (г)',
        writeToDiary: 'Ба рӯзнома навиштан',
        noMyRecipes: 'Шумо ҳанӯз дорухати шахсӣ надоред',
        noCommunityRecipes: 'Дар китоби ҷомеа ҳанӯз дорухат нест',
        createFirstRecipe: 'Барои илова кардани таоми аввал "+ Эҷод" -ро пахш кунед!',
        community: 'Ҷомеа',
        yourRecipe: 'Дорухати шумо',
        author: 'Муаллиф',
        yield: 'Баромад',
        composition: 'Таркиб:',
        recipePortion: 'Порсия',
        toDiary: 'Ба рӯзнома',
        share: 'Мубодила',
        public: 'Оммавӣ',
        private: 'Шахсӣ',
        copiedRecipe: 'Пайванди дорухат нусха шуд! Метавонед онро дар Telegram фиристед.',
        makePublicConfirm: 'Ин дорухат шахсӣ аст. Онро оммавӣ кунем, то қабулкунанда кушода тавонад?',
        shareRecipeIntro: 'Ин дорухатро барои парҳези ФКУ санҷед',
        openRecipeInApp: 'Дорухатро дар барнома кушоед:',
        chooseProductAlert: 'Лутфан маҳсулот интихоб кунед',
        ingredientWeightAlert: 'Вазни ингредиентро бо грамм ворид кунед',
        recipeNameAlert: 'Номи дорухатро ворид кунед',
        recipeIngredientAlert: 'Ҳадди ақал як ингредиент илова кунед',
        saveRecipeError: 'Дорухатро дар сервер сабт карда нашуд. Пайвастшавӣ ва танзимоти Supabase-ро санҷед.',
        recipeSaved: 'Дорухат сабт шуд!',
        deleteRecipeConfirm: 'Ин дорухат нест карда шавад?',
        diaryWeightAlert: 'Вазни порсияи хӯрдашударо ворид кунед',
        foodWeightAlert: 'Вазнро бо грамм ворид кунед',
        diaryServerError: 'Сабтро дар сервер нигоҳ дошта нашуд. Сабт илова нашуд.',
        deleteServerError: 'Сабтро аз сервер нест карда нашуд.',
        settingsLocalOnly: 'Танзимот маҳаллӣ сабт шуд, вале ба сервер нарасид.',
        recipeAdded: 'Таоми "{title}" ({weight}г) ба {meal} илова шуд!'
      }
    };

    Object.keys(extendedTranslations).forEach((lang) => {
      i18n[lang] = { ...(i18n[lang] || {}), ...extendedTranslations[lang] };
    });

    function tr(key) {
      const lang = appData?.settings?.language || 'ru';
      return i18n[lang]?.[key] || i18n.ru[key] || key;
    }

    const localeByLanguage = {
      ru: 'ru-RU',
      en: 'en-US',
      uz: 'uz-UZ',
      kk: 'kk-KZ',
      tg: 'tg-TJ'
    };

    const mealTranslationKeys = {
      'Завтрак': 'mealBreakfast',
      'Обед': 'mealLunch',
      'Ужин': 'mealDinner',
      'Перекус': 'mealSnack'
    };

    function mealLabel(meal) {
      return tr(mealTranslationKeys[meal] || meal) || meal;
    }

    function unitPhe(value) {
      return value + ' ' + tr('mg') + ' ' + tr('phe');
    }

    function unitProtein(value) {
      return value + ' ' + tr('proteinShort');
    }

    function unitGram(value) {
      return value + ' ' + tr('gram');
    }

    let appData = {
      settings: { ...defaultSettings },
      today: getFormattedDate(currentDateObj),
      aks: [false, false, false, false],
      entries: []
    };

    let activeMeal = 'Завтрак';

    function supabaseHeaders(extra = {}) {
      return {
        apikey: DB_KEY,
        Authorization: 'Bearer ' + DB_KEY,
        ...extra
      };
    }

    async function supabaseRequest(path, options = {}) {
      if (!hasSupabase) {
        throw new Error('Supabase is not configured');
      }

      const res = await fetch(DB_URL + path, {
        ...options,
        headers: {
          ...supabaseHeaders(),
          ...(options.headers || {})
        }
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || ('Supabase request failed: ' + res.status));
      }

      if (res.status === 204) return null;
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    }

    function setCloudStatus(state, message) {
      const badge = document.getElementById('profileCloudBadge');
      if (!badge) return;

      const states = {
        ok: ['#dcfce7', '#15803d', '● '],
        pending: ['#fef3c7', '#b45309', '● '],
        error: ['#fee2e2', '#b91c1c', '● '],
        off: ['#f1f5f9', '#64748b', '● ']
      };
      const [bg, color, prefix] = states[state] || states.off;
      badge.style.background = bg;
      badge.style.color = color;
      badge.textContent = prefix + message;
    }

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char]));
    }

    function setText(selector, text) {
      const el = document.querySelector(selector);
      if (el) el.textContent = text;
    }

    function setPlaceholder(selector, text) {
      const el = document.querySelector(selector);
      if (el) el.placeholder = text;
    }

    function setAllText(selectors, values) {
      document.querySelectorAll(selectors).forEach((el, index) => {
        if (values[index] !== undefined) el.textContent = values[index];
      });
    }

    function setRecipeCategoryOptions() {
      const select = document.getElementById('recipeCategorySelect');
      if (!select) return;
      const current = select.value || 'main';
      [
        ['main', tr('main')],
        ['breakfast', tr('breakfast')],
        ['soup', tr('soup')],
        ['bakery', tr('bakery')],
        ['dessert', tr('dessert')],
        ['snack', tr('snack')]
      ].forEach(([value, label]) => {
        const option = select.querySelector(`option[value="${value}"]`);
        if (option) option.textContent = label;
      });
      select.value = current;
    }

    function setQuickMealOptions() {
      const select = document.getElementById('quickRecipeMealSelect');
      if (!select) return;
      const current = select.value || 'Обед';
      const labels = {
        'Завтрак': '☀️ ' + tr('mealBreakfast'),
        'Обед': '🍲 ' + tr('mealLunch'),
        'Ужин': '🌙 ' + tr('mealDinner'),
        'Перекус': '🍎 ' + tr('mealSnack')
      };
      Array.from(select.options).forEach((option) => {
        option.textContent = labels[option.value] || option.textContent;
      });
      select.value = current;
    }

    function applyTranslations() {
      document.documentElement.lang = appData.settings.language || 'ru';
      document.title = tr('appTitle').replace(/^[^\s]+\s*/, '');
      setText('#viewDiary .header-title', tr('appTitle'));
      setText('.date-nav .date-btn:nth-child(1)', '◀ ' + tr('yesterday'));
      setText('#todayBadge', tr('today'));
      setText('.date-nav .date-btn:nth-child(3)', tr('tomorrow') + ' ▶');
      setText('.card-phe > div:first-child > span:first-child', tr('pheTitle'));
      setText('.card-phe > div:nth-child(2) > div:nth-child(2) > div:first-child', tr('remaining'));
      setText('.card-phe > div:last-child > span:first-child', tr('naturalProtein') + ': ');
      const proteinLine = document.querySelector('.card-phe > div:last-child > span:first-child');
      if (proteinLine) proteinLine.innerHTML = `${tr('naturalProtein')}: <b id="consumedProteinText" style="color:#0f172a;">${document.getElementById('consumedProteinText')?.textContent || '0.0'}</b> ${tr('gram')}`;
      const limitLine = document.querySelector('.card-phe > div:last-child > span:last-child');
      if (limitLine) limitLine.innerHTML = `${tr('limit')}: <span id="limitProteinText">${document.getElementById('limitProteinText')?.textContent || '6.0'}</span> ${tr('gram')}`;
      setText('.card-aks > div:first-child > span:first-child', tr('aksTitle'));
      setAllText('#viewDiary .meal-title', [
        '☀️ ' + tr('mealBreakfast'),
        '🍲 ' + tr('mealLunch'),
        '🌙 ' + tr('mealDinner'),
        '🍎 ' + tr('mealSnack')
      ]);
      setAllText('#viewDiary .btn-add', [tr('addBreakfast'), tr('addLunch'), tr('addDinner'), tr('addSnack')]);
      setText('#navBtnRecipes span', tr('recipes'));
      setText('#navBtnProducts span', tr('products'));
      setText('#navFabLabel', tr('diary'));
      setText('#navBtnWiki span', tr('wiki'));
      setText('#navBtnProfile span', tr('profile'));
      setText('#viewRecipes .header-title', tr('recipesTitle'));
      setText('#viewRecipes .header-top .btn-primary', tr('create'));
      setText('#viewProducts .header-title', tr('productsTitle'));
      setPlaceholder('#productSearchInput', tr('productSearch'));
      setText('#viewWiki .header-title', tr('wikiTitle'));
      setText('#viewProfile .header-title', '👤 ' + tr('profile'));
      setText('#tabAllRecipes', tr('allRecipes'));
      setText('#tabMyRecipes', tr('myRecipes'));
      setText('#recipeCategoryChips button:nth-child(1)', tr('allCategories'));
      setText('#recipeCategoryChips button:nth-child(2)', tr('breakfast'));
      setText('#recipeCategoryChips button:nth-child(3)', tr('soup'));
      setText('#recipeCategoryChips button:nth-child(4)', tr('main'));
      setText('#recipeCategoryChips button:nth-child(5)', tr('bakery'));
      setText('#recipeCategoryChips button:nth-child(6)', tr('dessert'));
      setText('#recipeCategoryChips button:nth-child(7)', tr('snack'));
      setText('#profileTabMain', tr('profileMain'));
      setText('#profileTabPku', tr('profilePku'));
      setText('#settingLanguageLabel', tr('language'));
      setAllText('#profilePanelMain .input-label', [tr('language'), tr('dailyPhe'), tr('aksPortionsPerDay')]);
      const proteinCalc = document.querySelector('#profilePanelMain .input-group:nth-child(2) span');
      if (proteinCalc) proteinCalc.innerHTML = `${tr('proteinEquivalent')}: <b id="calcProfileProtein">${document.getElementById('calcProfileProtein')?.textContent || '6.0'}</b> ${tr('gram')}`;
      setAllText('#profilePanelPku .input-label', [tr('age'), tr('weightKg'), tr('naturalProteinLimit'), tr('clinician'), tr('careNotes')]);
      setPlaceholder('#settingAge', tr('exampleAge'));
      setPlaceholder('#settingWeightKg', tr('exampleWeight'));
      setPlaceholder('#settingNaturalProteinLimit', tr('autoByPhe'));
      setPlaceholder('#settingClinicianName', tr('clinicianPlaceholder'));
      setPlaceholder('#settingCareNotes', tr('careNotesPlaceholder'));
      setAllText('#profilePanelPku .profile-check span', [tr('pheWarnings'), tr('aksReminders')]);
      setText('#profilePanelMain .btn-primary', tr('saveSettings'));
      setText('#profilePanelPku .btn-primary', tr('savePersonalization'));
      setAllText('#productCategoryChips .chip', [tr('all'), tr('veg'), tr('fruit'), tr('grain'), tr('dairy'), tr('proteinFoods'), tr('special'), tr('sweet'), tr('drink')]);
      setPlaceholder('#foodSearchInput', tr('foodSearch'));
      setAllText('#addModal .category-chips .chip', [tr('all'), '⭐ ' + tr('myProducts'), '🥦 ' + tr('veg'), '🍎 ' + tr('fruit'), '✨ ' + tr('special'), '🍬 ' + tr('sweet'), '🌾 ' + tr('grain')]);
      setAllText('#addModal .input-label', [tr('foodName'), tr('phePer100'), tr('proteinPer100'), tr('portionWeight')]);
      setPlaceholder('#foodNameInput', tr('foodNamePlaceholder'));
      setText('#addModal div[style*="background:#f1f5f9"] span:first-child', tr('portionTotal'));
      setText('#addModal .btn-primary', tr('saveToDiary'));
      setText('#recipeModal h3', tr('recipeBuilder'));
      setAllText('#recipeModal .input-label', [tr('dishName'), tr('recipeCategory'), tr('cookedWeight'), tr('onePortionWeight')]);
      setPlaceholder('#recipeNameInput', tr('dishNamePlaceholder'));
      setRecipeCategoryOptions();
      setText('#recipeModal span[style*="text-transform:uppercase"]', tr('addIngredient'));
      setPlaceholder('#recipeIngredientWeight', tr('ingredientWeight'));
      setText('#recipeModal button[onclick="addIngredientToRecipe()"]', tr('add'));
      setText('#recipeModal div[style*="margin-bottom:10px"] > span', tr('dishIngredients'));
      setText('#recipeModal .input-group:nth-of-type(3) span', tr('weighAfterCooking'));
      setText('#recipeModal div[style*="color:#065f46"]', tr('per100Ready'));
      const publicLabel = document.querySelector('label[for="recipeIsPublicCheck"]');
      if (publicLabel) publicLabel.textContent = tr('publishRecipe');
      setText('#recipeModal > .modal-content > .btn-primary', tr('saveRecipe'));
      setText('#quickRecipeTitle', tr('quickAddDiary'));
      setAllText('#quickAddRecipeModal .input-label', [tr('meal'), tr('eatenWeight')]);
      setText('#quickAddRecipeModal div[style*="background:#f1f5f9"] span:first-child', tr('portionTotal'));
      setText('#quickAddRecipeModal .btn-primary', tr('writeToDiary'));
      setQuickMealOptions();
      renderWikiArticles();
    }

    function mapDiaryEntry(row) {
      return {
        id: row.id,
        meal: row.meal_type,
        name: row.food_name,
        weight: Number(row.weight_g),
        phe: Number(row.phe_mg),
        prot: Number(row.protein_g)
      };
    }

    function getFormattedDate(d) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return year + '-' + month + '-' + day;
    }

    // 3. ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ
    function switchView(viewName) {
      const isDiary = (viewName === 'diary');
      const isRecipes = (viewName === 'recipes');
      const isProducts = (viewName === 'products');
      const isWiki = (viewName === 'wiki');
      const isProfile = (viewName === 'profile');
      
      const vDiary = document.getElementById('viewDiary');
      if (vDiary) vDiary.style.display = isDiary ? 'block' : 'none';

      const vRecipes = document.getElementById('viewRecipes');
      if (vRecipes) vRecipes.style.display = isRecipes ? 'block' : 'none';

      const vProducts = document.getElementById('viewProducts');
      if (vProducts) vProducts.style.display = isProducts ? 'block' : 'none';

      const vWiki = document.getElementById('viewWiki');
      if (vWiki) vWiki.style.display = isWiki ? 'block' : 'none';

      const vProfile = document.getElementById('viewProfile');
      if (vProfile) vProfile.style.display = isProfile ? 'block' : 'none';

      const fabLabel = document.getElementById('navFabLabel');
      if (fabLabel) fabLabel.style.color = isDiary ? '#10b981' : '#64748b';

      const btnDiary = document.getElementById('navBtnDiary');
      if (btnDiary && btnDiary.classList) btnDiary.classList.toggle('active', isDiary);

      const btnRec = document.getElementById('navBtnRecipes');
      if (btnRec && btnRec.classList) btnRec.classList.toggle('active', isRecipes);

      const btnProducts = document.getElementById('navBtnProducts');
      if (btnProducts && btnProducts.classList) btnProducts.classList.toggle('active', isProducts);

      const btnWiki = document.getElementById('navBtnWiki');
      if (btnWiki && btnWiki.classList) btnWiki.classList.toggle('active', isWiki);

      const btnProf = document.getElementById('navBtnProfile');
      if (btnProf && btnProf.classList) btnProf.classList.toggle('active', isProfile);

      if (isRecipes) {
        renderRecipes();
        loadRecipesFromSupabase();
      }

      if (isProducts) {
        renderProductsPage();
      }

      if (isProfile) {
        renderProfileSettings();
      }
    }
    window.switchView = switchView;

    function setupBottomNavigation() {
      const handlers = {
        navBtnRecipes: () => switchView('recipes'),
        navBtnProducts: () => switchView('products'),
        navBtnDiary: () => switchView('diary'),
        navBtnWiki: () => switchView('wiki'),
        navBtnProfile: () => switchView('profile')
      };

      Object.entries(handlers).forEach(([id, handler]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.onclick = handler;
      });
    }

    function getAllProducts() {
      const custom = userCustomProducts.map((p, idx) => ({ ...p, cat: 'custom', isCustom: true, customIndex: idx }));
      const base = serverProducts.length > 0 ? serverProducts : (window.FOOD_BASE || []);
      return [...custom, ...base];
    }

    async function loadProductsFromSupabase() {
      if (!hasSupabase) return;
      try {
        const data = await supabaseRequest('/rest/v1/products?is_active=eq.true&order=sort_order.asc,name.asc');
        if (Array.isArray(data) && data.length > 0) {
          serverProducts = data.map(item => ({
            ...item,
            prot: item.prot ?? item.protein ?? 0
          }));
          filterFoodList();
          if (document.getElementById('viewProducts')?.style.display === 'block') {
            renderProductsPage();
          }
        }
      } catch(e) {
        console.error('loadProductsFromSupabase error:', e);
      }
    }

    async function loadWikiFromSupabase() {
      if (!hasSupabase) return;
      try {
        const data = await supabaseRequest('/rest/v1/wiki_articles?is_published=eq.true&order=sort_order.asc,title.asc');
        if (Array.isArray(data) && data.length > 0) {
          wikiArticles = data;
          renderWikiArticles();
        }
      } catch(e) {
        console.error('loadWikiFromSupabase error:', e);
      }
    }

    function renderWikiArticles() {
      const container = document.getElementById('wikiContainer');
      if (!container) return;

      const fallbackArticles = [
        ['🧬', tr('wikiPheTitle'), tr('wikiPheBody')],
        ['⚖️', tr('wikiPortionTitle'), tr('wikiPortionBody')],
        ['🥣', tr('wikiAksTitle'), tr('wikiAksBody')],
        ['📊', tr('wikiKbjuTitle'), tr('wikiKbjuBody')],
        ['🏷️', tr('wikiLabelTitle'), tr('wikiLabelBody')],
        ['⚠️', tr('wikiOverTitle'), tr('wikiOverBody')],
        ['🔁', tr('wikiSwapTitle'), tr('wikiSwapBody')],
        ['✅', tr('wikiMistakesTitle'), tr('wikiMistakesBody')]
      ].map(([icon, title, body]) => ({ icon, title, body }));

      const articles = wikiArticles.length > 0 ? wikiArticles : fallbackArticles;
      container.innerHTML = articles.map(article => `
        <div class="wiki-card">
          <div class="wiki-card-icon">${escapeHtml(article.icon || '📚')}</div>
          <div>
            <h3>${escapeHtml(article.title)}</h3>
            <p>${escapeHtml(article.body)}</p>
          </div>
        </div>
      `).join('') + `
        <div class="wiki-note">
          ${escapeHtml(tr('wikiNote'))}
        </div>
      `;
    }

    function updateDateUI() {
      try {
        const selectedStr = getFormattedDate(currentDateObj);
        const actualTodayStr = getFormattedDate(new Date());
        appData.today = selectedStr;

        const isToday = (selectedStr === actualTodayStr);
        const todayBadge = document.getElementById('todayBadge');
        if (todayBadge) todayBadge.style.display = isToday ? 'inline-block' : 'none';

        updateDateLabelOnly(isToday);
        
        const picker = document.getElementById('hiddenDatePicker');
        if (picker) picker.value = selectedStr;

        loadDayData();
      } catch(e){ console.error('updateDateUI error:', e); }
    }

    function updateDateLabelOnly(isTodayArg = null) {
      const selectedStr = getFormattedDate(currentDateObj);
      const actualTodayStr = getFormattedDate(new Date());
      const isToday = isTodayArg === null ? selectedStr === actualTodayStr : isTodayArg;
      const options = { day: 'numeric', month: 'short' };
      const label = document.getElementById('dateDisplayLabel');
      const locale = localeByLanguage[appData.settings.language || 'ru'] || 'ru-RU';
      if (label) label.textContent = isToday ? tr('today') : currentDateObj.toLocaleDateString(locale, options);
    }

    function changeDate(daysOffset) {
      currentDateObj.setDate(currentDateObj.getDate() + daysOffset);
      updateDateUI();
    }
    window.changeDate = changeDate;

    function openDatePicker() {
      const picker = document.getElementById('hiddenDatePicker');
      if (picker) {
        if (typeof picker.showPicker === 'function') picker.showPicker();
        else picker.click();
      }
    }
    window.openDatePicker = openDatePicker;

    function onDatePicked(val) {
      if (!val) return;
      const parts = val.split('-');
      currentDateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      updateDateUI();
    }
    window.onDatePicked = onDatePicked;

    function loadCachedDayData() {
      const local = localStorage.getItem('pku_diary_' + currentTelegramId + '_' + appData.today);
      if (!local) return false;

      try {
        const parsed = JSON.parse(local);
        appData.entries = parsed.entries || [];
        appData.aks = parsed.aks || new Array(appData.settings.aksPortions).fill(false);
        return true;
      } catch(e) {
        return false;
      }
    }

    async function loadDayData() {
      if (!hasSupabase) {
        setCloudStatus('off', tr('cloudOff'));
        if (!loadCachedDayData()) {
          appData.entries = [];
          appData.aks = new Array(appData.settings.aksPortions).fill(false);
        }
        render();
        return;
      }

      setCloudStatus('pending', tr('cloudSync'));
      appData.entries = [];
      appData.aks = new Array(appData.settings.aksPortions).fill(false);
      render();
      await syncWithSupabase();
    }

    function init() {
      try {
        const savedSettings = localStorage.getItem('pku_settings_' + currentTelegramId);
        if (savedSettings) {
          try { appData.settings = { ...defaultSettings, ...JSON.parse(savedSettings) }; } catch(e){}
        }

        const savedCustom = localStorage.getItem('pku_custom_products_' + currentTelegramId);
        if (savedCustom) {
          try { userCustomProducts = JSON.parse(savedCustom); } catch(e){}
        }

        const savedRecipes = localStorage.getItem('pku_all_recipes_' + currentTelegramId);
        if (savedRecipes) {
          try { allRecipes = JSON.parse(savedRecipes); } catch(e){}
        }

        const profName = document.getElementById('profileUserName');
        if (profName) profName.textContent = tgUser.first_name || tr('user');
        
        const profId = document.getElementById('profileUserId');
        if (profId) profId.textContent = currentTelegramId;

        setCloudStatus(hasSupabase ? 'pending' : 'off', hasSupabase ? tr('cloudSync') : tr('cloudOff'));
        setupBottomNavigation();
        applyTranslations();
        filterFoodList();
        loadProductsFromSupabase();
        loadWikiFromSupabase();
        updateDateUI();
        checkTelegramDeepLink();
      } catch(e){
        console.error('init error:', e);
      }
    }

    function checkTelegramDeepLink() {
      const startParam = tg?.initDataUnsafe?.start_param;
      if (startParam && startParam.startsWith('recipe_')) {
        const recipeId = parseInt(startParam.replace('recipe_', ''));
        switchView('recipes');
        setTimeout(() => {
          const target = allRecipes.find(r => r.id === recipeId);
          if (target) {
            const idx = allRecipes.indexOf(target);
            openQuickAddRecipe(idx);
          }
        }, 600);
      }
    }

    // 4. ЛОГИКА РЕЦЕПТОВ
    function switchRecipeTab(filter) {
      currentRecipeFilter = filter;
      const tabAll = document.getElementById('tabAllRecipes');
      if (tabAll && tabAll.classList) tabAll.classList.toggle('active', filter === 'all');

      const tabMy = document.getElementById('tabMyRecipes');
      if (tabMy && tabMy.classList) tabMy.classList.toggle('active', filter === 'my');

      renderRecipes();
    }
    window.switchRecipeTab = switchRecipeTab;

    const recipeCategoryKeys = {
      breakfast: 'breakfast',
      soup: 'soup',
      main: 'main',
      bakery: 'bakery',
      dessert: 'dessert',
      snack: 'snack'
    };

    function setRecipeCategory(category, btn) {
      currentRecipeCategory = category;
      document.querySelectorAll('#recipeCategoryChips .chip').forEach(chip => chip.classList.remove('active'));
      if (btn && btn.classList) btn.classList.add('active');
      renderRecipes();
    }
    window.setRecipeCategory = setRecipeCategory;

    function renderRecipes() {
      const container = document.getElementById('recipesContainer');
      if (!container) return;

      const list = allRecipes.filter(r => {
        const matchesOwner = currentRecipeFilter !== 'my' || String(r.telegram_id) === String(currentTelegramId);
        const matchesCategory = currentRecipeCategory === 'all' || (r.category || 'main') === currentRecipeCategory;
        return matchesOwner && matchesCategory;
      });

      if (list.length === 0) {
        container.innerHTML = `
          <div style="text-align:center; padding:30px 16px; color:#94a3b8;">
            <div style="font-size:32px; margin-bottom:8px;">🍲</div>
            <div style="font-size:14px; font-weight:600; color:#64748b;">${currentRecipeFilter === 'my' ? tr('noMyRecipes') : tr('noCommunityRecipes')}</div>
            <div style="font-size:12px; margin-top:4px;">${tr('createFirstRecipe')}</div>
          </div>
        `;
        return;
      }

      let html = '';
      list.forEach((r) => {
        const isOwner = (String(r.telegram_id) === String(currentTelegramId));
        const globalIdx = allRecipes.indexOf(r);
        const ingrText = (r.ingredients || []).map(i => `${escapeHtml(i.name)} (${unitGram(i.weight)})`).join(', ');
        const title = escapeHtml(r.title);
        const author = escapeHtml(r.author_name || tr('community'));
        const categoryName = tr(recipeCategoryKeys[r.category || 'main'] || 'main');
        const portionWeight = Number(r.portion_weight || 0);
        const portionPhe = portionWeight > 0 ? Math.round((portionWeight * Number(r.phe_per_100 || 0)) / 100) : null;
        const portionProt = portionWeight > 0 ? ((portionWeight * Number(r.prot_per_100 || 0)) / 100).toFixed(2) : null;

        html += `
          <div class="recipe-card">
            <div class="recipe-header">
              <div>
                <div class="recipe-title">🍲 ${title}</div>
                <div class="recipe-author">${escapeHtml(categoryName)} • ${isOwner ? '⭐ ' + tr('yourRecipe') : tr('author') + ': ' + author} • ${tr('yield')}: ${unitGram(r.cooked_weight)}</div>
              </div>
              ${isOwner ? `<button onclick="deleteRecipe(${globalIdx})" style="border:none; background:none; color:#ef4444; font-size:14px; cursor:pointer;">🗑️</button>` : ''}
            </div>

            <div style="font-size:12px; color:#475569; margin: 6px 0;">
              <b>${tr('composition')}</b> <span style="color:#64748b;">${ingrText}</span>
            </div>

            <div class="recipe-pills">
              <div class="recipe-pill">${unitPhe(r.phe_per_100)} / 100${tr('gram')}</div>
              <div class="recipe-pill" style="background:#eff6ff; border-color:#bfdbfe; color:#1d4ed8;">${r.prot_per_100} ${tr('proteinFull')} / 100${tr('gram')}</div>
              ${portionWeight > 0 ? `<div class="recipe-pill" style="background:#fff7ed; border-color:#fed7aa; color:#c2410c;">${tr('recipePortion')} ${unitGram(portionWeight)}: ${unitPhe(portionPhe)} (${unitProtein(portionProt)})</div>` : ''}
            </div>

            <div class="recipe-actions">
              <button class="recipe-btn-sm" style="background:#ecfdf5; color:#047857;" onclick="openQuickAddRecipe(${globalIdx})">➕ ${tr('toDiary')}</button>
              <button class="recipe-btn-sm" style="background:#f1f5f9; color:#334155;" onclick="shareRecipe(${globalIdx})">🔗 ${tr('share')}</button>
              ${isOwner ? `
                <button class="recipe-btn-sm" style="background:${r.is_public ? '#fef3c7' : '#f1f5f9'}; color:${r.is_public ? '#b45309' : '#64748b'};" onclick="toggleRecipePublic(${globalIdx})">
              ${r.is_public ? '🌍 ' + tr('public') : '🔒 ' + tr('private')}
            </button>
              ` : ''}
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    }

    async function shareRecipe(idx) {
      const r = allRecipes[idx];
      if (!r) return;

      if (!r.is_public && String(r.telegram_id) === String(currentTelegramId)) {
        if (confirm(tr('makePublicConfirm'))) {
          await toggleRecipePublic(idx);
        } else {
          return;
        }
      }

      const botUsername = tg?.initDataUnsafe?.bot?.username || 'pku_diary_bot';
      const deepLink = `https://t.me/${botUsername}?startapp=recipe_${r.id || 'shared'}`;
      const text = `🍲 ${tr('shareRecipeIntro')}: "${r.title}"\n` +
                   `📊 ${unitPhe(r.phe_per_100)} / ${r.prot_per_100} ${tr('proteinFull')} / 100${tr('gram')}.\n\n` +
                   `👉 ${tr('openRecipeInApp')}\n${deepLink}`;

      if (tg && tg.openTelegramLink) {
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(text)}`);
      } else {
        navigator.clipboard.writeText(text).then(() => {
          alert(tr('copiedRecipe'));
        });
      }
    }
    window.shareRecipe = shareRecipe;

    function openQuickAddRecipe(idx) {
      selectedRecipeForQuickAdd = allRecipes[idx];
      if (!selectedRecipeForQuickAdd) return;

      const titleEl = document.getElementById('quickRecipeTitle');
      if (titleEl) titleEl.textContent = `${tr('quickAddDiary')}: "${selectedRecipeForQuickAdd.title}"`;
      
      const wEl = document.getElementById('quickRecipeWeight');
      if (wEl) wEl.value = selectedRecipeForQuickAdd.portion_weight || '100';
      
      calcQuickRecipePreview();
      openModal('quickAddRecipeModal');
    }
    window.openQuickAddRecipe = openQuickAddRecipe;

    function calcQuickRecipePreview() {
      if (!selectedRecipeForQuickAdd) return;
      const wEl = document.getElementById('quickRecipeWeight');
      const w = wEl ? parseFloat(wEl.value) || 0 : 0;
      const phe = Math.round((w * selectedRecipeForQuickAdd.phe_per_100) / 100);
      const prot = parseFloat(((w * selectedRecipeForQuickAdd.prot_per_100) / 100).toFixed(2));
      
      const prev = document.getElementById('quickRecipePreviewCalc');
      if (prev) prev.textContent = `${unitPhe(phe)} (${unitProtein(prot)})`;
    }
    window.calcQuickRecipePreview = calcQuickRecipePreview;

    async function confirmQuickAddRecipe() {
      if (!selectedRecipeForQuickAdd) return;
      const meal = document.getElementById('quickRecipeMealSelect')?.value || 'Обед';
      const wEl = document.getElementById('quickRecipeWeight');
      const w = wEl ? parseFloat(wEl.value) || 0 : 0;

      if (w <= 0) {
        alert(tr('diaryWeightAlert'));
        return;
      }

      const phe = Math.round((w * selectedRecipeForQuickAdd.phe_per_100) / 100);
      const prot = parseFloat(((w * selectedRecipeForQuickAdd.prot_per_100) / 100).toFixed(2));

      const entry = {
        meal: meal,
        name: '🍲 ' + selectedRecipeForQuickAdd.title,
        weight: w,
        phe: phe,
        prot: prot
      };

      const saved = await createDiaryEntry(entry);
      if (!saved) return;

      closeModal('quickAddRecipeModal');
      switchView('diary');
      alert(tr('recipeAdded').replace('{title}', selectedRecipeForQuickAdd.title).replace('{weight}', w).replace('{meal}', mealLabel(meal)));
    }
    window.confirmQuickAddRecipe = confirmQuickAddRecipe;

    function openRecipeModal() {
      currentRecipeIngredients = [];
      const nameEl = document.getElementById('recipeNameInput');
      if (nameEl) nameEl.value = '';

      const catEl = document.getElementById('recipeCategorySelect');
      if (catEl) catEl.value = 'main';
      
      const wCooked = document.getElementById('recipeCookedWeightInput');
      if (wCooked) wCooked.value = '';

      const portionWeight = document.getElementById('recipePortionWeightInput');
      if (portionWeight) portionWeight.value = '';
      
      const resPhe = document.getElementById('recipeResultPhe');
      if (resPhe) resPhe.textContent = unitPhe(0);
      
      const resProt = document.getElementById('recipeResultProt');
      if (resProt) resProt.textContent = '0.0 ' + tr('proteinFull');

      const resPortion = document.getElementById('recipeResultPortion');
      if (resPortion) resPortion.textContent = tr('portionSetWeight');
      
      const checkPub = document.getElementById('recipeIsPublicCheck');
      if (checkPub) checkPub.checked = true;

      const sel = document.getElementById('recipeIngredientSelect');
      if (sel) {
        sel.innerHTML = `<option value="">${escapeHtml(tr('chooseProduct'))}</option>`;
        const all = getAllProducts();
        all.forEach((item, idx) => {
          sel.innerHTML += `<option value="${idx}">${escapeHtml(item.name)} (${unitPhe(item.phe)} / 100${tr('gram')})</option>`;
        });
      }

      renderRecipeIngredientsList();
      openModal('recipeModal');
    }
    window.openRecipeModal = openRecipeModal;

    function addIngredientToRecipe() {
      const sel = document.getElementById('recipeIngredientSelect');
      const weightInput = document.getElementById('recipeIngredientWeight');
      const idx = parseInt(sel?.value);
      const weight = parseFloat(weightInput?.value) || 0;

      if (isNaN(idx) || idx < 0) {
        alert(tr('chooseProductAlert'));
        return;
      }
      if (weight <= 0) {
        alert(tr('ingredientWeightAlert'));
        return;
      }

      const all = getAllProducts();
      const product = all[idx];

      currentRecipeIngredients.push({
        name: product.name,
        weight: weight,
        phe: product.phe,
        prot: product.prot
      });

      if (weightInput) weightInput.value = '';
      renderRecipeIngredientsList();
      calculateRecipeTotals();
    }
    window.addIngredientToRecipe = addIngredientToRecipe;

    function removeIngredientFromRecipe(index) {
      currentRecipeIngredients.splice(index, 1);
      renderRecipeIngredientsList();
      calculateRecipeTotals();
    }
    window.removeIngredientFromRecipe = removeIngredientFromRecipe;

    function renderRecipeIngredientsList() {
      const container = document.getElementById('recipeIngredientsList');
      if (!container) return;

      if (currentRecipeIngredients.length === 0) {
        container.innerHTML = `<div style="font-size:12px; color:#94a3b8; padding:6px 0;">${escapeHtml(tr('noIngredients'))}</div>`;
        return;
      }

      let html = '';
      currentRecipeIngredients.forEach((item, i) => {
        const itemPhe = Math.round((item.weight * item.phe) / 100);
        html += `
          <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; border:1px solid #e2e8f0; padding:6px 8px; border-radius:8px; margin-bottom:4px; font-size:12px;">
            <div><b>${escapeHtml(item.name)}</b> — ${unitGram(item.weight)} <span style="color:#64748b;">(${unitPhe(itemPhe)})</span></div>
            <button onclick="removeIngredientFromRecipe(${i})" style="background:none; border:none; color:#ef4444; font-size:14px; cursor:pointer;">✕</button>
          </div>
        `;
      });
      container.innerHTML = html;
    }

    function calculateRecipeTotals() {
      let totalRawPhe = 0;
      let totalRawProt = 0;
      let totalRawWeight = 0;

      currentRecipeIngredients.forEach(item => {
        totalRawPhe += (item.weight * item.phe) / 100;
        totalRawProt += (item.weight * item.prot) / 100;
        totalRawWeight += item.weight;
      });

      const wCookedEl = document.getElementById('recipeCookedWeightInput');
      let cookedWeight = parseFloat(wCookedEl?.value) || totalRawWeight;
      if (cookedWeight <= 0) cookedWeight = totalRawWeight;

      if (cookedWeight > 0) {
        const phePer100 = Math.round((totalRawPhe / cookedWeight) * 100);
        const protPer100 = parseFloat(((totalRawProt / cookedWeight) * 100).toFixed(2));
        const portionWeight = parseFloat(document.getElementById('recipePortionWeightInput')?.value) || 0;

        const resPhe = document.getElementById('recipeResultPhe');
        if (resPhe) resPhe.textContent = unitPhe(phePer100);
        
        const resProt = document.getElementById('recipeResultProt');
        if (resProt) resProt.textContent = protPer100 + ' ' + tr('proteinFull');

        const resPortion = document.getElementById('recipeResultPortion');
        if (resPortion) {
          if (portionWeight > 0) {
            const portionPhe = Math.round((portionWeight * phePer100) / 100);
            const portionProt = ((portionWeight * protPer100) / 100).toFixed(2);
            resPortion.textContent = `${tr('recipePortion')} ${unitGram(portionWeight)}: ${unitPhe(portionPhe)} (${unitProtein(portionProt)})`;
          } else {
            resPortion.textContent = tr('portionSetWeight');
          }
        }
      }
    }
    window.calculateRecipeTotals = calculateRecipeTotals;

    async function saveRecipe() {
      const name = document.getElementById('recipeNameInput')?.value.trim();
      const isPublic = document.getElementById('recipeIsPublicCheck')?.checked || false;
      const category = document.getElementById('recipeCategorySelect')?.value || 'main';

      if (!name) {
        alert(tr('recipeNameAlert'));
        return;
      }
      if (currentRecipeIngredients.length === 0) {
        alert(tr('recipeIngredientAlert'));
        return;
      }

      let totalRawPhe = 0;
      let totalRawProt = 0;
      let totalRawWeight = 0;

      currentRecipeIngredients.forEach(item => {
        totalRawPhe += (item.weight * item.phe) / 100;
        totalRawProt += (item.weight * item.prot) / 100;
        totalRawWeight += item.weight;
      });

      const wCookedEl = document.getElementById('recipeCookedWeightInput');
      let cookedWeight = parseFloat(wCookedEl?.value) || totalRawWeight;
      const finalPhe100 = Math.round((totalRawPhe / cookedWeight) * 100);
      const finalProt100 = parseFloat(((totalRawProt / cookedWeight) * 100).toFixed(2));
      const portionWeight = parseFloat(document.getElementById('recipePortionWeightInput')?.value) || 0;

      const newRecipe = {
        telegram_id: currentTelegramId,
        author_name: tgUser.first_name || tr('user'),
        title: name,
        category: category,
        ingredients: currentRecipeIngredients,
        cooked_weight: cookedWeight,
        portion_weight: portionWeight,
        phe_per_100: finalPhe100,
        prot_per_100: finalProt100,
        is_public: isPublic
      };

      if (hasSupabase) {
        try {
          const data = await supabaseRequest('/rest/v1/recipes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
            body: JSON.stringify(newRecipe)
          });
          allRecipes.unshift(data?.[0] || newRecipe);
        } catch(e) {
          setCloudStatus('error', tr('saveRecipeError'));
          alert(tr('saveRecipeError'));
          console.error('saveRecipe error:', e);
          return;
        }
      } else {
        newRecipe.id = Date.now();
        allRecipes.unshift(newRecipe);
      }

      localStorage.setItem('pku_all_recipes_' + currentTelegramId, JSON.stringify(allRecipes));
      setCloudStatus(hasSupabase ? 'ok' : 'off', hasSupabase ? tr('cloudSaved') : tr('localMode'));
      alert(tr('recipeSaved'));
      closeModal('recipeModal');
      switchView('recipes');
    }
    window.saveRecipe = saveRecipe;

    async function toggleRecipePublic(idx) {
      const r = allRecipes[idx];
      if (!r) return;
      r.is_public = !r.is_public;
      localStorage.setItem('pku_all_recipes_' + currentTelegramId, JSON.stringify(allRecipes));
      renderRecipes();

      if (hasSupabase) {
        try {
          await supabaseRequest('/rest/v1/recipes?id=eq.' + encodeURIComponent(r.id), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_public: r.is_public })
          });
          setCloudStatus('ok', tr('cloudSaved'));
        } catch(e) {
          r.is_public = !r.is_public;
          localStorage.setItem('pku_all_recipes_' + currentTelegramId, JSON.stringify(allRecipes));
          renderRecipes();
          setCloudStatus('error', tr('saveRecipeError'));
          console.error('toggleRecipePublic error:', e);
        }
      }
    }
    window.toggleRecipePublic = toggleRecipePublic;

    async function deleteRecipe(idx) {
      if (confirm(tr('deleteRecipeConfirm'))) {
        const r = allRecipes[idx];
        allRecipes.splice(idx, 1);
        localStorage.setItem('pku_all_recipes_' + currentTelegramId, JSON.stringify(allRecipes));
        renderRecipes();

        if (hasSupabase && r?.id) {
          try {
            await supabaseRequest('/rest/v1/recipes?id=eq.' + encodeURIComponent(r.id), {
              method: 'DELETE'
            });
            setCloudStatus('ok', tr('cloudSaved'));
          } catch(e) {
            setCloudStatus('error', tr('deleteServerError'));
            console.error('deleteRecipe error:', e);
            loadRecipesFromSupabase();
          }
        }
      }
    }
    window.deleteRecipe = deleteRecipe;

    async function loadRecipesFromSupabase() {
      if (!hasSupabase) return;
      try {
        const data = await supabaseRequest('/rest/v1/recipes?or=(is_public.eq.true,telegram_id.eq.' + encodeURIComponent(currentTelegramId) + ')&order=created_at.desc');
        if (data && Array.isArray(data)) {
          allRecipes = data;
          localStorage.setItem('pku_all_recipes_' + currentTelegramId, JSON.stringify(allRecipes));
          renderRecipes();
          setCloudStatus('ok', tr('cloudLoaded'));
        }
      } catch(e){
        setCloudStatus('error', tr('saveRecipeError'));
        console.error('loadRecipesFromSupabase error:', e);
      }
    }

    // 5. СПРАВОЧНИК ПРОДУКТОВ
    const productCategoryKeys = {
      veg: 'veg',
      fruit: 'fruit',
      grain: 'grain',
      dairy: 'dairy',
      protein: 'proteinFoods',
      special: 'special',
      sweet: 'sweet',
      drink: 'drink',
      custom: 'myProducts'
    };

    function getProductValue(item, key, fallback = '—') {
      const value = item[key];
      return value === undefined || value === null || value === '' ? fallback : value;
    }

    function getProductProtein(item) {
      return item.protein ?? item.prot ?? 0;
    }

    function getProductImage(item) {
      return item.image_url || item.image || '';
    }

    function renderProductsSourceNote() {
      const nutrientSource = window.PRODUCT_DATA_SOURCES?.nutrients || {};
      const giSource = window.PRODUCT_DATA_SOURCES?.gi || {};
      return `
        <div class="products-source-note">
          ${escapeHtml(tr('productsSourcePrefix'))}: ${escapeHtml(tr('nutrientsAndPhe'))} — <a href="${escapeHtml(nutrientSource.url || 'https://fdc.nal.usda.gov/')}" target="_blank" rel="noopener">${escapeHtml(nutrientSource.name || 'USDA FoodData Central / FRIDA')}</a>;
          ${escapeHtml(tr('giSource'))} — <a href="${escapeHtml(giSource.url || 'https://glycemicindex.com/')}" target="_blank" rel="noopener">${escapeHtml(giSource.name || 'University of Sydney GI Database')}</a>.
          ${escapeHtml(tr('productsSourceNote'))}
        </div>
      `;
    }

    function getProductListForPage() {
      const query = (document.getElementById('productSearchInput')?.value || '').toLowerCase().trim();
      return getAllProducts().filter(item => {
        const matchesCat = currentProductCategory === 'all' || item.cat === currentProductCategory;
        const matchesQuery = !query || item.name.toLowerCase().includes(query);
        return matchesCat && matchesQuery;
      });
    }

    function setProductCategory(cat, btn) {
      currentProductCategory = cat;
      currentExpandedProductIndex = null;
      document.querySelectorAll('#productCategoryChips .chip').forEach(c => c.classList.remove('active'));
      if (btn && btn.classList) btn.classList.add('active');
      renderProductsPage();
    }
    window.setProductCategory = setProductCategory;

    function filterProductsPage() {
      currentExpandedProductIndex = null;
      renderProductsPage();
    }
    window.filterProductsPage = filterProductsPage;

    function toggleProductDetails(index) {
      currentExpandedProductIndex = currentExpandedProductIndex === index ? null : index;
      renderProductsPage();
    }
    window.toggleProductDetails = toggleProductDetails;

    function renderProductsPage() {
      const container = document.getElementById('productsContainer');
      if (!container) return;

      const products = getProductListForPage();
      if (products.length === 0) {
        container.innerHTML = `<div class="empty-state">${escapeHtml(tr('nothingFound'))}</div>` + renderProductsSourceNote();
        return;
      }

      let html = '';
      products.forEach((item, index) => {
        const isOpen = currentExpandedProductIndex === index;
        const protein = getProductProtein(item);
        const catName = tr(productCategoryKeys[item.cat]) || item.cat || tr('food');
        const kcal = getProductValue(item, 'kcal');
        const fat = getProductValue(item, 'fat');
        const carbs = getProductValue(item, 'carbs');
        const gi = getProductValue(item, 'gi');
        const image = getProductImage(item);

        html += `
          <button class="product-row ${isOpen ? 'expanded' : ''}" onclick="toggleProductDetails(${index})" type="button">
            <div class="product-row-main">
              <div class="product-media">
                ${image ? `<img class="product-photo" src="${escapeHtml(image)}" alt="${escapeHtml(item.name)}" loading="lazy">` : `<div class="product-photo product-photo-empty">${escapeHtml(tr('photo'))}</div>`}
                <div>
                  <div class="product-name">${escapeHtml(item.name)}</div>
                  <div class="product-category">${escapeHtml(catName)}</div>
                </div>
              </div>
              <div class="product-chevron">${isOpen ? '⌃' : '⌄'}</div>
            </div>
            ${isOpen ? `
              <div class="product-details">
                <div><span>${tr('kcal')}</span><b>${kcal}</b></div>
                <div><span>${tr('proteins')}</span><b>${protein} ${tr('gram')}</b></div>
                <div><span>${tr('fats')}</span><b>${fat} ${tr('gram')}</b></div>
                <div><span>${tr('carbs')}</span><b>${carbs} ${tr('gram')}</b></div>
                <div><span>${tr('phe')}</span><b>${item.phe} ${tr('mg')}</b></div>
                <div><span>${tr('gi')}</span><b>${gi}</b></div>
              </div>
            ` : ''}
          </button>
        `;
      });

      container.innerHTML = html + renderProductsSourceNote();
    }

    // 6. ДНЕВНИК И ДОБАВЛЕНИЕ ЕДЫ
    function setCategory(cat, btn) {
      currentCategory = cat;
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      if (btn && btn.classList) btn.classList.add('active');
      filterFoodList();
    }
    window.setCategory = setCategory;

    function filterFoodList() {
      const query = (document.getElementById('foodSearchInput')?.value || '').toLowerCase().trim();
      const all = getAllProducts();
      currentFilteredList = all.filter(item => {
        const matchesCat = (currentCategory === 'all' || item.cat === currentCategory);
        const matchesQuery = !query || item.name.toLowerCase().includes(query);
        return matchesCat && matchesQuery;
      });
      renderFoodSearchList();
    }
    window.filterFoodList = filterFoodList;

    function renderFoodSearchList() {
      const container = document.getElementById('foodSearchListContainer');
      if (!container) return;

      if (currentFilteredList.length === 0) {
        container.innerHTML = `<div style="padding:12px; text-align:center; font-size:12px; color:#94a3b8;">${escapeHtml(tr('nothingFound'))}</div>`;
        return;
      }

      let html = '';
      for (let i = 0; i < currentFilteredList.length; i++) {
        const f = currentFilteredList[i];
        const icon = f.isCustom ? '⭐ ' : '';
        html += '<div class="search-item" onclick="selectFoodByIndex(' + i + ')">' +
                  '<div class="search-item-name">' + icon + escapeHtml(f.name) + '</div>' +
                  '<div style="display:flex; align-items:center; gap:8px;">' +
                    '<div class="search-item-meta">' + unitPhe(f.phe) + ' <span style="color:#64748b; font-weight:normal;">(' + unitProtein(f.prot) + ')</span></div>' +
                  '</div>' +
                '</div>';
      }
      container.innerHTML = html;
    }

    function selectFoodByIndex(i) {
      const item = currentFilteredList[i];
      if (!item) return;
      const nameEl = document.getElementById('foodNameInput');
      if (nameEl) nameEl.value = item.name;
      
      const pheEl = document.getElementById('phe100Input');
      if (pheEl) pheEl.value = item.phe;
      
      const protEl = document.getElementById('prot100Input');
      if (protEl) protEl.value = item.prot;
      
      calcPreview();
    }
    window.selectFoodByIndex = selectFoodByIndex;

    async function createDiaryEntry(entry) {
      if (hasSupabase) {
        try {
          const data = await supabaseRequest('/rest/v1/diary_entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
            body: JSON.stringify({
              telegram_id: currentTelegramId,
              entry_date: appData.today,
              meal_type: entry.meal,
              food_name: entry.name,
              weight_g: entry.weight,
              phe_mg: entry.phe,
              protein_g: entry.prot
            })
          });
          const saved = data?.[0] ? mapDiaryEntry(data[0]) : { ...entry, id: Date.now() };
          appData.entries.push(saved);
          saveLocal();
          render();
          setCloudStatus('ok', tr('cloudSaved'));
          return saved;
        } catch(e) {
          setCloudStatus('error', tr('diaryServerError'));
          alert(tr('diaryServerError'));
          console.error('createDiaryEntry error:', e);
          return null;
        }
      }

      const fallback = { ...entry, id: Date.now() };
      appData.entries.push(fallback);
      saveLocal();
      render();
      setCloudStatus('off', tr('localMode'));
      return fallback;
    }

    async function syncWithSupabase() {
      if (!hasSupabase) return;
      try {
        const users = await supabaseRequest('/rest/v1/users?telegram_id=eq.' + encodeURIComponent(currentTelegramId));
        if (users && users.length > 0) {
          appData.settings.dailyPhe = users[0].daily_phe || 300;
          appData.settings.aksPortions = users[0].aks_portions || 4;
        } else {
          await supabaseRequest('/rest/v1/users?on_conflict=telegram_id', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
            body: JSON.stringify({
              telegram_id: currentTelegramId,
              daily_phe: appData.settings.dailyPhe,
              aks_portions: appData.settings.aksPortions
            })
          });
        }

        const entries = await supabaseRequest('/rest/v1/diary_entries?telegram_id=eq.' + encodeURIComponent(currentTelegramId) + '&entry_date=eq.' + encodeURIComponent(appData.today) + '&order=id.asc');
        if (entries && Array.isArray(entries)) {
          appData.entries = entries.map(mapDiaryEntry);
        }

        const aksLogs = await supabaseRequest('/rest/v1/aks_logs?telegram_id=eq.' + encodeURIComponent(currentTelegramId) + '&log_date=eq.' + encodeURIComponent(appData.today));
        if (aksLogs && Array.isArray(aksLogs)) {
          appData.aks = new Array(appData.settings.aksPortions).fill(false);
          aksLogs.forEach(log => {
            if (log.portion_index < appData.aks.length) {
              appData.aks[log.portion_index] = log.is_taken;
            }
          });
        }

        render();
        saveLocal();
        setCloudStatus('ok', tr('cloudLoaded'));
      } catch(e) {
        setCloudStatus('error', tr('cloudOff'));
        if (!loadCachedDayData()) {
          appData.entries = [];
          appData.aks = new Array(appData.settings.aksPortions).fill(false);
        }
        render();
        console.error('Supabase sync:', e);
      }
    }

    function saveLocal() {
      localStorage.setItem('pku_diary_' + currentTelegramId + '_' + appData.today, JSON.stringify({
        entries: appData.entries,
        aks: appData.aks
      }));
      localStorage.setItem('pku_settings_' + currentTelegramId, JSON.stringify(appData.settings));
    }

    function render() {
      try {
        const limitPhe = appData.settings.dailyPhe;
        const limitProt = (limitPhe / 50).toFixed(1);
        
        const limitPheEl = document.getElementById('limitPheText');
        if (limitPheEl) limitPheEl.textContent = limitPhe;
        
        const limitProtEl = document.getElementById('limitProteinText');
        if (limitProtEl) limitProtEl.textContent = limitProt;

        let consumedPhe = 0;
        let consumedProt = 0;
        const mealSums = { 'Завтрак': 0, 'Обед': 0, 'Ужин': 0, 'Перекус': 0 };

        ['breakfastList', 'lunchList', 'dinnerList', 'snackList'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.innerHTML = '';
        });

        appData.entries.forEach(item => {
          consumedPhe += item.phe;
          consumedProt += item.prot;
          mealSums[item.meal] += item.phe;

          const listId = item.meal === 'Завтрак' ? 'breakfastList' : item.meal === 'Обед' ? 'lunchList' : item.meal === 'Ужин' ? 'dinnerList' : 'snackList';
          const el = document.getElementById(listId);
          if (el) {
            el.innerHTML += '<div class="food-item">' +
                              '<div>' +
                                '<div class="food-info">' + escapeHtml(item.name) + '</div>' +
                                '<div class="food-sub">' + unitGram(item.weight) + ' (' + unitProtein(item.prot) + ')</div>' +
                              '</div>' +
                              '<div class="food-right">' +
                                '<span class="food-phe">' + item.phe + ' ' + tr('mg') + '</span>' +
                                '<button class="del-btn" onclick="deleteFood(' + item.id + ')">🗑️</button>' +
                              '</div>' +
                            '</div>';
          }
        });

        const consPheEl = document.getElementById('consumedPheText');
        if (consPheEl) consPheEl.textContent = consumedPhe;

        const consProtEl = document.getElementById('consumedProteinText');
        if (consProtEl) consProtEl.textContent = consumedProt.toFixed(1);

        const bTotal = document.getElementById('breakfastTotal');
        if (bTotal) bTotal.textContent = unitPhe(mealSums['Завтрак']);

        const lTotal = document.getElementById('lunchTotal');
        if (lTotal) lTotal.textContent = unitPhe(mealSums['Обед']);

        const dTotal = document.getElementById('dinnerTotal');
        if (dTotal) dTotal.textContent = unitPhe(mealSums['Ужин']);

        const sTotal = document.getElementById('snackTotal');
        if (sTotal) sTotal.textContent = unitPhe(mealSums['Перекус']);

        const rem = limitPhe - consumedPhe;
        const badge = document.getElementById('pheStatusBadge');
        const bar = document.getElementById('pheProgressBar');
        const percent = Math.min(Math.round((consumedPhe / limitPhe) * 100), 100);
        if (bar) bar.style.width = percent + '%';

        const remEl = document.getElementById('remainingPheText');
        if (rem >= 0) {
          if (remEl) {
            remEl.textContent = rem + ' ' + tr('mg');
            remEl.style.color = '#10b981';
          }
          if (badge) {
            badge.className = 'badge badge-ok';
            badge.textContent = tr('statusOk');
          }
          if (bar) bar.className = 'progress-bar-fill fill-ok';
        } else {
          if (remEl) {
            remEl.textContent = tr('overLimit') + ' ' + Math.abs(rem) + ' ' + tr('mg');
            remEl.style.color = '#ef4444';
          }
          if (badge) {
            badge.className = 'badge badge-warn';
            badge.textContent = tr('statusOver');
          }
          if (bar) bar.className = 'progress-bar-fill fill-warn';
        }

        const aksDiv = document.getElementById('aksContainer');
        if (aksDiv) {
          aksDiv.innerHTML = '';
          let takenCnt = 0;
          appData.aks.forEach((isTaken, i) => {
            if (isTaken) takenCnt++;
            aksDiv.innerHTML += '<button class="aks-btn ' + (isTaken ? 'aks-on' : 'aks-off') + '" onclick="toggleAks(' + i + ')">' + (i+1) + tr('portionButton') + '</button>';
          });
          const aksText = document.getElementById('aksProgressText');
          if (aksText) aksText.textContent = takenCnt + ' / ' + appData.aks.length + ' ' + tr('portions');
        }
      } catch(e){
        console.error('render error:', e);
      }
    }

    function calcPreview() {
      const wEl = document.getElementById('weightInput');
      const w = wEl ? parseFloat(wEl.value) || 0 : 0;
      
      const pheEl = document.getElementById('phe100Input');
      let phe = pheEl ? parseFloat(pheEl.value) || 0 : 0;
      
      const protEl = document.getElementById('prot100Input');
      let prot = protEl ? parseFloat(protEl.value) || 0 : 0;
      
      if (prot > 0 && phe === 0) {
        phe = prot * 50;
        if (pheEl) pheEl.value = Math.round(phe);
      }

      const totalPhe = Math.round((w * phe) / 100);
      const totalProt = ((w * prot) / 100).toFixed(2);
      
      const prevEl = document.getElementById('previewCalc');
      if (prevEl) prevEl.textContent = unitPhe(totalPhe) + ' (' + unitProtein(totalProt) + ')';
    }
    window.calcPreview = calcPreview;

    function openAddFoodModal(m) {
      activeMeal = m;
      const titleEl = document.getElementById('modalMealTitle');
      if (titleEl) titleEl.textContent = tr('addToMeal') + ' ' + mealLabel(m).toLowerCase();

      const searchEl = document.getElementById('foodSearchInput');
      if (searchEl) searchEl.value = '';

      const nameEl = document.getElementById('foodNameInput');
      if (nameEl) nameEl.value = '';

      const pheEl = document.getElementById('phe100Input');
      if (pheEl) pheEl.value = '';

      const protEl = document.getElementById('prot100Input');
      if (protEl) protEl.value = '';

      const wEl = document.getElementById('weightInput');
      if (wEl) wEl.value = '';

      currentCategory = 'all';
      document.querySelectorAll('.chip').forEach((c, idx) => c.classList.toggle('active', idx === 0));
      filterFoodList();
      calcPreview();
      openModal('addModal');
    }
    window.openAddFoodModal = openAddFoodModal;

    async function saveFood() {
      const name = document.getElementById('foodNameInput')?.value.trim() || tr('food');
      const w = parseFloat(document.getElementById('weightInput')?.value) || 0;
      const phe100 = parseFloat(document.getElementById('phe100Input')?.value) || 0;
      const prot100 = parseFloat(document.getElementById('prot100Input')?.value) || 0;

      if (w <= 0) { alert(tr('foodWeightAlert')); return; }

      const totalPhe = Math.round((w * phe100) / 100);
      const totalProt = parseFloat(((w * prot100) / 100).toFixed(2));

      const saved = await createDiaryEntry({ meal: activeMeal, name: name, weight: w, phe: totalPhe, prot: totalProt });
      if (saved) closeModal('addModal');
    }
    window.saveFood = saveFood;

    async function deleteFood(id) {
      const previousEntries = [...appData.entries];
      appData.entries = appData.entries.filter(e => e.id !== id);
      saveLocal();
      render();

      if (hasSupabase) {
        try {
          await supabaseRequest('/rest/v1/diary_entries?id=eq.' + encodeURIComponent(id), {
            method: 'DELETE'
          });
          setCloudStatus('ok', tr('cloudSaved'));
        } catch(e) {
          appData.entries = previousEntries;
          saveLocal();
          render();
          setCloudStatus('error', tr('deleteServerError'));
          alert(tr('deleteServerError'));
          console.error('deleteFood error:', e);
        }
      }
    }
    window.deleteFood = deleteFood;

    async function toggleAks(i) {
      appData.aks[i] = !appData.aks[i];
      saveLocal();
      render();

      if (hasSupabase) {
        try {
          await supabaseRequest('/rest/v1/aks_logs?on_conflict=telegram_id,log_date,portion_index', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
            body: JSON.stringify({ telegram_id: currentTelegramId, log_date: appData.today, portion_index: i, is_taken: appData.aks[i] })
          });
          setCloudStatus('ok', tr('cloudSaved'));
        } catch(e) {
          appData.aks[i] = !appData.aks[i];
          saveLocal();
          render();
          setCloudStatus('error', tr('cloudOff'));
          console.error('toggleAks error:', e);
        }
      }
    }
    window.toggleAks = toggleAks;

    function updateProfileProteinCalc() {
      const phe = parseInt(document.getElementById('settingDailyPhe')?.value) || 0;
      const prot = (phe / 50).toFixed(1);
      const el = document.getElementById('calcProfileProtein');
      if (el) el.textContent = prot;
    }
    window.updateProfileProteinCalc = updateProfileProteinCalc;

    function switchProfilePanel(panel) {
      const isMain = panel === 'main';
      document.getElementById('profileTabMain')?.classList.toggle('active', isMain);
      document.getElementById('profileTabPku')?.classList.toggle('active', !isMain);
      document.getElementById('profilePanelMain')?.classList.toggle('active', isMain);
      document.getElementById('profilePanelPku')?.classList.toggle('active', !isMain);
    }
    window.switchProfilePanel = switchProfilePanel;

    function renderProfileSettings() {
      const lang = document.getElementById('settingLanguage');
      if (lang) lang.value = appData.settings.language || 'ru';

      const sPhe = document.getElementById('settingDailyPhe');
      if (sPhe) sPhe.value = appData.settings.dailyPhe;

      const sAks = document.getElementById('settingAksPortions');
      if (sAks) sAks.value = appData.settings.aksPortions;

      const age = document.getElementById('settingAge');
      if (age) age.value = appData.settings.age || '';

      const weight = document.getElementById('settingWeightKg');
      if (weight) weight.value = appData.settings.weightKg || '';

      const proteinLimit = document.getElementById('settingNaturalProteinLimit');
      if (proteinLimit) proteinLimit.value = appData.settings.naturalProteinLimit || '';

      const clinician = document.getElementById('settingClinicianName');
      if (clinician) clinician.value = appData.settings.clinicianName || '';

      const notes = document.getElementById('settingCareNotes');
      if (notes) notes.value = appData.settings.careNotes || '';

      const warnings = document.getElementById('settingShowPheWarnings');
      if (warnings) warnings.checked = appData.settings.showPheWarnings !== false;

      const reminders = document.getElementById('settingAksReminders');
      if (reminders) reminders.checked = appData.settings.aksReminders === true;

      updateProfileProteinCalc();
      applyTranslations();
    }

    function changeLanguage(language) {
      appData.settings.language = i18n[language] ? language : 'ru';
      saveLocal();
      applyTranslations();
      updateDateLabelOnly();
      render();
      renderRecipes();
      renderProductsPage();
      renderFoodSearchList();
      renderRecipeIngredientsList();
    }
    window.changeLanguage = changeLanguage;

    function openModal(id) {
      const el = document.getElementById(id);
      if (el && el.classList) el.classList.add('active');
    }
    window.openModal = openModal;

    function closeModal(id) {
      const el = document.getElementById(id);
      if (el && el.classList) el.classList.remove('active');
    }
    window.closeModal = closeModal;

    async function saveSettings() {
      const phe = parseInt(document.getElementById('settingDailyPhe')?.value) || 300;
      const aksCount = parseInt(document.getElementById('settingAksPortions')?.value) || 4;
      appData.settings.language = document.getElementById('settingLanguage')?.value || appData.settings.language || 'ru';
      appData.settings.dailyPhe = phe;
      appData.settings.age = document.getElementById('settingAge')?.value.trim() || '';
      appData.settings.weightKg = document.getElementById('settingWeightKg')?.value.trim() || '';
      appData.settings.naturalProteinLimit = document.getElementById('settingNaturalProteinLimit')?.value.trim() || '';
      appData.settings.clinicianName = document.getElementById('settingClinicianName')?.value.trim() || '';
      appData.settings.careNotes = document.getElementById('settingCareNotes')?.value.trim() || '';
      appData.settings.showPheWarnings = document.getElementById('settingShowPheWarnings')?.checked !== false;
      appData.settings.aksReminders = document.getElementById('settingAksReminders')?.checked === true;
      if (appData.settings.aksPortions !== aksCount) {
        appData.settings.aksPortions = aksCount;
        appData.aks = new Array(aksCount).fill(false);
      }
      saveLocal();
      render();
      renderProfileSettings();

      if (hasSupabase) {
        try {
          await supabaseRequest('/rest/v1/users?on_conflict=telegram_id', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
            body: JSON.stringify({ telegram_id: currentTelegramId, daily_phe: phe, aks_portions: aksCount })
          });
          setCloudStatus('ok', tr('cloudSaved'));
        } catch(e) {
          setCloudStatus('error', tr('settingsLocalOnly'));
          alert(tr('settingsLocalOnly'));
          console.error('saveSettings error:', e);
        }
      }
    }
    window.saveSettings = saveSettings;

    // Запуск приложения
    document.addEventListener('DOMContentLoaded', init);
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      init();
    }
