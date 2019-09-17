const moment = require('moment');
const helper = require('./node-common');

const getSyncTime = (time) => {
  if (time) {
    return moment(time).add(-8, 'hours').format('YYYY-MM-DDTHH:mm:ss');
  } else {
    // 如果还没有任何数据，则同步前5天的数据
    return moment(moment().format('YYYY-MM-DD')).add(-8 - 24 * 5, 'hours').format('YYYY-MM-DDTHH:mm:ss');
  }
};

const fetchRecords = async (body, apikey) => {
  const url = 'https://open-api.eos.blockdog.com/v2/third/get_account_transfer';
  const option = helper.setOption(body);
  option.headers.apikey = apikey;
  const json = await helper.fetchJson(url, option);
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
  const body = {account_name: 'eosio.ram', type: 3, sort: 2, size: 100};
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