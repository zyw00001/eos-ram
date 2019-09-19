const fetch = require('node-fetch');
const moment = require('moment');

const isBeijingZone = moment().utcOffset() === 480;

// 设置fetch的选项
const setOption = (body, method='POST') => {
  return {
    method,
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json;charset=UTF-8'
    },
    body: JSON.stringify(body)
  }
};

// 获取JSON数据
const fetchJson = (url, option) => {
  return new Promise(resolve => {
    if (typeof option === 'string') {
      option = {method: option};
    }

    fetch(url, option).then(res => {
      if (!res.ok) {
        res.json().then(json => {
          resolve({code: res.status, message: `${res.status} - ${json.error || res.statusText}`});
        }).catch(e => {
          resolve({code: res.status, message: `${res.status} - ${res.statusText}`});
        });
      } else {
        res.json().then(json => {
          resolve(json);
        })
      }
    }).catch(e => {
      resolve({code: 1, message: e.message});
    });
  });
};

// 设置消息的显示颜色
const getColorMessage = (message, color) => {
  const restore = '\x1B[0m';
  const colors = {
    red: '\x1B[91m',
    green: '\x1B[32m'
  };
  return `${colors[color] || ''}${message}${restore}`;
};

// 显示交易记录
const showData = ({buy, time, account, quantity}) => {
  const color = buy ? 'red' : 'green';
  if (!isBeijingZone) {
    // 如果本地时间不是北京时间，则转换成本地时间展示
    time = moment(`${time}+08:00`).format('YYYY-MM-DD HH:mm:ss');
  }
  console.log(`${time} ${account} ${getColorMessage(quantity, color)}`);
};

const showList = (list) => {
  for (const item of list) {
    showData(item);
  }
};

const logError = (message) => {
  console.log(getColorMessage(message, 'red'));
};

module.exports = {
  setOption,
  fetchJson,
  getColorMessage,
  showData,
  showList,
  logError
};