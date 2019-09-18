const WebSocket = require('ws');
const helper = require('./node-common');

const ip = 'localhost';
const port = 8080;
const host = `http://${ip}:${port}`;

const showRecords = (count=10, quantity=0) => {
  const url = `${host}/api/records?count=${count}&quantity=${quantity}`;
  helper.fetchJson(url).then(data => {
    if (data.code) {
      console.log(data.message);
    } else {
      for (const item of data) {
        helper.showData(item);
      }
    }
  });
};

const startWatch = (ws, quantity=0) => {
  ws.send(JSON.stringify({type: 'watch', quantity}));
};

// 启动WebSocket客户端，用于接收RAM交易记录
const startWebSocket = (quantity) => {
  const ws = new WebSocket(`ws://${ip}:${port}`);

  ws.on('open', () => {
    startWatch(ws, quantity);
  });

  ws.on('message', (data) => {
    helper.showData(JSON.parse(data));
  });

  ws.on('error', (e) => {
    console.error(e);
  });

  ws.on('close', () => {
    console.log('close');
    global.ws = null;
  });

  global.ws = ws;
};

process.stdin.on('data', data => {
  const arr = data.toString().trim().split(' ');
  if (arr[0] === 'show') {
    showRecords(arr[1], arr[2]);
  } else if (arr[0] === 'watch') {
    if (!global.ws) {
      startWebSocket(arr[1]);
    } else {
      startWatch(global.ws, arr[1]);
    }
  } else if (arr[0] === 'exit') {
    process.exit(0);
  }
});