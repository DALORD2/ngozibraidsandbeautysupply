const products = [
  {
    id: 'bow-set',
    name: 'Playful Ribbon Bow Set',
    category: 'accessories',
    categoryLabel: 'Girls’ accessories',
    price: 8,
    image: 'images/accessory-bows.jpg',
    alt: 'Colorful ribbon bows',
    description: 'A sample listing for colorful finishing touches.',
    ingredients: 'Not applicable to this sample accessory.',
    tags: ['bows', 'ribbons', 'girls', 'color', 'new']
  },
  {
    id: 'stretch-ties',
    name: 'Colorful Stretch Ties',
    category: 'accessories',
    categoryLabel: 'Girls’ accessories',
    price: 6,
    image: 'images/accessory-hair-ties.jpg',
    alt: 'Colorful hair ties in a basket',
    description: 'A sample listing for everyday hair ties and clips.',
    ingredients: 'Not applicable to this sample accessory.',
    tags: ['ties', 'clips', 'ponytail', 'everyday', 'new']
  },
  {
    id: 'bead-accents',
    name: 'Braid Bead Accents',
    category: 'accessories',
    categoryLabel: 'Girls’ accessories',
    price: 10,
    image: 'images/accessory-style-inspiration.jpg',
    alt: 'A child wearing colorful hair beads',
    description: 'An illustrative sample for playful braid details.',
    ingredients: 'Not applicable to this sample accessory.',
    tags: ['beads', 'braids', 'color', 'girls']
  },
  {
    id: 'gift-card',
    name: 'Salon Gift Card Concept',
    category: 'gifts',
    categoryLabel: 'Gift idea · sample',
    price: 25,
    image: null,
    alt: '',
    description: 'A sample gift-card listing; ask the salon whether gift cards are available.',
    ingredients: 'Not applicable.',
    tags: ['gift', 'gifts', 'salon', 'special']
  }
];

const productGrid = document.querySelector('#product-grid');
const searchInput = document.querySelector('#product-search');
const categoryFilter = document.querySelector('#category-filter');
const priceFilter = document.querySelector('#price-filter');
const sortProducts = document.querySelector('#sort-products');
const emptyProducts = document.querySelector('#empty-products');
const resultsCount = document.querySelector('#results-count');
const STORAGE_KEYS = {
  cart: 'ngozi-beauty-cart',
  theme: 'ngozi-beauty-theme',
  wishlist: 'ngozi-beauty-wishlist'
};
const productIds = new Set(products.map((product) => product.id));

function readStoredValue(key, fallback) {
  let storedValue;
  try {
    storedValue = window.localStorage.getItem(key);
  } catch (error) {
    console.warn(`Could not read ${key} from local storage.`, error);
    return fallback;
  }
  if (storedValue === null) return fallback;

  try {
    return JSON.parse(storedValue);
  } catch (error) {
    console.warn(`Could not parse ${key} from local storage.`, error);
    return fallback;
  }
}

