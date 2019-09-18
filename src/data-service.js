const path = require('path');
const fs = require('fs');
const moment = require('moment');

const includeFee = (quantity) => {
  const num = parseFloat(quantity) * 1000 / 995;
  return `${(Math.ceil(num * 10000) / 10000).toFixed(4)} EOS`;
};

const formatData = ({id, block_time, data: {from, to, quantity, memo}}) => {
  // 接收到的时间是utc时间，将其转换成北京时间再存储
  const obj = {id, time: moment.utc(block_time).utcOffset('+08:00').format('YYYY-MM-DD HH:mm:ss')};
  if (memo === 'buy ram') {
    obj.buy = 1;
    obj.account = from;
    obj.quantity = includeFee(quantity);
  } else {
    obj.buy = 0;
    obj.account = to;
    obj.quantity = quantity;
  }
  return obj;
};

const appendData = (target, source, quantity, count) => {
  for (let index = source.length - 1; index >=0; index--) {
    const item = source[index];
    if (parseFloat(item.quantity) >= quantity) {
      if (target.unshift(item) >= count) {
        return true;
      }
    }
  }
};

class DataService {
  constructor() {
    this._path = path.join(process.cwd(), 'transcation.data');
    this._fd = fs.openSync(this._path, 'a+');
    this._fileSize = fs.fstatSync(this._fd).size;
    this._buffer = this._read(200, 0);
    this._maxBuffer = 1000;
    this._writedCount = this._buffer.length;
    this._writing = false;
    this._writeThreshold = 100;
    this._lineCharsNum = 170;
    this._close = null;
  }

  // 保存一条或多条记录
  appendData(data) {
    if (this._fd) {
      if (Array.isArray(data)) {
        const res = [];
        if (data.length) {
          for (const item of data) {
            const obj = formatData(item);
            this._buffer.push(obj);
            res.push(obj);
          }
          this._write();
        }
        return res;
      } else {
        const obj = formatData(data);
        this._buffer.push(obj);
        this._write();
        return obj;
      }
    }
  }

  // 关闭数据服务。调用该方法后，其余方法均不能再调用。
  close() {
    return new Promise(resolve => {
      const fd = this._fd;
      const flushAndClose = () => {
        const info = this._getWriteInfo();
        if (info.count) {
          this._writedCount += info.count;
          fs.writeSync(fd, info.data);
        }
        fs.closeSync(fd);
        this._close = null;
        resolve();
      };

      if (this._fd) {
        this._fd = null;
        if (!this._writing) {
          flushAndClose();
        } else {
          this._close = flushAndClose;
        }
      } else {
        resolve();
      }
    });
  }

  // 获取最近count条记录
  getData(count) {
    return new Promise(resolve => {
      if (this._fd && count > 0) {
        const hasCount = this._buffer.length;
        if (hasCount >= count) {
          resolve(this._buffer.slice(hasCount - count));
        } else if (!this._writing) {
          resolve(this._read(count - hasCount, this._writedCount).concat(this._buffer));
        } else {
          resolve([]);
        }
      } else {
        resolve([]);
      }
    });
  }

  // 获取count条最近交易数量大于等于quantity的记录
  getDataByQuantity(count, quantity) {
    return new Promise(resolve => {
      if (this._fd && count > 0) {
        const res = [];
        if (!appendData(res, this._buffer, quantity, count)) {
          process.nextTick(() => {
            if (!this._writing) {
              let data;
              let offset = this._writedCount;
              while ((data = this._read(500, offset)).length) {
                offset += 500;
                if (appendData(res, data, quantity, count)) {
                  break;
                }
              }
            }
            resolve(res);
          });
        } else {
          resolve(res);
        }
      } else {
        resolve(null);
      }
    });
  }

  _read(lineCount, lineOffset) {
    const res = [];
    const end = this._fileSize - lineOffset * this._lineCharsNum;
    let start = this._fileSize - (lineCount + lineOffset) * this._lineCharsNum;
    if (start < 0) {
      start = 0;
    }
    if (end <= 0) {
      return res;
    } else {
      const buffer = Buffer.alloc(end - start);
      const bytesRead = fs.readSync(this._fd, buffer, 0, end - start, start);
      for (let index = 0; index < bytesRead; index += this._lineCharsNum) {
        const json = buffer.slice(index, index + this._lineCharsNum).toString();
        res.push(JSON.parse(json));
      }
      return res;
    }
  }

  _needWrite() {
    return (this._buffer.length - this._writedCount) >= this._writeThreshold;
  }

  _formatLine(data) {
    let res = JSON.stringify(data);
    let padding = this._lineCharsNum - res.length - 2;
    while (padding > 0) {
      res += ' ';
      padding--;
    }
    return res + '\r\n';
  }

  _getWriteInfo() {
    let data = '';
    for (let index = this._writedCount; index < this._buffer.length; index++) {
      data += this._formatLine(this._buffer[index]);
    }
    return {data, count: this._buffer.length - this._writedCount};
  }

  _reduceBuffer() {
    if (this._buffer.length >= this._maxBuffer) {
      const count = Math.ceil(this._maxBuffer * 2 / 5);
      if (count >= this._writedCount) {
        this._buffer = this._buffer.slice(count);
        this._writedCount -= count;
      }
    }
  }

  _write() {
    if (this._fd && !this._writing && this._needWrite()) {
      const info = this._getWriteInfo();
      this._writing = true;
      fs.write(this._fd, info.data, () => {
        this._writing = false;
        this._writedCount += info.count;
        this._fileSize += info.data.length;
        if (this._close) {
          this._close();
        } else {
          this._reduceBuffer();
          this._write();
        }
      });
    }
  }
}

module.exports = DataService;