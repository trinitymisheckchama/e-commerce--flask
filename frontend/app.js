const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const elements = {
    accountButton: document.querySelector("#account-button"),
    accountDialog: document.querySelector("#account-dialog"),
    accountForm: document.querySelector("#account-form"),
    accountMessage: document.querySelector("#account-message"),
    accountSubmit: document.querySelector("#account-submit"),
    adminDialog: document.querySelector("#admin-dialog"),
    adminMessage: document.querySelector("#admin-message"),
    bagButton: document.querySelector("#bag-button"),
    bagCount: document.querySelector("#bag-count"),
    cartCountLabel: document.querySelector("#cart-count-label"),
    cartItems: document.querySelector("#cart-items"),
    cartPanel: document.querySelector("#cart-panel"),
    cartTotal: document.querySelector("#cart-total"),
    categoryRow: document.querySelector("#category-row"),
    checkoutButton: document.querySelector("#checkout-button"),
    productForm: document.querySelector("#product-form"),
    productGrid: document.querySelector("#product-grid"),
    productMessage: document.querySelector("#product-message"),
    resultsLine: document.querySelector("#results-line"),
    searchForm: document.querySelector("#search-form"),
    searchInput: document.querySelector("#search-input"),
    sellerButton: document.querySelector("#seller-button"),
    sellerDialog: document.querySelector("#seller-dialog"),
    sortSelect: document.querySelector("#sort-select"),
    scrim: document.querySelector("#scrim"),
    toast: document.querySelector("#toast")
};

const accountFields = {
    username: document.querySelector("#username-field"),
    role: document.querySelector("#role-field")
};
const state = {
    products: [],
    categories: [],
    category: "",
    search: "",
    cart: readCart(),
    accountMode: "login",
    user: readUser()
};
let toastTimer;

function readUser() {
    try {
        return JSON.parse(localStorage.getItem("goodgoods-user")) || null;
    } catch {
        return null;
    }
}

function readCart() {
    try {
        return JSON.parse(localStorage.getItem("goodgoods-cart")) || {};
    } catch {
        return {};
    }
}

function saveCart() {
    localStorage.setItem("goodgoods-cart", JSON.stringify(state.cart));
}

function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 3000);
}

async function request(url, options = {}) {
    const headers = { "Content-Type": "application/json", ...options.headers };
    if (state.user?.token) headers.Authorization = `Bearer ${state.user.token}`;
    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Something went wrong. Please try again.");
    return data;
}

function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function renderCategories() {
    elements.categoryRow.replaceChildren();
    [["", "Everything"], ...state.categories.map((category) => [category, category])].forEach(([value, label]) => {
        const button = makeElement("button", `category-chip${state.category === value ? " is-active" : ""}`, label);
        button.type = "button";
        button.setAttribute("aria-pressed", String(state.category === value));
        button.addEventListener("click", () => {
            state.category = value;
            loadProducts();
        });
        elements.categoryRow.append(button);
    });
}

function createProductCard(product, index) {
    const card = makeElement("article", "product-card");
    card.style.animationDelay = `${Math.min(index, 7) * 45}ms`;
    const visual = makeElement("div", `product-visual${product.image_url ? "" : " is-empty"}`);

    if (product.image_url) {
        const image = document.createElement("img");
        image.src = product.image_url;
        image.alt = product.name;
        image.loading = "lazy";
        image.addEventListener("error", () => {
            image.remove();
            visual.classList.add("is-empty");
        }, { once: true });
        visual.append(image);
    }

    visual.append(makeElement("span", "product-category", product.category));
    const addButton = makeElement("button", "add-button", "+");
    addButton.type = "button";
    addButton.title = `Add ${product.name} to bag`;
    addButton.setAttribute("aria-label", `Add ${product.name} to bag`);
    addButton.disabled = Number(product.stock) < 1;
    addButton.addEventListener("click", () => addToCart(product));
    visual.append(addButton);

    const info = makeElement("div", "product-info");
    info.append(makeElement("h3", "product-name", product.name));
    info.append(makeElement("p", "product-description", product.description || "Made to find its way into your everyday."));
    const meta = makeElement("div", "product-meta");
    meta.append(makeElement("span", "product-price", currency.format(Number(product.price))));
    meta.append(makeElement("span", "stock-note", Number(product.stock) > 0 ? "Ready to ship" : "Sold out"));
    info.append(meta);
    card.append(visual, info);
    return card;
}

