const moment = require('moment');
const helper = require('./node-common');

// 获取同步数据需要的utc时间
const getSyncTime = (time) => {
  if (time) {
    // 存储在文件中的时间是北京时间，将其转换成utc时间
    return moment.utc(`${time}+08:00`).format('YYYY-MM-DDTHH:mm:ss');
  } else {
    // 如果还没有任何数据，则同步前5天的数据
    return moment.utc().add(-5, 'days').format('YYYY-MM-DDTHH:mm:ss');
  }
};

const fetchRecords = async (body, apikey) => {
  const json = await helper.queryTransactions(body, apikey);
  if (json.code) {
    const error = new Error();
    error.message = json.message;
    error.code = json.code || 1;
    throw error;
  } else {
    return json;
  }
};

const excludeId = (list, id) => {
  if (id) {
    const index = list.findIndex(item => item.id === id);
    if (index > -1) {
      return list.slice(index + 1);
    } else {
      return list;
    }
  } else {
    return list;
  }
};

// 最多同步ram数据10000条
const syncData10000 = async (dataService, apikey) => {
  const body = {code: 'eosio.token', account_name: 'eosio.ram', type: 3, sort: 2, size: 100};
  const data = await dataService.getData(1);
  const id = data.length ? data[0].id : '';
  let total = 0;
  let done = true;
  let error = false;
  body.start_block_time = getSyncTime(data.length ? data[0].time : '');
  body.page = 1;

  try {
    let json = await fetchRecords(body, apikey);
    let firstList = dataService.appendData(excludeId(json.list, id));
    total += firstList.length;
    helper.showList(firstList);
    while (json.list.length === 100) {
      body.page++;
      json = await fetchRecords(body, apikey);
      helper.showList(dataService.appendData(json.list));
      total += json.list.length;
      if (total >= 9901) {
        done = false;
        break;
      }
    }
  } catch (e) {
    error = true;
    console.error(helper.getColorMessage(e.message, 'red'));
  }

  return {total, done, error};
};

const syncData = async (dataService, apikey) => {
  let total = 0;
  let error;
  let info;
  while (true) {
    info = await syncData10000(dataService, apikey);
    total += info.total;
    error = info.error;
    if (info.done) {
      break;
    }
  }
  return {total, error};
};

module.exports = syncData;