// ===== 五月咖啡 在线点单 =====

let CATEGORIES = [];          // 分类+商品
let PRODUCTS = {};            // id -> product
let cart = [];                // 购物车 [{key, product_id, name, basePrice, unitPrice, quantity, options:[{group,label,price}], optionsText}]

// 规格弹窗临时状态
let specState = null;

const $ = (id) => document.getElementById(id);
const yuan = (n) => '¥' + (Math.round(n * 100) / 100);

// ---------- 加载菜单 ----------
async function loadProducts() {
    try {
        const res = await fetch('/api/products');
        const data = await res.json();
        CATEGORIES = data.categories || [];
        PRODUCTS = {};
        CATEGORIES.forEach(cat => cat.products.forEach(p => { PRODUCTS[p.id] = p; }));
        renderCategories();
        renderProducts();
    } catch (e) {
        $('orderContent').innerHTML = '<div class="loading">菜单加载失败，请刷新重试</div>';
        console.error(e);
    }
}

function renderCategories() {
    $('orderCategories').innerHTML = CATEGORIES.map((c, i) =>
        `<a href="#cat-${c.category}" class="order-cat-item${i === 0 ? ' active' : ''}" data-cat="${c.category}">${escapeHtml(c.category_name)}</a>`
    ).join('');
    document.querySelectorAll('.order-cat-item').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.getElementById('cat-' + el.dataset.cat);
            if (target) target.scrollIntoView({ behavior: 'smooth' });
            setActiveCat(el.dataset.cat);
        });
    });
}

function setActiveCat(cat) {
    document.querySelectorAll('.order-cat-item').forEach(el => {
        el.classList.toggle('active', el.dataset.cat === cat);
    });
}

