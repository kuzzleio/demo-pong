const express = require('express');
const app = express();
const WebSocket = require('uws');
const bleClient = require('./ble-remote-daemon/index.live');

const HTTP_PORT = 1234;
const WS_PORT = 8080;
const FRAME_RATE = 120;

var intervalId;
const wss = new WebSocket.Server({ port: WS_PORT });
app.use(express.static('frontend/dist'));

app.listen(HTTP_PORT, () =>
  console.log(
    `Pong app listening on port ${HTTP_PORT} (WebSocket listening on port ${WS_PORT})`
  )
);

wss.on('connection', function connection(ws) {
  console.log('Frontend connected');
  intervalId = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN || !bleClient.positions) {
      return;
    }
    ws.send(
      JSON.stringify({
        event: 'position',
        positions: bleClient.positions
      })
    );
  }, 1000 / FRAME_RATE);

  bleClient.on('deviceFound', id => {
    ws.send(
      JSON.stringify({
        event: 'playerIn',
        id: id
      })
    );
  });

  bleClient.on('deviceLost', id => {
    ws.send(
      JSON.stringify({
        event: 'playerOut',
        id: id
      })
    );
  });

  ws.on('message', data => {
    switch (data) {
      case 'getPlayers':
        if (!bleClient.positions) {
          return;
        }
        Object.keys(bleClient.positions).forEach(id => {
          ws.send(
            JSON.stringify({
              event: 'playerIn',
              id
            })
          );
        });
        break;

      default:
        console.warn(`Received unknown ${data} message`);
        break;
    }
  });

  ws.on('close', () => {
    bleClient.removeAllListeners();
    clearInterval(intervalId);
  });
});
