const port = chrome.runtime.connectNative("com.nbac.password.manager");
const CHECK_INTERVAL = 2000;

let lastKnownMAC = null;
let wasOnline = false;

// Used to track previously validated networks
const trustedMACs = {};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ isSafe: true }, () => {
    console.log("Initial safety status set to true");
  });
});

function updateSafetyStatus(isSafe) {
  chrome.storage.local.set({ isSafe });
}

function hashMAC(mac) {
  const formatted = mac.toLowerCase().replace(/-/g, ":");
  const encoder = new TextEncoder();
  const data = encoder.encode(formatted);
  return crypto.subtle.digest("SHA-256", data).then(hashBuffer => {
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
  });
}

function getMAC() {
  if (!navigator.onLine) {
    console.warn("Offline - skipping MAC check.");
    return;
  }

  if (!port) {
    console.error("Native messaging port not available.");
    return;
  }

  port.postMessage("ping");
}

port.onMessage.addListener(async (mac) => {
  if (!mac) {
    console.warn("No MAC received");
    handleMAC("null");
    return;
  }

  const macHash = await hashMAC(mac);
  handleMAC(macHash);
});

function handleMAC(macHash) {
  chrome.storage.local.get(["safeMACMap"], (data) => {
    const knownNetworks = data.safeMACMap || {};
    const networkName = knownNetworks[macHash] || null;
    const isSafe = !!networkName;

    updateSafetyStatus(isSafe);

    if (macHash !== lastKnownMAC) {
      lastKnownMAC = macHash;

      chrome.storage.local.set({ savedMAC: macHash, isSafe });
      chrome.storage.local.set({ networkName });

      chrome.notifications.create({
        type: "basic",
        iconUrl: "images/NBAC_PMM.png",
        title: "Network Changed",
        message: isSafe
          ? `Connected to ${networkName}\nStatus: SAFE`
          : `Unknown Network Detected\nStatus: NOT SAFE`
      });

      chrome.storage.local.get(null, (items) => {
        console.log("Updated storage snapshot:", items);
      });
    }
  });
}

async function checkConnection() {
  try {
    const res = await fetch("https://clients3.google.com/generate_204", {
      method: "HEAD",
      mode: "cors"
    });

    if (res.status === 204) {
      getMAC();
      wasOnline = true;
    } else {
      console.log("Unexpected fetch status – assuming offline");
    }
  } catch (err) {
    console.log("Error reaching internet:", err.message);
    updateSafetyStatus(false);

    if (wasOnline) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "images/NBAC_PMM.png",
        title: "Connection Lost",
        message: "You're offline – can't verify MAC address."
      });
      wasOnline = false;
    }
  }
}

setInterval(checkConnection, CHECK_INTERVAL);

// Auto-inject content script on page load
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    if (tab.url.startsWith("http://") || tab.url.startsWith("https://")) {
      chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"]
      }).then(() => {
        console.log(`Injected content.js into tab ${tabId}`);
      }).catch(err => {
        console.warn(`Script injection failed on tab ${tabId}:`, err.message);
      });
    } else {
      console.warn("Skipped injection on non-HTTP tab:", tab.url);
    }
  }
});

// Listen for password field reports
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "passwordDetected") {
    console.log("Password tracking update:", msg.data);
  }

  if (msg.type === "alert" && msg.message) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "images/NBAC_PMM.png",
      title: "Password Manager",
      message: msg.message
    });
  }
});
