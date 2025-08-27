/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;

    return sale_price * quantity * (1 - (discount / 100));
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    
    if (index === 0) {
        return profit * 0.15;
    } else if (index === 1 || index === 2) {
        return profit * 0.1;
    } else if (index === total - 1) {
        return 0;
    } else {
        return profit * 0.05;
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Проверка исходного датасета
    if (!data
    || !Array.isArray(data.sellers)
    || data.sellers.length === 0
    || !Array.isArray(data.products)
    || data.products.length === 0
    || !Array.isArray(data.purchase_records)
    || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    const { calculateRevenue, calculateBonus } = options;

    // Проверка опций
    if (!calculateRevenue || !calculateBonus) {
        throw new Error('Чего-то не хватает');
    }

    if (typeof calculateRevenue !== "function" || typeof calculateBonus !== "function") {
            throw new Error('Опция не является функцией');
    }

    // Массив из продавцов с их статистикой
    const sellerStats = data.sellers.map(seller => ({
        revenue: 0,
        top_products: [],
        bonus: 0,
        name: `${seller.first_name} ${seller.last_name}`,
        sales_count: 0,
        profit: 0,
        seller_id: seller.id,
        products_sold: {}
    }));

    // Индексируем продавцов (из статистики) и товары (из исходного датасета)
    const sellerIndex = Object.fromEntries(sellerStats.map(stat => [stat.seller_id, stat]));
    const productIndex = Object.fromEntries(data.products.map(product => [product.sku, product]));

    // Перебор всех чеков подсчета статистика каждого продавца (кол-во продаж, общая сумма продаж)
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        seller.sales_count ++;
        seller.revenue += record.total_amount;

        // Перебор всех товаров в чеке для подсчета статистика каждого продавца (выручка, проданные товары = {товар: кол-во})
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            const cost = product.purchase_price * item.quantity;
            const revenue =  calculateRevenue(item, product);
            seller.profit += revenue - cost;
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // Сортировка продавцов по прибыли
    sellerStats.sort((seller1, seller2) => seller2.profit - seller1.profit);

    // Сортировка продавцов по прибыли
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        seller.top_products = Object.entries(seller.products_sold).map(([sku, quantity]) => ({sku, quantity})).sort((sku1, sku2) => sku2.quantity - sku1.quantity).slice(0, 10);
    });

    // Вывод результатов
    return sellerStats.map(seller => ({
        seller_id: seller.seller_id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}