function saveStoredValue(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Could not save ${key} to local storage.`, error);
    showToast('This browser could not save your preferences on this device.');
  }
}

const storedWishlist = readStoredValue(STORAGE_KEYS.wishlist, []);
const storedCart = readStoredValue(STORAGE_KEYS.cart, {});
const wishlist = new Set(Array.isArray(storedWishlist)
  ? storedWishlist.filter((id) => productIds.has(id))
  : []);
const cart = new Map(storedCart && typeof storedCart === 'object' && !Array.isArray(storedCart)
  ? Object.entries(storedCart)
    .filter(([id, quantity]) => productIds.has(id) && Number.isInteger(quantity) && quantity > 0)
  : []);
const comparison = new Set();
const recentlyViewed = [];
let favoritesOnly = false;
let toastTimer;
let returnFocusElement = null;

const money = (amount) => `$${amount.toFixed(2)}`;
const getProduct = (id) => products.find((product) => product.id === id);

function showToast(message) {
  const toast = document.querySelector('#product-toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

function productImage(product, className = '') {
  if (!product.image) {
    return `<div class="gift-card-art ${className}" aria-label="Sample gift card artwork"><span>NGOZI</span><strong>♡</strong><small>A LITTLE BEAUTY</small></div>`;
  }
  return `<img class="${className}" src="${product.image}" alt="${product.alt}" loading="eager" decoding="async">`;
}

function productCard(product) {
  const isSaved = wishlist.has(product.id);
  const isCompared = comparison.has(product.id);
  return `
    <article class="product-card" data-product-id="${product.id}">
      <div class="product-visual">
        ${productImage(product)}
        <span class="product-badge">SAMPLE FIND</span>
        <button class="product-favorite" type="button" data-action="wishlist" data-id="${product.id}" aria-label="${isSaved ? 'Remove from' : 'Add to'} wishlist" aria-pressed="${isSaved}">${isSaved ? '♥' : '♡'}</button>
      </div>
      <div class="product-card-copy">
        <span class="product-category">${product.categoryLabel}</span>
        <h3>${product.name}</h3>
        <p class="product-description">${product.description}</p>
        <div class="product-meta"><strong class="sample-price">${money(product.price)}</strong><span class="price-note">sample price</span></div>
        <p class="stock-note">Call to check in-store availability</p>
        <div class="product-buttons">
          <button type="button" data-action="quick-view" data-id="${product.id}">Quick view</button>
          <button type="button" data-action="compare" data-id="${product.id}" aria-pressed="${isCompared}">${isCompared ? 'Selected' : 'Compare'}</button>
          <button class="add-to-bag" type="button" data-action="add" data-id="${product.id}">Add to sample bag</button>
        </div>
      </div>
    </article>`;
}

function getVisibleProducts() {
  const query = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;
  const price = priceFilter.value;
  let visible = products.filter((product) => {
    const matchesQuery = !query || `${product.name} ${product.description} ${product.tags.join(' ')}`.toLowerCase().includes(query);
    const matchesCategory = category === 'all' || product.category === category;
    const matchesWishlist = !favoritesOnly || wishlist.has(product.id);
    let matchesPrice = true;

    if (price === 'under-10') matchesPrice = product.price < 10;
    if (price === '10-20') matchesPrice = product.price >= 10 && product.price <= 20;
    if (price === 'over-20') matchesPrice = product.price > 20;

    return matchesQuery && matchesCategory && matchesPrice && matchesWishlist;
  });

  if (sortProducts.value === 'price-low') visible = visible.sort((a, b) => a.price - b.price);
  if (sortProducts.value === 'price-high') visible = visible.sort((a, b) => b.price - a.price);
  if (sortProducts.value === 'name') visible = visible.sort((a, b) => a.name.localeCompare(b.name));
  return visible;
}

function renderProducts() {
  const visible = getVisibleProducts();
  productGrid.innerHTML = visible.map(productCard).join('');
  emptyProducts.hidden = visible.length > 0;
  productGrid.hidden = visible.length === 0;
  resultsCount.textContent = `${visible.length} sample ${visible.length === 1 ? 'find' : 'finds'} · prices and availability are illustrative`;
  document.querySelector('#favorites-filter-count').textContent = String(wishlist.size);
  document.querySelector('#wishlist-count').textContent = String(wishlist.size);
  renderRecommendations();
}

function miniProduct(product) {
  return `<button class="mini-product" type="button" data-open-product="${product.id}">
    ${productImage(product)}
    <span>${product.name}<small>${money(product.price)} · sample</small></span>
  </button>`;
}

function renderRecentlyViewed() {
  const section = document.querySelector('#recently-viewed');
  const items = recentlyViewed.map(getProduct).filter(Boolean);
  section.hidden = items.length === 0;
  document.querySelector('#recent-products').innerHTML = items.map(miniProduct).join('');
}

function renderRecommendations() {
  const recommendationSection = document.querySelector('#for-you');
  const preferences = [...wishlist, ...cart.keys(), ...recentlyViewed];
  if (preferences.length === 0) {
    recommendationSection.hidden = true;
    return;
  }

  const sourceProduct = getProduct(preferences[preferences.length - 1]);
  const category = sourceProduct ? sourceProduct.category : 'accessories';
  let suggestions = products.filter((product) => product.category === category && product.id !== (sourceProduct && sourceProduct.id));
  if (suggestions.length === 0) suggestions = products.filter((product) => product.id !== (sourceProduct && sourceProduct.id));
  recommendationSection.hidden = suggestions.length === 0;
  document.querySelector('#recommended-products').innerHTML = suggestions.slice(0, 3).map(miniProduct).join('');
}

function updateCart(persist = true) {
  if (persist) saveStoredValue(STORAGE_KEYS.cart, Object.fromEntries(cart));
  const quantity = [...cart.values()].reduce((total, count) => total + count, 0);
  document.querySelector('#cart-count').textContent = String(quantity);
  document.querySelector('#drawer-cart-count').textContent = `(${quantity})`;
  document.querySelector('#cart-empty').hidden = quantity > 0;
  document.querySelector('#cart-items').hidden = quantity === 0;
  const subtotal = [...cart.entries()].reduce((total, [id, count]) => total + getProduct(id).price * count, 0);
  document.querySelector('#cart-subtotal').textContent = money(subtotal);
  document.querySelector('#cart-items').innerHTML = [...cart.entries()].map(([id, count]) => {
    const product = getProduct(id);
    return `<article class="cart-line">
      ${productImage(product)}
      <div><h3>${product.name}</h3><small>Sample price · call to confirm</small>
        <div class="quantity-controls">
          <button type="button" data-cart-action="decrease" data-id="${id}" aria-label="Decrease quantity">−</button>
          <span>${count}</span>
          <button type="button" data-cart-action="increase" data-id="${id}" aria-label="Increase quantity">+</button>
          <button class="text-button" type="button" data-cart-action="remove" data-id="${id}">Remove</button>
        </div>
      </div>
      <strong class="cart-line-price">${money(product.price * count)}</strong>
    </article>`;
  }).join('');
  renderRecommendations();
}

function addToCart(id, quantity = 1) {
  if (!getProduct(id)) return;
  cart.set(id, (cart.get(id) || 0) + quantity);
  updateCart();
  showToast('Added to your sample bag. Call the salon to confirm real availability.');
  const bagButton = document.querySelector('#cart-open');
  bagButton.classList.remove('bag-bounce');
  void bagButton.offsetWidth;
  bagButton.classList.add('bag-bounce');
}

function toggleWishlist(id) {
  if (wishlist.has(id)) wishlist.delete(id);
  else wishlist.add(id);
  saveStoredValue(STORAGE_KEYS.wishlist, [...wishlist]);
  renderProducts();
  renderCompareTray();
}

function toggleComparison(id) {
  if (comparison.has(id)) {
    comparison.delete(id);
  } else if (comparison.size >= 3) {
    showToast('Compare up to three sample products at a time.');
    return;
  } else {
    comparison.add(id);
  }
  renderProducts();
  renderCompareTray();
}

function renderCompareTray() {
  const tray = document.querySelector('#compare-tray');
  tray.hidden = comparison.size === 0;
  document.querySelector('#compare-count').textContent = String(comparison.size);
}

function recordRecentlyViewed(id) {
  const next = recentlyViewed.filter((item) => item !== id);
  next.unshift(id);
  recentlyViewed.splice(0, recentlyViewed.length, ...next.slice(0, 4));
  renderRecentlyViewed();
  renderRecommendations();
}

function openQuickView(id) {
  const product = getProduct(id);
  if (!product) return;
  recordRecentlyViewed(id);
  const dialog = document.querySelector('#quick-view-dialog');
  const image = productImage(product);
  document.querySelector('#quick-view-content').innerHTML = `
    <div class="quick-view-layout">
      ${image}
      <div>
        <p class="eyebrow"><span class="eyebrow-line"></span> SAMPLE CATALOG · ${product.categoryLabel.toUpperCase()}</p>
        <h2 id="quick-view-title">${product.name}</h2>
        <strong class="sample-price">${money(product.price)} <span class="price-note">sample price</span></strong>
        <p>${product.description}</p>
        <p><strong>Ingredients:</strong> ${product.ingredients}</p>
        <p><strong>Availability:</strong> Call the salon to confirm. No live stock data is connected.</p>
        <div class="product-buttons">
          <button type="button" data-action="wishlist" data-id="${product.id}" aria-pressed="${wishlist.has(product.id)}">${wishlist.has(product.id) ? '♥ Saved' : '♡ Save'}</button>
          <button type="button" data-action="compare" data-id="${product.id}" aria-pressed="${comparison.has(product.id)}">Compare</button>
          <button class="add-to-bag" type="button" data-action="add" data-id="${product.id}">Add to sample bag</button>
        </div>
      </div>
    </div>`;
  if (!dialog.open) dialog.showModal();
}

function openComparison() {
  const items = [...comparison].map(getProduct).filter(Boolean);
  if (items.length < 2) {
    showToast('Choose at least two sample products to compare.');
    return;
  }
  const rows = [
    ['Sample price', (product) => money(product.price)],
    ['Category', (product) => product.categoryLabel],
    ['Availability', () => 'Call to confirm; not live'],
    ['Ingredients', (product) => product.ingredients]
  ];
  const table = `<div class="compare-table-wrap"><table class="compare-table"><thead><tr><th>Details</th>${items.map((product) => `<th>${product.name}</th>`).join('')}</tr></thead><tbody>${rows.map(([label, value]) => `<tr><td>${label}</td>${items.map((product) => `<td>${value(product)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <p class="drawer-notice">Sample comparison only. Confirm real product details and prices with the salon.</p>`;
  document.querySelector('#comparison-content').innerHTML = table;
  document.querySelector('#comparison-dialog').showModal();
}

function openCart() {
  returnFocusElement = document.activeElement;
  document.querySelector('#drawer-backdrop').hidden = false;
  document.body.classList.add('drawer-active');
  document.querySelector('#cart-close').focus();
}

function closeCart() {
  document.querySelector('#drawer-backdrop').hidden = true;
  document.body.classList.remove('drawer-active');
  if (returnFocusElement instanceof HTMLElement && returnFocusElement.isConnected) {
    returnFocusElement.focus();
  } else {
    document.querySelector('#cart-open').focus();
  }
  returnFocusElement = null;
}

function applyFilters() {
  renderProducts();
}

productGrid.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]');
  if (!action) return;
  const { id } = action.dataset;
  if (action.dataset.action === 'wishlist') toggleWishlist(id);
  if (action.dataset.action === 'compare') toggleComparison(id);
  if (action.dataset.action === 'add') addToCart(id);
  if (action.dataset.action === 'quick-view') openQuickView(id);
});

document.querySelector('#quick-view-dialog').addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]');
  if (!action) return;
  const { id } = action.dataset;
  if (action.dataset.action === 'wishlist') toggleWishlist(id);
  if (action.dataset.action === 'compare') toggleComparison(id);
  if (action.dataset.action === 'add') addToCart(id);
  if (action.dataset.action === 'add') document.querySelector('#quick-view-dialog').close();
  if (action.dataset.action === 'wishlist' || action.dataset.action === 'compare') openQuickView(id);
});

document.querySelectorAll('[data-close-dialog]').forEach((button) => {
  button.addEventListener('click', () => button.closest('dialog').close());
});

document.querySelectorAll('.site-dialog').forEach((dialog) => {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
});

document.querySelector('#recent-products').addEventListener('click', (event) => {
  const button = event.target.closest('[data-open-product]');
  if (button) openQuickView(button.dataset.openProduct);
});

document.querySelector('#recommended-products').addEventListener('click', (event) => {
  const button = event.target.closest('[data-open-product]');
  if (button) openQuickView(button.dataset.openProduct);
});

document.querySelector('#wishlist-open').addEventListener('click', () => {
  favoritesOnly = !favoritesOnly;
  document.querySelector('#favorites-filter').setAttribute('aria-pressed', String(favoritesOnly));
  applyFilters();
  document.querySelector('#shop').scrollIntoView({ behavior: 'smooth' });
  if (wishlist.size === 0 && favoritesOnly) showToast('Tap the heart on a sample product to save it here.');
});

document.querySelector('#favorites-filter').addEventListener('click', (event) => {
  favoritesOnly = !favoritesOnly;
  event.currentTarget.setAttribute('aria-pressed', String(favoritesOnly));
  applyFilters();
});

document.querySelector('#cart-open').addEventListener('click', openCart);
document.querySelector('#cart-close').addEventListener('click', closeCart);
document.querySelector('.drawer-scrim').addEventListener('click', closeCart);

document.querySelector('#cart-items').addEventListener('click', (event) => {
  const button = event.target.closest('[data-cart-action]');
  if (!button) return;
  const { id } = button.dataset;
  const quantity = cart.get(id) || 0;
  if (button.dataset.cartAction === 'increase') cart.set(id, quantity + 1);
  if (button.dataset.cartAction === 'decrease' && quantity > 1) cart.set(id, quantity - 1);
  if (button.dataset.cartAction === 'decrease' && quantity <= 1) cart.delete(id);
  if (button.dataset.cartAction === 'remove') cart.delete(id);
  updateCart();
});

document.querySelector('#checkout-button').addEventListener('click', () => {
  if (cart.size === 0) {
    showToast('Add a sample product first. Online checkout is not enabled.');
    return;
  }
  document.querySelector('#checkout-dialog').showModal();
});

document.querySelector('#compare-open').addEventListener('click', openComparison);
document.querySelector('#compare-clear').addEventListener('click', () => {
  comparison.clear();
  renderProducts();
  renderCompareTray();
});

document.querySelector('#comparison-content').addEventListener('click', (event) => {
  const button = event.target.closest('[data-open-product]');
  if (button) openQuickView(button.dataset.openProduct);
});

[searchInput, categoryFilter, priceFilter, sortProducts].forEach((control) => {
  control.addEventListener('input', applyFilters);
  control.addEventListener('change', applyFilters);
});

document.querySelector('#reset-filters').addEventListener('click', () => {
  searchInput.value = '';
  categoryFilter.value = 'all';
  priceFilter.value = 'all';
  sortProducts.value = 'featured';
  favoritesOnly = false;
  document.querySelector('#favorites-filter').setAttribute('aria-pressed', 'false');
  applyFilters();
});

document.addEventListener('keydown', (event) => {
  const drawerBackdrop = document.querySelector('#drawer-backdrop');
  if (event.key === 'Tab' && !drawerBackdrop.hidden) {
    const focusable = [...document.querySelector('#cart-drawer').querySelectorAll(
      'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
    )];
    if (focusable.length > 0) {
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    searchInput.focus();
    document.querySelector('#shop').scrollIntoView({ behavior: 'smooth' });
  }
  if (event.key === 'Escape') {
    if (!document.querySelector('#drawer-backdrop').hidden) closeCart();
    if (menuToggle.getAttribute('aria-expanded') === 'true') closeNavigation(true);
  }
});

const galleryDialog = document.querySelector('#gallery-dialog');

document.querySelector('.gallery-grid').addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-gallery-open]');
  if (!trigger) return;

  const figure = trigger.closest('.gallery-item');
  const image = figure.querySelector('img');
  const title = figure.querySelector('figcaption').firstChild.textContent.trim();
  document.querySelector('#gallery-dialog-image').src = image.src;
  document.querySelector('#gallery-dialog-image').alt = image.alt;
  document.querySelector('#gallery-dialog-title').textContent = title;
  galleryDialog.scrollTop = 0;
  if (!galleryDialog.open) galleryDialog.showModal();
  galleryDialog.scrollTop = 0;
});

document.querySelector('#use-gallery-look').addEventListener('click', () => {
  const title = document.querySelector('#gallery-dialog-title').textContent;
  document.querySelector('#style-brief').textContent = `Style inspiration: ${title}. Bring this image to discuss a version tailored to you. Call the salon to confirm a service, timing, and price.`;
  galleryDialog.close();
  document.querySelector('#style-lab').scrollIntoView({ behavior: 'smooth' });
});

document.querySelectorAll('[data-gallery-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.galleryFilter;
    document.querySelectorAll('[data-gallery-filter]').forEach((item) => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('.gallery-item').forEach((item) => {
      item.hidden = filter !== 'all' && item.dataset.style !== filter;
    });
  });
});

document.querySelectorAll('.color-swatch').forEach((swatch) => {
  swatch.addEventListener('click', () => {
    document.querySelectorAll('.color-swatch').forEach((item) => {
      const selected = item === swatch;
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    document.querySelector('#selected-color').textContent = swatch.dataset.color;
  });
});

document.querySelector('#make-style-brief').addEventListener('click', () => {
  const style = document.querySelector('#style-choice').value;
  const length = document.querySelector('#length-choice').value;
  const size = document.querySelector('#size-choice').value;
  const color = document.querySelector('#selected-color').textContent;
  document.querySelector('#style-brief').textContent = `Your inspiration: ${style}, ${length.toLowerCase()}, ${size.toLowerCase()}, in ${color.toLowerCase()}. Call the salon to confirm a service, timing, and price.`;
});

document.querySelector('#build-routine').addEventListener('click', () => {
  const texture = document.querySelector('#texture-choice').value;
  const goal = document.querySelector('#care-goal').value;
  const suggestions = {
    'Moisture': 'Keep the routine gentle and choose moisture products that suit your scalp and hair. Follow product labels.',
    'Gentle detangling': 'Work in small sections with a gentle touch; use a detangling method that feels comfortable for your hair.',
    'Protective-style upkeep': 'Follow your stylist’s aftercare advice, keep the style comfortable, and protect it while you sleep.'
  };
  document.querySelector('#routine-result').textContent = `${texture}: ${suggestions[goal]} Ask your stylist for advice tailored to you.`;
});

document.querySelector('#find-style').addEventListener('click', () => {
  const occasion = document.querySelector('#occasion-choice').value;
  const ideas = {
    everyday: 'For everyday ease, explore medium braids or a simple accessory accent in the inspiration gallery.',
    special: 'For a special occasion, explore curly finishes and decorative details in the inspiration gallery.',
    protective: 'For a protective look, explore cornrows, twists, or knotless braids and discuss upkeep with your stylist.'
  };
  document.querySelector('#quiz-result').textContent = ideas[occasion];
});

document.querySelector('#theme-toggle').addEventListener('click', (event) => {
  const isDark = document.documentElement.dataset.theme !== 'dark';
  setTheme(isDark ? 'dark' : 'light');
});

function setTheme(theme, persist = true) {
  const isDark = theme === 'dark';
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  const themeToggle = document.querySelector('#theme-toggle');
  themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  themeToggle.setAttribute('aria-pressed', String(isDark));
  themeToggle.textContent = isDark ? '☼' : '◐';
  const themeColor = document.querySelector('#theme-color');
  if (themeColor) themeColor.content = isDark ? '#171513' : '#f8f6f0';
  if (persist) saveStoredValue(STORAGE_KEYS.theme, isDark ? 'dark' : 'light');
}

const storedTheme = readStoredValue(STORAGE_KEYS.theme, 'light');
setTheme(storedTheme === 'dark' ? 'dark' : 'light', false);

const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#primary-navigation');

function closeNavigation(returnFocus = false) {
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open menu');
  navigation.classList.remove('is-open');
  if (returnFocus) menuToggle.focus();
}

menuToggle.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Open menu' : 'Close menu');
  navigation.classList.toggle('is-open', !isOpen);
  if (!isOpen) navigation.querySelector('a')?.focus();
});

navigation.addEventListener('click', (event) => {
  if (event.target instanceof Element && event.target.closest('a')) {
    closeNavigation();
  }
});

document.addEventListener('click', (event) => {
  if (menuToggle.getAttribute('aria-expanded') !== 'true') return;
  if (event.target instanceof Node && !menuToggle.contains(event.target) && !navigation.contains(event.target)) {
    closeNavigation();
  }
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 1120 && menuToggle.getAttribute('aria-expanded') === 'true') closeNavigation();
});

const currentYear = document.querySelector('#current-year');
if (currentYear) currentYear.textContent = String(new Date().getFullYear());

renderProducts();
updateCart(false);