function renderProducts() {
    elements.productGrid.replaceChildren();
    if (!state.products.length) {
        const empty = makeElement("div", "empty-state");
        empty.append(makeElement("strong", "", state.search || state.category ? "Nothing in this little corner yet." : "The shelves are getting ready."));
        empty.append(makeElement("p", "", state.search || state.category
            ? "Try a different search or category."
            : "Check back soon, or open a shop and be the first to add something."));
        elements.productGrid.append(empty);
        elements.resultsLine.textContent = "0 finds";
        return;
    }

    state.products.forEach((product, index) => elements.productGrid.append(createProductCard(product, index)));
    elements.resultsLine.textContent = `${state.products.length} ${state.products.length === 1 ? "find" : "finds"}`;
}

async function loadProducts() {
    elements.resultsLine.textContent = "Finding the good stuff...";
    const params = new URLSearchParams({ sort: elements.sortSelect.value });
    if (state.search) params.set("search", state.search);
    if (state.category) params.set("category", state.category);
    try {
        const data = await request(`/api/products?${params}`);
        state.products = data.products || [];
        if (!state.search && !state.category) {
            state.categories = [...new Set(state.products.map((product) => product.category).filter(Boolean))].sort();
        }
        renderCategories();
        renderProducts();
    } catch (error) {
        elements.productGrid.replaceChildren();
        const empty = makeElement("div", "empty-state");
        empty.append(makeElement("strong", "", "We couldn’t reach the shop."));
        empty.append(makeElement("p", "", "Check that the server and database are running, then refresh."));
        elements.productGrid.append(empty);
        elements.resultsLine.textContent = error.message;
    }
}

function cartEntries() {
    return Object.values(state.cart).filter((entry) => entry?.product && Number(entry.quantity) > 0);
}

function addToCart(product) {
    const id = String(product.id);
    const current = state.cart[id]?.quantity || 0;
    if (current >= Number(product.stock)) {
        showToast("That’s all the stock we have for this one.");
        return;
    }
    state.cart[id] = { product, quantity: current + 1 };
    saveCart();
    renderCart();
    showToast(`${product.name} added to your bag`);
}

function changeQuantity(id, amount) {
    const entry = state.cart[id];
    if (!entry) return;
    const quantity = entry.quantity + amount;
    if (quantity < 1) delete state.cart[id];
    else if (quantity <= Number(entry.product.stock)) entry.quantity = quantity;
    else showToast("That’s all the stock we have for this one.");
    saveCart();
    renderCart();
}

function renderCart() {
    const entries = cartEntries();
    const count = entries.reduce((sum, entry) => sum + entry.quantity, 0);
    const total = entries.reduce((sum, entry) => sum + Number(entry.product.price) * entry.quantity, 0);
    elements.bagCount.textContent = String(count);
    elements.cartCountLabel.textContent = `(${count})`;
    elements.cartTotal.textContent = currency.format(total);
    elements.cartItems.replaceChildren();

    if (!entries.length) {
        elements.cartItems.append(makeElement("p", "cart-empty", "Your bag is taking a little breather."));
        return;
    }

    entries.forEach(({ product, quantity }) => {
        const item = makeElement("div", "cart-item");
        if (product.image_url) {
            const image = makeElement("img", "cart-thumb");
            image.src = product.image_url;
            image.alt = "";
            image.addEventListener("error", () => {
                image.removeAttribute("src");
                image.classList.add("is-empty");
            }, { once: true });
            item.append(image);
        } else {
            item.append(makeElement("div", "cart-thumb is-empty"));
        }

        const copy = makeElement("div", "cart-item-copy");
        copy.append(makeElement("strong", "", product.name));
        copy.append(makeElement("span", "", currency.format(Number(product.price))));
        const quantityControl = makeElement("div", "quantity-control");
        const decrease = makeElement("button", "", "−");
        decrease.type = "button";
        decrease.setAttribute("aria-label", `Remove one ${product.name}`);
        decrease.addEventListener("click", () => changeQuantity(String(product.id), -1));
        const amount = makeElement("span", "", String(quantity));
        const increase = makeElement("button", "", "+");
        increase.type = "button";
        increase.setAttribute("aria-label", `Add one ${product.name}`);
        increase.disabled = quantity >= Number(product.stock);
        increase.addEventListener("click", () => changeQuantity(String(product.id), 1));
        quantityControl.append(decrease, amount, increase);
        copy.append(quantityControl);
        item.append(copy, makeElement("span", "cart-line-price", currency.format(Number(product.price) * quantity)));
        elements.cartItems.append(item);
    });
}

