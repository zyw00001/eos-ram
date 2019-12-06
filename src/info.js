const {JsonRpc} = require('eosjs');
const fetch = require('node-fetch');

//const url = `http://openapi.eos.ren`;
const url = `http://eospush.tokenpocket.pro`;
//const url = `https://eos.eoscafeblock.com`;
//const url = `https://eos.newdex.one`;
const rpc = new JsonRpc(url, { fetch });

// 获取ram价格
const getRamPrice = async () => {
  try {
    const res = await rpc.get_table_rows({
      code: 'eosio',
      scope: 'eosio',
      table: 'rammarket',
      json: true,
      limit: 1,
    });
    const info = res.rows[0];
    const amount = parseFloat(info.quote.balance);
    const noAlloc = parseFloat(info.base.balance) / 1024;
    return {price: `${(amount / noAlloc).toFixed(5)} EOS/KB`};
  } catch (e) {
    return {code: e, message: e.message};
  }
};

module.exports = getRamPrice;