function renderProducts() {
    $('orderContent').innerHTML = CATEGORIES.map(c => `
        <div class="order-section" id="cat-${c.category}">
            <h2 class="section-title">${escapeHtml(c.category_name)}</h2>
            <div class="order-product-list">
                ${c.products.map(p => productCard(p)).join('')}
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.op-add').forEach(btn => {
        btn.addEventListener('click', () => onAddClick(parseInt(btn.dataset.id)));
    });
}

function productCard(p) {
    const hasOptions = (p.options && p.options.length > 0);
    return `
        <div class="order-product">
            <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy">
            <div class="op-info">
                <h3>${escapeHtml(p.name)}</h3>
                <p>${escapeHtml(p.description || '')}</p>
                <div class="op-bottom">
                    <span class="op-price">${yuan(p.price)}<span class="op-price-up">${hasOptions ? ' 起' : ''}</span></span>
                    <button class="op-add" data-id="${p.id}">${hasOptions ? '选规格' : '加入'}</button>
                </div>
            </div>
        </div>
    `;
}

// ---------- 规格弹窗 ----------
function onAddClick(productId) {
    const p = PRODUCTS[productId];
    if (!p) return;
    if (!p.options || p.options.length === 0) {
        addToCart(p, [], 1);
        bumpCartBar();
        return;
    }
    openSpec(p);
}

function openSpec(p) {
    specState = { product: p, quantity: 1, selections: {} };
    // 单选默认选第一个
    p.options.forEach(grp => {
        if (grp.type === 'single' && grp.choices.length) {
            specState.selections[grp.name] = [grp.choices[0].label];
        } else {
            specState.selections[grp.name] = [];
        }
    });
    $('specName').textContent = p.name;
    $('specBody').innerHTML = p.options.map(grp => specGroup(grp)).join('');
    bindSpecChoices(p);
    $('specQty').textContent = '1';
    updateSpecPrice();
    showModal('specModal');
}

function specGroup(grp) {
    return `
        <div class="spec-group">
            <div class="spec-group-title">${escapeHtml(grp.name)}${grp.type === 'multi' ? '<span class="spec-multi">可多选</span>' : ''}</div>
            <div class="spec-choices">
                ${grp.choices.map(ch => `
                    <button type="button" class="spec-choice" data-group="${escapeHtml(grp.name)}" data-label="${escapeHtml(ch.label)}" data-price="${ch.price}" data-type="${grp.type}">
                        ${escapeHtml(ch.label)}${ch.price > 0 ? `<span class="spec-choice-price">+${ch.price}</span>` : ''}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

function bindSpecChoices(p) {
    document.querySelectorAll('#specBody .spec-choice').forEach(btn => {
        const grpName = btn.dataset.group;
        const label = btn.dataset.label;
        const type = btn.dataset.type;
        // 初始化高亮
        if ((specState.selections[grpName] || []).includes(label)) btn.classList.add('active');
        btn.addEventListener('click', () => {
            const sel = specState.selections[grpName] || [];
            if (type === 'single') {
                specState.selections[grpName] = [label];
                btn.parentElement.querySelectorAll('.spec-choice').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            } else {
                if (sel.includes(label)) {
                    specState.selections[grpName] = sel.filter(l => l !== label);
                    btn.classList.remove('active');
                } else {
                    specState.selections[grpName] = [...sel, label];
                    btn.classList.add('active');
                }
            }
            updateSpecPrice();
        });
    });
}

function computeSpecUnitPrice() {
    const p = specState.product;
    let price = p.price;
    p.options.forEach(grp => {
        (specState.selections[grp.name] || []).forEach(label => {
            const ch = grp.choices.find(c => c.label === label);
            if (ch) price += ch.price;
        });
    });
    return price;
}

function updateSpecPrice() {
    const unit = computeSpecUnitPrice();
    $('specPrice').textContent = yuan(unit * specState.quantity);
}

// ---------- 购物车 ----------
function collectSpecSelections() {
    const p = specState.product;
    const list = [];
    p.options.forEach(grp => {
        (specState.selections[grp.name] || []).forEach(label => {
            const ch = grp.choices.find(c => c.label === label);
            list.push({ group: grp.name, label: label, price: ch ? ch.price : 0 });
        });
    });
    return list;
}

function addToCart(product, options, quantity) {
    const optionsText = options.map(o => o.label).join('/');
    const unitPrice = product.price + options.reduce((s, o) => s + o.price, 0);
    const key = product.id + '|' + options.map(o => o.group + ':' + o.label).join(',');
    const existing = cart.find(it => it.key === key);
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({
            key, product_id: product.id, name: product.name,
            unitPrice, quantity, options, optionsText
        });
    }
    saveCart();
    renderCartBar();
}

function confirmSpec() {
    const options = collectSpecSelections();
    addToCart(specState.product, options, specState.quantity);
    hideModal('specModal');
    bumpCartBar();
}

function cartCount() { return cart.reduce((s, it) => s + it.quantity, 0); }
function cartTotal() { return cart.reduce((s, it) => s + it.unitPrice * it.quantity, 0); }

function renderCartBar() {
    const count = cartCount();
    const total = cartTotal();
    $('cartBadge').textContent = count;
    $('cartTotal').textContent = yuan(total);
    $('checkoutBtn').disabled = count === 0;
    $('cartBadge').style.display = count > 0 ? 'flex' : 'none';
}

function bumpCartBar() {
    const bar = $('cartBar');
    bar.classList.remove('bump');
    void bar.offsetWidth;
    bar.classList.add('bump');
}

function renderCartItems() {
    if (cart.length === 0) {
        $('cartItems').innerHTML = '<div class="cart-empty">购物车还是空的，去挑选喜欢的饮品吧～</div>';
    } else {
        $('cartItems').innerHTML = cart.map((it, i) => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${escapeHtml(it.name)}</div>
                    ${it.optionsText ? `<div class="cart-item-opt">${escapeHtml(it.optionsText)}</div>` : ''}
                    <div class="cart-item-price">${yuan(it.unitPrice)}</div>
                </div>
                <div class="cart-item-qty">
                    <button class="qty-btn" data-act="minus" data-i="${i}">-</button>
                    <span>${it.quantity}</span>
                    <button class="qty-btn" data-act="plus" data-i="${i}">+</button>
                </div>
            </div>
        `).join('');
        document.querySelectorAll('#cartItems .qty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const i = parseInt(btn.dataset.i);
                if (btn.dataset.act === 'plus') cart[i].quantity++;
                else cart[i].quantity--;
                if (cart[i].quantity <= 0) cart.splice(i, 1);
                saveCart();
                renderCartBar();
                renderCartItems();
            });
        });
    }
    $('cartSheetTotal').textContent = yuan(cartTotal());
}

function saveCart() {
    try { localStorage.setItem('mc_cart', JSON.stringify(cart)); } catch (e) {}
}
function loadCart() {
    try {
        const raw = localStorage.getItem('mc_cart');
        if (raw) cart = JSON.parse(raw) || [];
    } catch (e) { cart = []; }
}

