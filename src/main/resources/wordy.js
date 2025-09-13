(() => {
    const pageUrl = window.location.href;
    if (!pageUrl.includes('codenames.game/room/') || pageUrl.includes('codenames.game/room/create')) return;

    const COVER_CARD_PATTERN = /coverCard\/([^\/]+?)\/(\d{1,2})/g;
    let lastPayloadString = '';
    let lastUrl = null;

    function sendData(data) {
        fetch(`http://127.0.0.1:14321/atr?v=2&id=6fe874ejfeoureph83374h`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data),
            mode: 'no-cors'
        }).then(_ => {}).catch(_ => {});
     }

    function processPayload(payload) {
        const colorToId = {'gray': 0, 'red': 1, 'blue': 2, 'black': 3};
        const payloadArr = new Array(25).fill(0);

        let match;
        COVER_CARD_PATTERN.lastIndex = 0;
        while ((match = COVER_CARD_PATTERN.exec(payload)) !== null) {
            payloadArr[parseInt(match[2], 10)] = colorToId[match[1]];
        }

        if (payloadArr.length > 0) {
            const payloadString = payloadArr.join(',');
            if (!lastUrl || lastUrl !== pageUrl) {
                lastPayloadString = '';
                lastUrl = pageUrl;
            }
            if (payloadString !== lastPayloadString) {
                sendData(payloadArr);
                lastPayloadString = payloadString;
            }
        }
    }

    const originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        this.addEventListener('load', () => {
            if (this.response && typeof this.response === 'string' && this.response.includes('"animTokens"')) {
                processPayload(this.response);
            }
        });
        originalXhrOpen.apply(this, arguments);
    };

    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
        const ws = new originalWebSocket(url, protocols);
        ws.addEventListener('message', (event) => {
            if (event.data && typeof event.data === 'string' && event.data.length > 9000) {
                processPayload(event.data);
            }
        });
        return ws;
    };
})();