function openCart() {
    elements.scrim.hidden = false;
    elements.cartPanel.classList.add("is-open");
    elements.cartPanel.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    document.querySelector("#close-cart").focus();
}

function closeCart() {
    elements.cartPanel.classList.remove("is-open");
    elements.cartPanel.setAttribute("aria-hidden", "true");
    elements.scrim.hidden = true;
    document.body.style.overflow = "";
}

function setAccountMode(mode) {
    state.accountMode = mode;
    const registering = mode === "register";
    accountFields.username.hidden = !registering;
    elements.accountForm.elements.username.required = registering;
    accountFields.role.hidden = !registering;
    elements.accountForm.elements.email.type = registering ? "email" : "text";
    elements.accountForm.elements.email.autocomplete = registering ? "email" : "username";
    document.querySelector("#email-label").childNodes[0].textContent = registering ? "Email" : "Email or username";
    elements.accountForm.elements.password.autocomplete = registering ? "new-password" : "current-password";
    elements.accountMessage.textContent = "";
    elements.accountMessage.classList.remove("is-success");
    elements.accountSubmit.textContent = registering ? "Create account" : "Sign in";
    document.querySelector("#account-title").textContent = registering ? "Make yourself at home." : "Welcome back.";
    document.querySelector("#login-tab").classList.toggle("is-active", !registering);
    document.querySelector("#register-tab").classList.toggle("is-active", registering);
    document.querySelector("#login-tab").setAttribute("aria-selected", String(!registering));
    document.querySelector("#register-tab").setAttribute("aria-selected", String(registering));
}

function openAccount(mode = "login") {
    setAccountMode(mode);
    elements.accountDialog.showModal();
}

function renderAccountButton() {
    if (!state.user) {
        elements.accountButton.textContent = "Sign in";
    } else if (state.user.role === "seller") {
        elements.accountButton.textContent = "Seller studio";
    } else if (state.user.role === "admin") {
        elements.accountButton.textContent = "Admin dashboard";
    } else {
        elements.accountButton.textContent = "Sign out";
    }
}

async function openAdminDashboard() {
    elements.adminMessage.textContent = "Loading dashboard...";
    elements.adminDialog.showModal();
    try {
        const data = await request("/admin-dashboard");
        elements.adminMessage.textContent = data.message;
    } catch (error) {
        elements.adminMessage.textContent = error.message;
    }
}

function signOut() {
    state.user = null;
    localStorage.removeItem("goodgoods-user");
    renderAccountButton();
    elements.adminDialog.close();
    showToast("You’re signed out.");
}

