(() => {
    const pageUrl = window.location.href;
    if (!pageUrl.includes("onmuga.com/cambio/")) return;

    let playersData = null;

    function processPayload(payload) {
        const key = '"players":';
        const keyIndex = payload.indexOf(key);
        if (keyIndex === -1) return;

        const startIndex = payload.indexOf('[', keyIndex);
        let openBrackets = 1;
        let endIndex = -1;
        for (let i = startIndex + 1; i < payload.length; i++) {
            if (payload[i] === '[') openBrackets++;
            else if (payload[i] === ']') openBrackets--;
            if (openBrackets === 0) {
                endIndex = i;
                break;
            }
        }

        playersData = JSON.parse(payload.substring(startIndex, endIndex + 1));
    }

    const originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        this.addEventListener('load', () => processPayload(this.response));
        originalXhrOpen.apply(this, arguments);
    };

    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
        const ws = new originalWebSocket(url, protocols);
        ws.addEventListener('message', (event) => processPayload(event.data));
        return ws;
    };

    document.addEventListener("keydown", (e) => toggleCardReveal(e.key));
    function toggleCardReveal(key) {
        if (key !== '|' || !playersData) return;
        for (const player of playersData) {
            for (let i = 0; i < player.cards.length; i++) {
                if (player.cards[i] == null) continue;
                const playingCard = document.querySelector(`div[key='${player.userId}-${i}']`);
                playingCard.classList.toggle('card-back');

                if (playingCard.childElementCount > 0) {
                    playingCard.replaceChildren();
                    continue;
                }

                const rank = document.createElement('div');
                rank.classList.add('card-rank');
                rank.textContent = player.cards[i].rank;
                if (player.cards[i].suit === 'red') rank.classList.add('suit-red');
                playingCard.appendChild(rank);

                const score = document.createElement('div');
                score.classList.add('card-score');
                score.textContent = player.cards[i].score;
                playingCard.appendChild(score);
            }
        }
    }
})();
