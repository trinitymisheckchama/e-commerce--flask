const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const elements = {
    accountButton: document.querySelector("#account-button"),
    accountDialog: document.querySelector("#account-dialog"),
    accountForm: document.querySelector("#account-form"),
    accountMessage: document.querySelector("#account-message"),
    accountSubmit: document.querySelector("#account-submit"),
    adminDialog: document.querySelector("#admin-dialog"),
    adminMessage: document.querySelector("#admin-message"),
    adminMetrics: document.querySelector("#admin-metrics"),
    adminUserRows: document.querySelector("#admin-user-rows"),
    adminCreateForm: document.querySelector("#admin-create-form"),
    adminCreateMessage: document.querySelector("#admin-create-message"),
    adminCreateSubmit: document.querySelector("#admin-create-submit"),
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
    paymentDialog: document.querySelector("#payment-dialog"),
    paymentForm: document.querySelector("#payment-form"),
    paymentMessage: document.querySelector("#payment-message"),
    paymentSubmit: document.querySelector("#payment-submit"),
    paymentTotal: document.querySelector("#payment-total"),
    resultsLine: document.querySelector("#results-line"),
    searchForm: document.querySelector("#search-form"),
    searchInput: document.querySelector("#search-input"),
    sellerButton: document.querySelector("#seller-button"),
    sellerDialog: document.querySelector("#seller-dialog"),
    sellerPerformance: document.querySelector("#seller-performance"),
    sellerPerformanceButton: document.querySelector("#seller-performance-button"),
    sellerListings: document.querySelector("#seller-listings"),
    sellerListingsSection: document.querySelector("#seller-listings-section"),
    sellerListMessage: document.querySelector("#seller-list-message"),
    sellerMetrics: document.querySelector("#seller-metrics"),
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
    addButton.title = `Add ${product.name} to cart`;
    addButton.setAttribute("aria-label", `Add ${product.name} to cart`);
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
    showToast(`${product.name} added to your cart`);
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
        elements.cartItems.append(makeElement("p", "cart-empty", "Your cart is empty."));
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
    const isSeller = state.user?.role === "seller";
    const isAdmin = state.user?.role === "admin";
    elements.accountButton.classList.toggle("seller-header-signout", isSeller);
    elements.accountButton.classList.toggle("text-button", !isSeller);
    document.querySelector("#seller-header-signout").hidden = !isSeller;
    elements.sellerPerformanceButton.hidden = !isSeller;
    document.querySelector("#admin-header-signout").hidden = !isAdmin;
    if (!state.user) {
        elements.accountButton.textContent = "Sign in";
    } else if (isSeller) {
        elements.accountButton.textContent = "Add product";
    } else if (state.user.role === "admin") {
        elements.accountButton.textContent = "Admin dashboard";
    } else {
        elements.accountButton.textContent = "Sign out";
    }
}

async function openAdminDashboard() {
    elements.adminMessage.textContent = "Loading dashboard...";
    elements.adminDialog.showModal();
    document.querySelector("#admin-header-signout").hidden = true;
    await Promise.all([loadAdminAccounts(), loadAdminReports()]);
}

async function loadAdminAccounts() {
    try {
        const data = await request("/api/admin/users");
        renderAdminAccounts(data.users || []);
    } catch (error) {
        elements.adminMessage.textContent = error.message;
    }
}

function renderAdminAccounts(users) {
    elements.adminUserRows.replaceChildren();
    document.querySelector("#account-count").textContent = `${users.length} total`;
    users.forEach((user) => {
        const row = document.createElement("tr");
        const accountCell = document.createElement("td");
        accountCell.append(makeElement("strong", "admin-account-name", user.username));
        accountCell.append(makeElement("span", "admin-account-email", user.email));
        const roleCell = makeElement("td", "", user.role);
        const statusCell = document.createElement("td");
        statusCell.append(makeElement("span", `account-status is-${user.status}`, user.status));
        const actionsCell = document.createElement("td");
        const actions = makeElement("div", "admin-row-actions");

        if (user.role !== "admin" && user.status !== "deleted") {
            const statusButton = makeElement("button", "admin-action", user.status === "active" ? "Disable" : "Enable");
            statusButton.type = "button";
            statusButton.addEventListener("click", () => changeAccountStatus(user.id, user.status === "active" ? "disabled" : "active"));
            const deleteButton = makeElement("button", "admin-action is-danger", "Delete");
            deleteButton.type = "button";
            deleteButton.addEventListener("click", () => deleteAccount(user.id, user.username));
            actions.append(statusButton, deleteButton);
        } else if (user.role === "admin") {
            actions.append(makeElement("span", "admin-protected-label", "Protected"));
        } else {
            actions.append(makeElement("span", "admin-protected-label", "Removed"));
        }

        actionsCell.append(actions);
        row.append(accountCell, roleCell, statusCell, actionsCell);
        elements.adminUserRows.append(row);
    });
    elements.adminMessage.textContent = "";
}