async function handleAccountSubmit(event) {
    event.preventDefault();
    elements.accountMessage.textContent = "";
    const formData = new FormData(elements.accountForm);
    const payload = Object.fromEntries(formData.entries());
    const endpoint = state.accountMode === "register" ? "/api/auth/register" : "/api/auth/login";
    elements.accountSubmit.disabled = true;

    try {
        const data = await request(endpoint, { method: "POST", body: JSON.stringify(payload) });
        if (state.accountMode === "register") {
            setAccountMode("login");
            elements.accountForm.elements.email.value = payload.email;
            elements.accountMessage.textContent = "Account created. Sign in to continue.";
            elements.accountMessage.classList.add("is-success");
            return;
        }

        state.user = { token: data.token, role: data.role };
        localStorage.setItem("goodgoods-user", JSON.stringify(state.user));
        renderAccountButton();
        elements.accountDialog.close();
        showToast("You’re signed in. Good to have you here.");
    } catch (error) {
        elements.accountMessage.textContent = error.message;
    } finally {
        elements.accountSubmit.disabled = false;
    }
}

async function handleProductSubmit(event) {
    event.preventDefault();
    elements.productMessage.textContent = "";
    const payload = Object.fromEntries(new FormData(elements.productForm).entries());
    elements.productForm.querySelector("button[type=submit]").disabled = true;
    try {
        await request("/api/products/add", { method: "POST", body: JSON.stringify(payload) });
        elements.sellerDialog.close();
        elements.productForm.reset();
        state.category = "";
        state.search = "";
        elements.searchInput.value = "";
        showToast("Your product is now on the shelf.");
        await loadProducts();
        document.querySelector("#shop").scrollIntoView({ behavior: "smooth" });
    } catch (error) {
        elements.productMessage.textContent = error.message;
    } finally {
        elements.productForm.querySelector("button[type=submit]").disabled = false;
    }
}

async function placeOrder() {
    const entries = cartEntries();
    if (!entries.length) {
        showToast("Your bag is empty for now.");
        return;
    }
    if (!state.user) {
        closeCart();
        openAccount();
        elements.accountMessage.textContent = "Sign in as a shopper to place your order.";
        return;
    }
    if (state.user.role !== "buyer") {
        showToast("Sign in with a shopper account to place an order.");
        return;
    }

    elements.checkoutButton.disabled = true;
    try {
        const data = await request("/api/products/checkout", {
            method: "POST",
            body: JSON.stringify({ items: entries.map(({ product, quantity }) => ({ productId: product.id, quantity })) })
        });
        state.cart = {};
        saveCart();
        renderCart();
        closeCart();
        showToast(`Order #${data.orderId} placed. Total ${currency.format(Number(data.total))}.`);
        await loadProducts();
    } catch (error) {
        showToast(error.message);
    } finally {
        elements.checkoutButton.disabled = false;
    }
}

elements.searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.search = elements.searchInput.value.trim();
    state.category = "";
    loadProducts();
});
elements.sortSelect.addEventListener("change", loadProducts);
elements.bagButton.addEventListener("click", openCart);
document.querySelector("#close-cart").addEventListener("click", closeCart);
elements.scrim.addEventListener("click", closeCart);
elements.checkoutButton.addEventListener("click", placeOrder);
elements.accountButton.addEventListener("click", () => {
    if (!state.user) openAccount();
    else if (state.user.role === "seller") elements.sellerDialog.showModal();
    else if (state.user.role === "admin") openAdminDashboard();
    else signOut();
});
document.querySelector("#admin-signout").addEventListener("click", signOut);
elements.sellerButton.addEventListener("click", () => {
    if (state.user?.role === "seller") elements.sellerDialog.showModal();
    else if (state.user) showToast("Sign out and create a seller account to open a shop.");
    else {
        openAccount("register");
        elements.accountForm.elements.role.value = "seller";
    }
});
elements.accountForm.addEventListener("submit", handleAccountSubmit);
elements.productForm.addEventListener("submit", handleProductSubmit);
document.querySelector("#login-tab").addEventListener("click", () => setAccountMode("login"));
document.querySelector("#register-tab").addEventListener("click", () => setAccountMode("register"));
document.querySelectorAll(".dialog-close").forEach((button) => {
    button.addEventListener("click", () => button.closest("dialog").close());
});
document.querySelector("#year").textContent = String(new Date().getFullYear());

renderAccountButton();
renderCart();
loadProducts();