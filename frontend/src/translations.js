export const T = {
  en: {
    // Header
    favorites: 'Saved',
    add: 'New Listing',
    myShop: 'My Shop',
    shop: 'Shop',
    back: 'Back',
    // SideMenu
    language: 'Language',
    currency: 'Currency',
    save: 'Save Changes',
    privacy: 'Privacy Policy',
    support: 'Support',
    contact: 'Contact Us',
    // Home
    searchPlaceholder: 'Brand, item, category…',
    noItemsYet: 'No items yet',
    couldNotConnect: 'Could not connect to server',
    // Favorites
    noFavorites: 'No saved items yet',
    // Profile
    myListings: 'My Listings',
    listings: 'Listings',
    lookBoard: 'Look Board',
    createFirstLook: 'Create your first look board',
    followers: 'Followers',
    items: 'Items',
    follow: 'Follow',
    following: 'Following',
    addBio: 'Add a bio…',
    addCover: 'Add cover',
    sold: 'Sold',
    markSold: 'Mark sold',
    markAvailable: 'Mark available',
    delete: 'Delete',
    newListing: '+ New',
    addLook: '+ Add',
    listFirstItem: 'List your first item',
    remove: 'Remove',
    shopNotFound: 'Shop not found',
  },
  ru: {
    // Header
    favorites: 'Сохранённое',
    add: 'Новое объявление',
    myShop: 'Мой магазин',
    shop: 'Магазин',
    back: 'Назад',
    // SideMenu
    language: 'Язык',
    currency: 'Валюта',
    save: 'Сохранить',
    privacy: 'Политика конфиденциальности',
    support: 'Поддержка',
    contact: 'Написать нам',
    // Home
    searchPlaceholder: 'Бренд, категория, описание…',
    noItemsYet: 'Пока нет вещей',
    couldNotConnect: 'Нет соединения с сервером',
    // Favorites
    noFavorites: 'Сохранённых вещей пока нет',
    // Profile
    myListings: 'Мои объявления',
    listings: 'Объявления',
    lookBoard: 'Look Board',
    createFirstLook: 'Создайте первый look board',
    followers: 'Подписчики',
    items: 'Вещи',
    follow: 'Подписаться',
    following: 'Вы подписаны',
    addBio: 'Расскажите о магазине…',
    addCover: 'Добавить обложку',
    sold: 'Продано',
    markSold: 'Отметить проданным',
    markAvailable: 'Снять отметку',
    delete: 'Удалить',
    newListing: '+ Новое',
    addLook: '+ Добавить',
    listFirstItem: 'Добавьте первую вещь',
    remove: 'Убрать',
    shopNotFound: 'Магазин не найден',
  },
};

export function t(language, key) {
  return T[language]?.[key] ?? T.en[key] ?? key;
}
