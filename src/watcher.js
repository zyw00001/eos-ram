
class Watcher {
  constructor() {
    this._clients = [];
  }

  add(ws, quantity) {
    const index = this.findIndex(ws);
    const client = {ws, quantity: Number(quantity)};
    if (index >= 0) {
      this._clients[index] = client;
    } else {
      this._clients.push(client);
    }
  }

  remove(ws) {
    const index = this.findIndex(ws);
    if (index >= 0) {
      this._clients.splice(index, 1);
    }
  }

  send(data) {
    if (this._clients.length) {
      const quantity = parseFloat(data.quantity);
      data = JSON.stringify(data);
      this._clients.forEach(client => {
        if (!client.quantity || (quantity >= client.quantity)) {
          client.ws.send(data);
        }
      });
    }
  }

  findIndex(ws) {
    return this._clients.findIndex(client => client.ws === ws);
  }
}

module.exports = Watcher;