async function changeAccountStatus(id, status) {
    try {
        await request(`/api/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
        await Promise.all([loadAdminAccounts(), loadAdminReports()]);
        showToast(`Account ${status}.`);
    } catch (error) {
        elements.adminMessage.textContent = error.message;
    }
}

async function deleteAccount(id, username) {
    if (!window.confirm(`Delete ${username}'s account? You can no longer re-enable it.`)) return;
    try {
        await request(`/api/admin/users/${id}`, { method: "DELETE" });
        await Promise.all([loadAdminAccounts(), loadAdminReports()]);
        showToast("Account deleted.");
    } catch (error) {
        elements.adminMessage.textContent = error.message;
    }
}

async function loadAdminReports() {
    try {
        const data = await request("/api/admin/reports");
        renderAdminReports(data);
    } catch (error) {
        elements.adminMessage.textContent = error.message;
    }
}

function renderAdminReports({ summary, monthlyOrders, accountsByRole }) {
    const metrics = [
        ["Accounts", summary.totalAccounts],
        ["Active accounts", summary.activeAccounts],
        ["Active sellers", summary.activeSellers],
        ["Orders", summary.totalOrders],
        ["Order value", currency.format(Number(summary.orderValue))],
        ["Seller listings", summary.sellerListings]
    ];
    elements.adminMetrics.replaceChildren();
    metrics.forEach(([label, value]) => {
        const metric = makeElement("article", "admin-metric");
        metric.append(makeElement("span", "", label), makeElement("strong", "", String(value)));
        elements.adminMetrics.append(metric);
    });
    renderOrdersChart(monthlyOrders || []);
    renderAccountsChart(accountsByRole || []);
}

function renderOrdersChart(rows) {
    const container = document.querySelector("#orders-chart");
    container.replaceChildren();
    const monthlyCounts = new Map(rows.map((row) => [row.month, Number(row.orders)]));
    const now = new Date();
    rows = Array.from({ length: 6 }, (_, index) => {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
        const month = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
        return { month, orders: monthlyCounts.get(month) || 0 };
    });
    const values = rows.map((row) => Number(row.orders));
    const max = Math.max(1, ...values);
    const chart = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    chart.setAttribute("viewBox", "0 0 600 190");
    chart.setAttribute("role", "img");
    chart.setAttribute("aria-label", "Monthly order count for the last six months");
    const grid = document.createElementNS(chart.namespaceURI, "path");
    grid.setAttribute("d", "M42 20V150H590 M42 85H590 M42 20H590");
    grid.setAttribute("class", "chart-grid");
    chart.append(grid);
    const points = rows.map((row, index) => {
        const x = rows.length === 1 ? 316 : 48 + (index * 540) / (rows.length - 1);
        const y = 145 - (Number(row.orders) / max) * 112;
        return { x, y, row };
    });
    const line = document.createElementNS(chart.namespaceURI, "polyline");
    line.setAttribute("points", points.map(({ x, y }) => `${x},${y}`).join(" "));
    line.setAttribute("class", "chart-line");
    chart.append(line);
    points.forEach(({ x, y, row }) => {
        const dot = document.createElementNS(chart.namespaceURI, "circle");
        dot.setAttribute("cx", x);
        dot.setAttribute("cy", y);
        dot.setAttribute("r", "4");
        dot.setAttribute("class", "chart-dot");
        chart.append(dot);
        const label = document.createElementNS(chart.namespaceURI, "text");
        label.setAttribute("x", x);
        label.setAttribute("y", "174");
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("class", "chart-label");
        label.textContent = new Date(`${row.month}-01T00:00:00`).toLocaleDateString(undefined, { month: "short" });
        chart.append(label);
    });
    container.append(chart);
}

function renderAccountsChart(rows) {
    const container = document.querySelector("#accounts-chart");
    container.replaceChildren();
    const total = Math.max(1, rows.reduce((sum, row) => sum + Number(row.count), 0));
    const colors = { buyer: "#26745b", seller: "#d8874b", admin: "#536d79" };
    rows.filter((row) => row.status !== "deleted").forEach((row) => {
        const item = makeElement("div", "account-chart-row");
        const label = makeElement("div", "account-chart-label");
        label.append(makeElement("span", "", `${row.role} · ${row.status}`));
        label.append(makeElement("strong", "", String(row.count)));
        const track = makeElement("div", "account-chart-track");
        const bar = makeElement("span", "account-chart-bar");
        bar.style.width = `${(Number(row.count) / total) * 100}%`;
        bar.style.backgroundColor = colors[row.role] || colors.buyer;
        track.append(bar);
        item.append(label, track);
        container.append(item);
    });
    if (!container.childElementCount) container.append(makeElement("p", "chart-empty", "No accounts yet."));
}

async function handleAdminCreate(event) {
    event.preventDefault();
    elements.adminCreateMessage.textContent = "";
    elements.adminCreateSubmit.disabled = true;
    const payload = Object.fromEntries(new FormData(elements.adminCreateForm).entries());
    try {
        await request("/api/admin/users", { method: "POST", body: JSON.stringify(payload) });
        elements.adminCreateForm.reset();
        document.querySelector(".admin-create-account").open = false;
        await Promise.all([loadAdminAccounts(), loadAdminReports()]);
        showToast("Account created.");
    } catch (error) {
        elements.adminCreateMessage.textContent = error.message;
    } finally {
        elements.adminCreateSubmit.disabled = false;
    }
}

async function openSellerDashboard(view) {
    const showPerformance = view === "performance";
    elements.sellerPerformance.hidden = !showPerformance;
    elements.sellerListingsSection.hidden = !showPerformance;
    document.querySelector("#seller-form-title").hidden = showPerformance;
    elements.productForm.hidden = showPerformance;
    document.querySelector("#seller-title").textContent = showPerformance ? "Your shop performance" : "Add a product";
    elements.sellerDialog.showModal();
    if (showPerformance) {
        await Promise.all([loadSellerListings(), loadSellerPerformance()]);
    } else {
        elements.productForm.elements.name.focus();
    }
}

async function loadSellerListings() {
    elements.sellerListMessage.textContent = "Loading your listings...";
    elements.sellerListings.replaceChildren();
    try {
        const data = await request("/api/products/mine");
        const products = data.products || [];
        elements.sellerListMessage.textContent = products.length
            ? `${products.length} ${products.length === 1 ? "listed product" : "listed products"}`
            : "You haven’t listed any products yet.";
        products.forEach((product) => {
            const row = makeElement("article", "seller-listing");
            const copy = makeElement("div", "seller-listing-copy");
            copy.append(makeElement("strong", "", product.name));
            copy.append(makeElement("span", "", `${product.category} · ${product.stock} in stock`));
            row.append(copy, makeElement("strong", "seller-listing-price", currency.format(Number(product.price))));
            elements.sellerListings.append(row);
        });
    } catch (error) {
        elements.sellerListMessage.textContent = error.message;
    }
}

async function loadSellerPerformance() {
    try {
        const data = await request("/api/products/mine/performance");
        renderSellerPerformance(data);
    } catch (error) {
        elements.sellerMetrics.replaceChildren(makeElement("p", "chart-empty", error.message));
    }
}

function renderSellerPerformance({ summary, monthlySales }) {
    const metrics = [
        ["Gross sales", currency.format(Number(summary.grossSales))],
        ["Orders", String(summary.orders)],
        ["Units sold", String(summary.unitsSold)],
        ["Listings", String(summary.listings)],
        ["In stock", String(summary.inventory)]
    ];
    elements.sellerMetrics.replaceChildren();
    metrics.forEach(([label, value]) => {
        const metric = makeElement("article", "seller-metric");
        metric.append(makeElement("span", "", label), makeElement("strong", "", value));
        elements.sellerMetrics.append(metric);
    });
    renderSellerChart("#seller-sales-chart", monthlySales, "grossSales", "Gross sales over the last six months", true);
    renderSellerChart("#seller-units-chart", monthlySales, "unitsSold", "Units sold over the last six months", false);
}

function renderSellerChart(selector, monthlyRows, valueKey, description, isCurrency) {
    const container = document.querySelector(selector);
    container.replaceChildren();
    const monthlyValues = new Map((monthlyRows || []).map((row) => [row.month, Number(row[valueKey])]));
    const now = new Date();
    const rows = Array.from({ length: 6 }, (_, index) => {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
        const month = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
        return { month, value: monthlyValues.get(month) || 0 };
    });
    const max = Math.max(1, ...rows.map((row) => row.value));
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 600 190");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", description);
    const grid = document.createElementNS(svg.namespaceURI, "path");
    grid.setAttribute("d", "M42 20V150H590 M42 85H590 M42 20H590");
    grid.setAttribute("class", "chart-grid");
    svg.append(grid);
    const points = rows.map((row, index) => ({
        ...row,
        x: 48 + (index * 540) / (rows.length - 1),
        y: 145 - (row.value / max) * 112
    }));
    const line = document.createElementNS(svg.namespaceURI, "polyline");
    line.setAttribute("points", points.map(({ x, y }) => `${x},${y}`).join(" "));
    line.setAttribute("class", "chart-line");
    svg.append(line);
    points.forEach(({ x, y, month, value }) => {
        const dot = document.createElementNS(svg.namespaceURI, "circle");
        dot.setAttribute("cx", x);
        dot.setAttribute("cy", y);
        dot.setAttribute("r", "4");
        dot.setAttribute("class", "chart-dot");
        const title = document.createElementNS(svg.namespaceURI, "title");
        title.textContent = `${month}: ${isCurrency ? currency.format(value) : `${value} units`}`;
        dot.append(title);
        svg.append(dot);
        const label = document.createElementNS(svg.namespaceURI, "text");
        label.setAttribute("x", x);
        label.setAttribute("y", "174");
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("class", "chart-label");
        label.textContent = new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: "short" });
        svg.append(label);
    });
    container.append(svg);
}

