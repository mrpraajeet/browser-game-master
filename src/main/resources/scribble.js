(async () => {
    const pageUrl = window.location.href;
    if (!pageUrl.includes("skribbl.io/")) return;

    const wordsJson = `__INJECT_JSON_HERE__`;
    let words = {};
    let prevPattern = '';
    let arrowLock = false;
    let suggestions = [];
    let pointer = -1;

    try {
        words = JSON.parse(wordsJson);
    } catch (e) {
        return;
    }

    await (new Promise(resolve => {
        if (document.readyState === "interactive" || document.readyState === "complete") resolve();
        else document.addEventListener("DOMContentLoaded", resolve, { once: true });
    }));

    const observer = new MutationObserver(() => {
        const length = document.querySelector(".word-length");
        if (!length) return;
        guessWord(length.textContent);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    function guessWord(length) {
        const newPattern = [...document.querySelectorAll(".hint")].map(hint => hint.textContent).join('');
        if (newPattern === prevPattern) return;
        prevPattern = newPattern;

        suggestions = words[length].map(w => w.toLowerCase()) || [];
        if (suggestions.length === 0) return;

        const regex = new RegExp("^" + newPattern.replace(/_/g, ".") + "$", "i");
        suggestions = suggestions.filter(s => regex.test(s));
    }

    document.addEventListener("keydown", (e) => arrowLock = (e.key === "Escape") ? !arrowLock : arrowLock);

    const input = document.querySelector("#game-chat input");
    input.addEventListener("keydown", (e) => {
        if (arrowLock) return;
        if (e.key === "ArrowDown") {
            pointer = (pointer + 1) % suggestions.length;
            input.value = suggestions[pointer] ?? "";
        } else if (e.key === "ArrowUp") {
            pointer = (pointer - 1 + suggestions.length) % suggestions.length;
            input.value = suggestions[pointer] ?? "";
        } else if (e.key === "ArrowLeft") {
            pointer = -1;
            input.value = "";
        } else if (e.key === "ArrowRight") {
            let i = suggestions.findIndex(s => s.startsWith(input.value));
            if (i === -1) i = suggestions.findIndex(s => isSubsequence(s, input.value));
            if (i !== -1) {
                pointer = i;
                input.value = suggestions[i];
            }
        }
    });

    const chat = document.querySelector(".chat-content");
    const chatObserver = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            mutation.addedNodes.forEach(node => {
                const t = node.textContent;
                if (t?.includes("draw")) {
                    prevPattern = "";
                    pointer = -1;
                } else if (t?.includes("close")) {
                    const close = t.split(" ")[0].trim().toLowerCase();
                    suggestions = suggestions.filter(s => levenshtein(s, close) === 1);
                    pointer = -1;
                } else if (t?.includes(":")) {
                    const guess = t.split(":")[1]?.trim().toLowerCase();
                    if (guess) suggestions = suggestions.filter(s => s !== guess);
                    pointer = -1;
                }
            });
        }
    });
    chatObserver.observe(chat, { childList: true });

    function levenshtein(a, b, k = 1) {
        if (a.length > b.length) [a, b] = [b, a];
        const m = a.length;
        const n = b.length;
        if (n - m > k) return -1;
        if (m === 0) return n;

        const rows = [new Uint16Array(m + 1), new Uint16Array(m + 1)];
        for (let j = 0; j <= m; j++) rows[0][j] = j;

        let flip = 0;
        for (let i = 0; i < n; i++) {
            flip ^= 1;
            const curr = rows[flip];
            const prev = rows[flip ^ 1];

            curr[0] = i + 1;
            const stripeStart = Math.max(1, i + 1 - k);
            const stripeEnd = Math.min(m, i + 1 + k);
            let rowMin = k + 1;

            for (let j = stripeStart; j <= stripeEnd; j++) {
                const cost = a[j - 1] !== b[i] ? 1 : 0;
                curr[j] = Math.min(
                    prev[j] + 1,       // Deletion
                    curr[j - 1] + 1,   // Insertion
                    prev[j - 1] + cost // Substitution
                );
                if (curr[j] < rowMin) rowMin = curr[j];
            }
            if (rowMin > k) return -1;
        }
        return rows[flip][m];
    }

    function isSubsequence(str, sub) {
        let i = 0, j = 0;
        while (i < str.length && j < sub.length) {
            if (str[i] === sub[j]) j++;
            i++;
        }
        return j === sub.length;
    }
})();
