const startBtn = document.getElementById("start-scan");
const video = document.getElementById("video");
const statusEl = document.getElementById("status");
const itemList = document.getElementById("item-list");

// Create a debug log element under the status area
const debugBox = document.createElement("pre");
debugBox.id = "debug-box";
debugBox.style.textAlign = "left";
debugBox.style.background = "#f1f5f9";
debugBox.style.padding = "1rem";
debugBox.style.borderRadius = "8px";
debugBox.style.fontSize = "0.8rem";
debugBox.style.maxWidth = "400px";
debugBox.style.margin = "1rem auto";
debugBox.style.whiteSpace = "pre-wrap";
document.body.appendChild(debugBox);

function log(msg) {
  console.log(msg);
  debugBox.textContent += msg + "\n";
}

let codeReader;

startBtn.addEventListener("click", async () => {
  statusEl.style.color = "black";
  statusEl.textContent = "Requesting camera permission...";
  startBtn.disabled = true;
  debugBox.textContent = ""; // clear previous logs
  log("=== Starting Scan Sequence ===");

  try {
    // 1️⃣ Check browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showError("Your browser doesn’t support camera access (getUserMedia). Try Chrome or Edge.");
      return;
    }

    // 2️⃣ Check for HTTPS or localhost
    const isSecure = location.protocol === "https:" || location.hostname === "localhost";
    if (!isSecure) {
      showError("Camera only works on HTTPS or localhost.\nTry GitHub Pages or a local server.");
      return;
    }

    // 3️⃣ Log media devices before asking permission
    const allDevices = await navigator.mediaDevices.enumerateDevices();
    log(`Found ${allDevices.length} media devices before permission:`);
    allDevices.forEach(d => log(`- ${d.kind}: ${d.label || "(no label yet)"}`));

    // 4️⃣ Explicitly request permission first
    log("Requesting permission with getUserMedia...");
    await navigator.mediaDevices.getUserMedia({ video: true });
    log("✅ Permission granted.");

    // 5️⃣ Initialize ZXing and list devices
    codeReader = new ZXing.BrowserMultiFormatReader();
    const devices = await codeReader.listVideoInputDevices();

    if (!devices || devices.length === 0) {
      showError("No camera devices found. Plug in a camera or check permissions.");
      log("❌ No devices after permission.");
      return;
    }

    log(`✅ ${devices.length} camera(s) available:`);
    devices.forEach((d, i) => log(`  [${i}] ${d.label || "(no label)"}`));

    const selectedDeviceId = devices[devices.length - 1].deviceId;
    statusEl.textContent = "Starting camera...";
    log(`Starting camera ID: ${selectedDeviceId}`);

    // 6️⃣ Start scanning
    await codeReader.decodeFromVideoDevice(selectedDeviceId, "video", (result, err) => {
      if (result) {
        const barcode = result.text;
        statusEl.textContent = `Scanned: ${barcode}`;
        log(`✅ Barcode detected: ${barcode}`);
        fetchProduct(barcode);
      }
      if (err && !(err instanceof ZXing.NotFoundException)) {
        log(`⚠️ ZXing internal error: ${err}`);
      }
    });

    statusEl.textContent = "Camera started — point it at a barcode!";
    log("🎥 Camera stream active.");

  } catch (error) {
    handleCameraError(error);
  }
});

async function fetchProduct(barcode) {
  try {
    log(`Fetching product info for: ${barcode}`);
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await res.json();

    if (data.status === 1) {
      const name = data.product.product_name || "Unnamed Product";
      addItemToList(name, barcode);
      log(`✅ Product found: ${name}`);
    } else {
      addItemToList(`Unknown product (${barcode})`, barcode);
      log(`❌ Product not found for ${barcode}`);
    }
  } catch (err) {
    console.error(err);
    addItemToList(`Error fetching (${barcode})`, barcode);
    log(`⚠️ Fetch error for ${barcode}: ${err.message}`);
  }
}

function addItemToList(name, barcode) {
  const li = document.createElement("li");
  li.textContent = `${name} — ${barcode}`;
  itemList.prepend(li);
}

// 🪲 Centralized error handler
function handleCameraError(error) {
  console.error("Camera startup error:", error);
  log(`❌ Camera startup error: ${error.name} — ${error.message}`);

  if (error.name === "NotAllowedError") {
    showError("Camera permission denied. Click the lock icon in your browser and allow camera access.");
  } else if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
    showError("No suitable camera found. Try switching to a different device or browser.");
  } else if (error.name === "NotReadableError") {
    showError("Camera is in use by another app. Close Zoom, Teams, or other camera apps.");
  } else if (error.name === "AbortError") {
    showError("Camera initialization was aborted — try reloading the page.");
  } else {
    showError(`Unexpected error: ${error.message || error}`);
  }

  startBtn.disabled = false;
}

// Helper for user-friendly status
function showError(msg) {
  statusEl.style.color = "red";
  statusEl.textContent = msg;
  log(`🚨 ${msg}`);
  startBtn.disabled = false;
}
