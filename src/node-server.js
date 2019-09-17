const WebSocket = require('ws');
const express = require('express');
const config = require('./config');
const DataService = require('./data-service');
const helper = require('./node-common');
const syncData = require('./syncData');

if (!config.apikey) {
  console.log('请在config.js设置apikey');
  console.log('如果没有apikey, 请到https://www.blockdog.com/form申请');
  process.exit(0);
}

const dataService = new DataService();
let wsClients = [];

const closeDsAndExit = () => {
  dataService.close().then(() => {
    process.exit(0);
  });
};

// 监控是否按下了Ctrl+C键
process.on('SIGINT', () => {
  closeDsAndExit();
});

//
const dispatchMessage = (data) => {
  if (wsClients.length) {
    for (const ws of wsClients) {
      ws.send(JSON.stringify(data));
    }
  }
};

// 启动WebSocket客户端，用于接收RAM交易记录
const startWebSocketClient = (callback) => {
  const API_KEY = config.apikey;
  const ACCOUNT = 'eosio.ram';
  const ws = new WebSocket(`wss://open-api.eos.blockdog.com/v1/ws?apikey=${API_KEY}`);
  let success = false;

  const subscribe = () => {
    const data = {
      type: 'sub_action_traces',
      data: {
        filters: [{
          account: 'eosio.token',
          name: 'transfer',
          to: ACCOUNT
        }, {
          account: 'eosio.token',
          name: 'transfer',
          from: ACCOUNT
        }]
      }
    };
    ws.send(JSON.stringify(data));
  };

  ws.on('open', () => {
    success = true;
    subscribe();
  });

  ws.on('message', (data) => {
    data = JSON.parse(data);
    if (data.type === 'error') {
      console.error(data);
    } else if (data.type === 'sub_action_traces') {
      const obj = dataService.appendData(data.data);
      helper.showData(obj);
      dispatchMessage(obj);
    }
  });

  ws.on('error', (e) => {
    console.error(e);
  });

  ws.on('close', () => {
    console.log('close');
    if (callback) {
      callback(success);
    }
  });
};

// 用于重启WebSocket客户端
const restartCallback = (canRestart) => {
  if (canRestart) {
    process.nextTick(() => {
      startWebSocketClient(restartCallback);
    });
  } else {
    closeDsAndExit();
  }
};

// 启动WebSocket服务器
const startWebSocketServer = (server) => {
  const wss = new WebSocket.Server({server});
  wss.on('connection', (ws) => {
    wsClients.push(ws);
    ws.on('close', () => {
      wsClients = wsClients.filter(wsClient => wsClient !== ws);
    });
  });
};

// 启动http服务器
const startHttpServer = () => {
  const app = express();
  const port = 8080;

  app.get('/api/records', (req, res) => {
    const count = Number(req.query.count) || 10;
    const quantity = Number(req.query.quantity) || 0;
    if (quantity > 0) {
      dataService.getDataByQuantity(count, quantity).then(data => {
        res.send(data);
      });
    } else {
      dataService.getData(count).then(data => {
        res.send(data);
      });
    }
  });

  app.get('*', (req, res) => {
    res.send('404 Not Found');
  });

  return app.listen(port, () => {
    console.log(`The server is running at http://localhost:${port}/`);
  });
};

startWebSocketServer(startHttpServer());
syncData(dataService, config.apikey).then(({error, total}) => {
  console.log('本次同步数据条数:', total);
  if (error) {
    closeDsAndExit();
  } else {
    startWebSocketClient(restartCallback);
  }
});

