macSafety = false;

function checkIsSafe() {
    chrome.storage.local.get("isSafe", ({ isSafe }) => {
        console.log("Safe status:", isSafe);
        macSafety = isSafe;
    });
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.isSafe) {
        console.log("isSafe changed:", changes.isSafe.newValue);
        checkIsSafe();
    }
});

function checkPasswordFields() {
    const fields = document.querySelectorAll('input[type="password"]');
    const results = [];

    fields.forEach(field => {
        if (!field.dataset.tracked) {
            field.dataset.tracked = "true";
            field.dataset.keystrokeCount = "0";
            field.dataset.previousValue = "";
            field.dataset.programmaticallyFilled = "false";

            field.addEventListener("keydown", () => {
                setTimeout(() => {
                    const prev = field.dataset.previousValue || "";
                    const current = field.value.trim();
                    const diff = current.length - prev.length;

                    if (!current) {
                        field.dataset.keystrokeCount = "0";
                        field.dataset.programmaticallyFilled = "false";
                    } else {
                        const count = parseInt(field.dataset.keystrokeCount, 10);
                        field.dataset.keystrokeCount = (count + 1).toString();
                        if (diff >= 3 && count === 0) {
                            field.dataset.programmaticallyFilled = "true";
                        } else if (diff < 3) {
                            field.dataset.programmaticallyFilled = "false";
                        }
                    }

                    field.dataset.previousValue = current;
                    sendPasswordData();
                }, 0);
            });

            new MutationObserver(() => {
                if (field.value.trim() && parseInt(field.dataset.keystrokeCount) === 0) {
                    field.dataset.programmaticallyFilled = "true";
                    sendPasswordData();
                }
            }).observe(field, { attributes: true, attributeFilter: ["value"] });

            const autofillCheck = setInterval(() => {
                if (field.matches(":-webkit-autofill")) {
                    field.dataset.keystrokeCount = "0";
                    field.dataset.programmaticallyFilled = "true";
                    sendPasswordData();
                    clearInterval(autofillCheck);
                }
            }, 500);
        }

        results.push({
            isFilled: !!field.value.trim(),
            keystrokeCount: parseInt(field.dataset.keystrokeCount, 10),
            isProgrammatic: field.dataset.programmaticallyFilled === "true"
        });
    });

    return {
        found: fields.length > 0,
        count: fields.length,
        filledCount: results.filter(r => r.isFilled).length,
        programmaticCount: results.filter(r => r.isProgrammatic).length,
        details: results
    };
}

function sendPasswordData() {
    const data = checkPasswordFields();
    if (data.found) {
        chrome.runtime.sendMessage({ action: "passwordDetected", data });
    }
}



window.addEventListener("load", () => {
    console.log("Content script initialized");
    checkPasswordFields();
    sendPasswordData();
    checkIsSafe();

    const shouldBlock = () => {
        return Array.from(document.querySelectorAll('input[type="password"]'))
            .some(f => f.dataset.programmaticallyFilled === "true");
    };

    document.addEventListener("submit", (e) => {
        if (shouldBlock() && !macSafety) {
            e.preventDefault();
            alert("Login blocked: password was filled programmatically on an unsafe network.");
        }
    }, true);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && shouldBlock() && !macSafety) {
            e.preventDefault();
            alert("Login blocked: password was filled programmatically on an unsafe network.");
        }
    });

    document.addEventListener("click", (e) => {
        if (e.target && e.target.type === "submit" && shouldBlock() && !macSafety) {
            e.preventDefault();
            alert("Login blocked: password was filled programmatically on an unsafe network.");
        }
    });
});