// ---------- 结算 ----------
function openCheckout() {
    if (cart.length === 0) return;
    $('checkoutSummary').innerHTML = cart.map(it => `
        <div class="cs-row">
            <span>${escapeHtml(it.name)}${it.optionsText ? ' · ' + escapeHtml(it.optionsText) : ''} x${it.quantity}</span>
            <span>${yuan(it.unitPrice * it.quantity)}</span>
        </div>
    `).join('');
    $('checkoutTotal').textContent = yuan(cartTotal());
    showModal('checkoutModal');
}

async function submitOrder() {
    const name = $('custName').value.trim();
    if (!name) { alert('请填写取餐人姓名'); return; }
    const pickup = document.querySelector('#pickupGroup .seg-btn.active').dataset.val;
    const payload = {
        customer_name: name,
        phone: $('custPhone').value.trim(),
        pickup_method: pickup,
        note: $('custNote').value.trim(),
        pay_method: '到店支付',
        items: cart.map(it => ({
            product_id: it.product_id,
            quantity: it.quantity,
            options: it.options.map(o => ({ group: o.group, label: o.label }))
        }))
    };
    const btn = $('submitOrder');
    btn.disabled = true; btn.textContent = '提交中...';
    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            cart = [];
            saveCart();
            renderCartBar();
            hideModal('checkoutModal');
            hideModal('cartModal');
            $('successCode').textContent = data.order.pickup_code;
            $('successNo').textContent = data.order.order_no;
            $('successPoints').textContent = data.points_earned > 0
                ? `已获得 ${data.points_earned} 积分` : '';
            showModal('successModal');
        } else {
            alert(data.error || '下单失败，请重试');
        }
    } catch (e) {
        alert('网络错误，请重试');
    } finally {
        btn.disabled = false; btn.textContent = '提交订单';
    }
}

// ---------- 弹窗工具 ----------
function showModal(id) { $(id).classList.add('show'); document.body.style.overflow = 'hidden'; }
function hideModal(id) { $(id).classList.remove('show'); document.body.style.overflow = ''; }

function escapeHtml(text) {
    if (text == null) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// ---------- 滚动高亮分类 ----------
function bindScrollSpy() {
    const content = $('orderContent');
    content.addEventListener('scroll', throttle(() => {
        const sections = document.querySelectorAll('.order-section');
        let current = null;
        sections.forEach(sec => {
            if (sec.getBoundingClientRect().top - content.getBoundingClientRect().top <= 80) {
                current = sec.id.replace('cat-', '');
            }
        });
        if (current) setActiveCat(current);
    }, 150));
}
function throttle(fn, wait) {
    let last = 0;
    return function () { const now = Date.now(); if (now - last > wait) { last = now; fn(); } };
}

// ---------- 初始化 ----------
document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    loadProducts();
    renderCartBar();

    $('specClose').addEventListener('click', () => hideModal('specModal'));
    $('specMinus').addEventListener('click', () => {
        if (specState.quantity > 1) { specState.quantity--; $('specQty').textContent = specState.quantity; updateSpecPrice(); }
    });
    $('specPlus').addEventListener('click', () => {
        specState.quantity++; $('specQty').textContent = specState.quantity; updateSpecPrice();
    });
    $('specAdd').addEventListener('click', confirmSpec);

    $('cartBarToggle').addEventListener('click', () => { renderCartItems(); showModal('cartModal'); });
    $('cartClose').addEventListener('click', () => hideModal('cartModal'));
    $('cartClear').addEventListener('click', () => {
        if (confirm('确定清空购物车吗？')) { cart = []; saveCart(); renderCartBar(); renderCartItems(); }
    });

    $('checkoutBtn').addEventListener('click', openCheckout);
    $('checkoutClose').addEventListener('click', () => hideModal('checkoutModal'));
    $('submitOrder').addEventListener('click', submitOrder);

    document.querySelectorAll('#pickupGroup .seg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#pickupGroup .seg-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    $('successOk').addEventListener('click', () => hideModal('successModal'));

    // 点击遮罩关闭
    document.querySelectorAll('.modal-mask').forEach(mask => {
        mask.addEventListener('click', (e) => { if (e.target === mask) hideModal(mask.id); });
    });
});
