let notifiedItems = new Set();

window.onload = function () {
  requestNotificationPermission();
  fetchItemsFromServer();
  applySavedTheme();
};

// ✅ Microphone input for item name
function startSpeechInput() {
  if (!("webkitSpeechRecognition" in window)) {
    alert("Speech Recognition not supported in this browser.");
    return;
  }

  const recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.start();

  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript;
    document.getElementById("itemName").value = transcript;
  };

  recognition.onerror = function (event) {
    console.error("🎤 Mic error:", event.error);
    alert("Microphone Error: " + event.error);
  };
}

// ✅ Notification permission
function requestNotificationPermission() {
  if ("Notification" in window) {
    Notification.requestPermission();
  }
}

// ✅ Add Item to MongoDB
async function addItem() {
  const name = document.getElementById("itemName").value.trim();
  const qty = parseFloat(document.getElementById("itemQty").value);
  const qtyUnit = document.getElementById("itemQtyUnit").value;
  const location = document.getElementById("itemLoc").value.trim();
  const usage = parseFloat(document.getElementById("itemUsage").value);
  const usageUnit = document.getElementById("itemUsageUnit").value;
  const expiry = document.getElementById("itemExpiry").value;

  if (!name || isNaN(qty) || !location || isNaN(usage)) {
    alert("❗ Please fill all fields correctly.");
    return;
  }

  const quantityInBase = convertToBaseUnit(qty, qtyUnit);
  const usageDays = convertUsageToDays(usage, usageUnit);

  const itemData = {
    itemName: name,
    quantity: quantityInBase,
    quantityUnit: qtyUnit,
    location,
    usageDays,
    daysLeft: usageDays,
    expiryDate: expiry || null,
  };

  try {
    const res = await fetch("/add-item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemData),
    });

    const data = await res.json();

    if (data.success) {
      fetchItemsFromServer();
      clearForm();
    } else {
      alert("❌ Failed to add item.");
    }
  } catch (err) {
    console.error("Error adding item:", err);
    alert("❌ Error: Could not add item.");
  }
}

// ✅ Fetch Items
async function fetchItemsFromServer() {
  try {
    const res = await fetch("/items");
    const items = await res.json();
    renderTable(items);
  } catch (err) {
    console.error("Error fetching items:", err);
  }
}

// ✅ Delete Item
async function deleteItem(itemId) {
  try {
    const res = await fetch(`/delete-item/${itemId}`, {
      method: "DELETE",
    });
    const result = await res.json();
    if (result.success) {
      fetchItemsFromServer();
    } else {
      alert("❌ Delete failed.");
    }
  } catch (err) {
    console.error("Delete error:", err);
  }
}

// ✅ Render Table
function renderTable(items) {
  const tbody = document.querySelector("#inventoryTable tbody");
  tbody.innerHTML = "";
  const today = new Date();

  items.forEach((item) => {
    const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
    const willExpireSoon =
      expiryDate && (expiryDate - today) / (1000 * 60 * 60 * 24) <= 10;
    const isLow = item.quantity <= convertToBaseUnit(1, item.quantityUnit);
    const isOut = item.quantity === 0;

    let status = "✅ OK";
    let alertNeeded = false;
    let statusClass = "";

    if (isOut) {
      status = "❌ Out";
      statusClass = "out";
      notifyUser(item.itemName, "out");
      alertNeeded = true;
    } else {
      if (isLow) {
        status = "⚠️ Low";
        statusClass += " low";
        notifyUser(item.itemName, "low");
        alertNeeded = true;
      }
      if (willExpireSoon) {
        const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        status += ` | ⏳ Expiring in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}`;
        statusClass += " expiring";
        notifyUser(item.itemName, "expiring");
        alertNeeded = true;
      }

    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.itemName}</td>
      <td>${formatQuantity(item.quantity, item.quantityUnit)}</td>
      <td>${item.location}</td>
      <td class="status-cell ${statusClass}">${status}</td>
      <td>${formatDaysLeft(item.daysLeft)}</td>
      <td>${expiryDate ? expiryDate.toLocaleDateString() : "-"}</td>
      <td><button onclick="deleteItem('${item._id}')"><i class="fas fa-trash-alt"></i></button></td>
    `;

    tbody.appendChild(row);

    if (alertNeeded) playAudioAlert();
  });

  if (document.getElementById("search").value.trim()) {
    searchItems();
  }
}

// ✅ Search Items
function searchItems() {
  const filter = document.getElementById("search").value.toUpperCase();
  const rows = document.querySelectorAll("#inventoryTable tbody tr");

  rows.forEach((row) => {
    const itemName = row.cells[0].textContent.toUpperCase();
    row.style.display = itemName.includes(filter) ? "" : "none";
  });
}

// ✅ Utility Functions
function formatQuantity(value, unit) {
  if (unit === "kg" || unit === "liter") return (value / 1000).toFixed(2) + " " + unit;
  return value + " " + unit;
}

function convertToBaseUnit(value, unit) {
  if (unit === "kg" || unit === "liter") return value * 1000;
  return value;
}

function convertUsageToDays(value, unit) {
  if (unit === "month") return value * 30;
  if (unit === "year") return value * 365;
  return value;
}

function formatDaysLeft(days) {
  return days >= 365
    ? `${Math.floor(days / 365)} year(s)`
    : days >= 30
      ? `${Math.floor(days / 30)} month(s)`
      : `${days} day${days !== 1 ? "s" : ""}`;
}

function notifyUser(itemName, status) {
  const key = `${itemName}-${status}`;
  if (notifiedItems.has(key)) return;
  notifiedItems.add(key);
  if (Notification.permission === "granted") {
    new Notification("HomeStock Alert", {
      body: `${itemName} is ${status.toUpperCase()}`,
    });
  }
}

function clearForm() {
  ["itemName", "itemQty", "itemLoc", "itemUsage", "itemExpiry"].forEach(
    (id) => (document.getElementById(id).value = "")
  );
  document.getElementById("itemQtyUnit").value = "piece";
  document.getElementById("itemUsageUnit").value = "day";
}

function applySavedTheme() {
  const theme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", theme);
  const selector = document.getElementById("theme");
  if (selector) selector.value = theme;
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  const selector = document.getElementById("theme");
  if (selector) selector.value = theme;
}

function playAudioAlert() {
  new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg").play();
}

function logout() {
  window.location.href = "/login";
}
