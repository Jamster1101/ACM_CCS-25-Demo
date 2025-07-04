document.addEventListener('DOMContentLoaded', function () {
  const safeBox = document.getElementById('SafePopup');
  const unsafeBox = document.getElementById('UnsafePopup');
  const manageBox = document.getElementById('AddRemovePopup');
  const manageBtn = document.getElementById('openAddRemove');

  const netNameEl = document.getElementById("current-network");
  const statusEl = document.getElementById("current-status");

  function toggleState(safe) {
      if (safeBox && unsafeBox) {
          safeBox.style.display = safe ? 'flex' : 'none';
          unsafeBox.style.display = safe ? 'none' : 'flex';
      }
  }

  function showStatus(name, safe) {
      if (!netNameEl || !statusEl) return;
      netNameEl.textContent = name || "Unknown";
      statusEl.textContent = safe ? "SAFE" : "UNSAFE";
      statusEl.style.color = safe ? "green" : "red";
  }

  if (manageBtn) {
      manageBtn.onclick = () => {
          safeBox.style.display = 'none';
          manageBox.style.display = 'block';
          fillDropdown();
      };
  }

  chrome.storage.local.get(['networkName', 'isSafe'], ({ networkName, isSafe }) => {
      showStatus(networkName, isSafe);
      toggleState(isSafe);
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;

      const newName = changes.networkName?.newValue;
      const newStatus = changes.isSafe?.newValue;

      if (typeof newStatus !== "undefined") toggleState(newStatus);

      if (newName || typeof newStatus !== "undefined") {
          chrome.storage.local.get(['networkName', 'isSafe'], ({ networkName, isSafe }) => {
              showStatus(networkName, isSafe);
          });
      }
  });

  const addBtn = document.getElementById("addNetworkBtn");
  const removeBtn = document.getElementById("removeNetworkBtn");
  const dropdown = document.getElementById("networkSelect");
  const renameBtn = document.getElementById("renameButton");
  const copyBtn = document.getElementById("copyNetwork");

  function fillDropdown() {
      dropdown.innerHTML = '<option value="">Choose Network</option>';
      chrome.storage.local.get(['safeMACMap'], ({ safeMACMap }) => {
          for (let [hash, name] of Object.entries(safeMACMap || {})) {
              const opt = document.createElement("option");
              opt.value = hash;
              opt.textContent = name;
              dropdown.appendChild(opt);
          }
      });
  }

  addBtn.onclick = () => {
      const hash = document.getElementById("networkHash").value.trim();
      const name = document.getElementById("networkName").value.trim();

      if (hash.length !== 64) return alert("Hash must be 64 chars.");
      if (!name) return alert("Name can't be empty.");

      chrome.storage.local.get(['safeMACMap'], ({ safeMACMap = {} }) => {
          safeMACMap[hash] = name;
          chrome.storage.local.set({ safeMACMap }, () => {
              fillDropdown();
              document.getElementById("networkHash").value = "";
              document.getElementById("networkName").value = "";
              manageBox.style.display = 'none';
              safeBox.style.display = 'flex';
              alert(`Added "${name}"`);
          });
      });
  };

  removeBtn.onclick = () => {
      const val = dropdown.value;
      if (!val) return alert("Pick a network to remove.");

      chrome.storage.local.get(['safeMACMap', 'savedMAC'], ({ safeMACMap = {}, savedMAC }) => {
          if (val === savedMAC) return alert("Can't delete current network.");

          const name = safeMACMap[val];
          delete safeMACMap[val];
          chrome.storage.local.set({ safeMACMap }, () => {
              fillDropdown();
              manageBox.style.display = 'none';
              safeBox.style.display = 'flex';
              alert(`Removed "${name}"`);
          });
      });
  };

  renameBtn.onclick = () => {
      chrome.storage.local.get(['savedMAC', 'safeMACMap'], ({ savedMAC, safeMACMap = {} }) => {
          if (!savedMAC || !safeMACMap[savedMAC]) return alert("No matching saved network.");
          const current = safeMACMap[savedMAC];
          const renamed = prompt(`Rename "${current}" to:`);
          if (!renamed) return alert("Name can't be empty.");
          safeMACMap[savedMAC] = renamed;
          chrome.storage.local.set({ safeMACMap, networkName: renamed }, () => {
              if (netNameEl) netNameEl.textContent = renamed;
              alert(`Renamed to "${renamed}"`);
          });
      });
  };

  copyBtn.onclick = () => {
      chrome.storage.local.get(['savedMAC'], ({ savedMAC }) => {
          if (!savedMAC) return alert("No MAC to copy.");
          navigator.clipboard.writeText(savedMAC).then(() => {
              alert(`Copied: ${savedMAC}`);
          }).catch(() => {
              alert("Failed to copy.");
          });
      });
  };

  // Add default if map is empty
  chrome.storage.local.get(['safeMACMap', 'savedMAC'], ({ safeMACMap = {}, savedMAC }) => {
      if (!Object.keys(safeMACMap).length && savedMAC) {
          safeMACMap[savedMAC] = "Unnamed Network";
          chrome.storage.local.set({
              safeMACMap,
              networkName: "Unnamed Network",
              isSafe: true
          }, () => {
              if (netNameEl) netNameEl.textContent = "Unnamed Network";
              if (statusEl) {
                  statusEl.textContent = "SAFE";
                  statusEl.style.color = "green";
              }
              alert("Default network added.");
          });
      }
  });
});