function signOut() {
    state.user = null;
    localStorage.removeItem("goodgoods-user");
    renderAccountButton();
    elements.adminDialog.close();
    elements.sellerDialog.close();
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
        elements.productForm.reset();
        state.category = "";
        state.search = "";
        elements.searchInput.value = "";
        showToast("Your product is now on the shelf.");
        await Promise.all([loadSellerListings(), loadSellerPerformance(), loadProducts()]);
    } catch (error) {
        elements.productMessage.textContent = error.message;
    } finally {
        elements.productForm.querySelector("button[type=submit]").disabled = false;
    }
}

async function placeOrder() {
    const entries = cartEntries();
    if (!entries.length) {
        showToast("Your cart is empty for now.");
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

    elements.paymentTotal.textContent = currency.format(entries.reduce(
        (sum, entry) => sum + Number(entry.product.price) * entry.quantity, 0
    ));
    elements.paymentMessage.textContent = "";
    closeCart();
    elements.paymentDialog.showModal();
}

async function handlePaymentSubmit(event) {
    event.preventDefault();
    const entries = cartEntries();
    if (!entries.length) {
        elements.paymentDialog.close();
        showToast("Your cart is empty for now.");
        return;
    }

    elements.paymentSubmit.disabled = true;
    try {
        const data = await request("/api/products/checkout", {
            method: "POST",
            body: JSON.stringify({
                paymentMethod: elements.paymentForm.elements.paymentMethod.value,
                items: entries.map(({ product, quantity }) => ({ productId: product.id, quantity }))
            })
        });
        state.cart = {};
        saveCart();
        renderCart();
        elements.paymentDialog.close();
        showToast(`Order #${data.orderId} confirmed. Pay ${currency.format(Number(data.total))} on delivery.`);
        await loadProducts();
    } catch (error) {
        elements.paymentMessage.textContent = error.message;
    } finally {
        elements.paymentSubmit.disabled = false;
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
elements.paymentForm.addEventListener("submit", handlePaymentSubmit);
elements.accountButton.addEventListener("click", () => {
    if (!state.user) openAccount();
    else if (state.user.role === "seller") openSellerDashboard("product");
    else if (state.user.role === "admin") openAdminDashboard();
    else signOut();
});
document.querySelector("#admin-header-signout").addEventListener("click", signOut);
elements.adminCreateForm.addEventListener("submit", handleAdminCreate);
elements.sellerPerformanceButton.addEventListener("click", () => openSellerDashboard("performance"));
document.querySelector("#seller-signout").addEventListener("click", signOut);
document.querySelector("#seller-header-signout").addEventListener("click", signOut);
elements.sellerButton.addEventListener("click", () => {
    if (state.user?.role === "seller") openSellerDashboard("product");
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
    button.addEventListener("click", () => {
        const dialog = button.closest("dialog");
        dialog.close();
        if (dialog === elements.adminDialog) renderAccountButton();
    });
});
elements.adminDialog.addEventListener("cancel", () => {
    document.querySelector("#admin-header-signout").hidden = state.user?.role !== "admin";
});
document.querySelector("#year").textContent = String(new Date().getFullYear());

renderAccountButton();
renderCart();
loadProducts();