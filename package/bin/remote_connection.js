// Generated by CoffeeScript 1.4.0
(function() {
  "use strict";
  var RemoteConnection, exports,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  var exports = window;

  /*
   * Handles sending and receiving data from connected devices running different
   * instances of CIRC.
  */


  RemoteConnection = (function(_super) {

    __extends(RemoteConnection, _super);

    function RemoteConnection() {
      this._onDeviceClosed = __bind(this._onDeviceClosed, this);

      this._onConnectionMessage = __bind(this._onConnectionMessage, this);

      this._onSocketData = __bind(this._onSocketData, this);

      this._onUserInput = __bind(this._onUserInput, this);

      this._authenticateDevice = __bind(this._authenticateDevice, this);

      this._addUnauthenticatedDevice = __bind(this._addUnauthenticatedDevice, this);

      this._onHasOwnDevice = __bind(this._onHasOwnDevice, this);

      this._getAuthToken = __bind(this._getAuthToken, this);
      RemoteConnection.__super__.constructor.apply(this, arguments);
      this.serverDevice = void 0;
      this._connectingTo = void 0;
      this._type = void 0;
      this.devices = [];
      this._ircSocketMap = {};
      this._thisDevice = {};
      this._state = 'device_state';
      this._getIRCState = function() {};
      this._getChatLog = function() {};
    }

    /*
       * Begin finding own IP addr and then listen for incoming connections.
    */


    RemoteConnection.prototype.init = function() {
      return RemoteDevice.getOwnDevice(this._onHasOwnDevice);
    };

    RemoteConnection.prototype.setPassword = function(password) {
      return this._password = password;
    };

    RemoteConnection.prototype._getAuthToken = function(value) {
      return hex_md5(this._password + value);
    };

    RemoteConnection.prototype.getConnectionInfo = function() {
      return this._thisDevice;
    };

    RemoteConnection.prototype.getState = function() {
      if (this._state === 'device_state') {
        if (!this._thisDevice.port) {
          return 'finding_port';
        }
        return this._thisDevice.getState();
      } else {
        return this._state;
      }
    };

    RemoteConnection.prototype.setIRCStateFetcher = function(getState) {
      return this._getIRCState = getState;
    };

    RemoteConnection.prototype.setChatLogFetcher = function(getChatLog) {
      return this._getChatLog = getChatLog;
    };

    RemoteConnection.prototype._onHasOwnDevice = function(device) {
      var _this = this;
      this._thisDevice = device;
      if (this._thisDevice.getState() === 'no_addr') {
        this._log('w', "Wasn't able to find address of own device");
        this.emit('no_addr');
        this._thisDevice.searchForAddress(function() {
          return _this._onHasOwnDevice(_this._thisDevice);
        });
        return;
      }
      this.emit('found_addr');
      return this._thisDevice.listenForNewDevices(this._addUnauthenticatedDevice);
    };

    RemoteConnection.prototype._addUnauthenticatedDevice = function(device) {
      this._log('adding unauthenticated device', device.id);
      device.password = irc.util.randomName();
      device.send('authentication_offer', [device.password]);
      return device.on('authenticate', this._authenticateDevice);
    };

    RemoteConnection.prototype._authenticateDevice = function(device, authToken) {
      if (authToken === this._getAuthToken(device.password)) {
        return this._addClientDevice(device);
      } else {
        this._log('w', 'AUTH FAILED', authToken, 'should be', this._getAuthToken(device.password));
        return device.close();
      }
    };

    RemoteConnection.prototype._addClientDevice = function(device) {
      this._log('auth passed, adding client device', device.id, device.addr);
      this._listenToDevice(device);
      this._addDevice(device);
      this.emit('client_joined', device);
      device.send('connection_message', ['irc_state', this._getIRCState()]);
      return device.send('connection_message', ['chat_log', this._getChatLog()]);
    };

    RemoteConnection.prototype._addDevice = function(newDevice) {
      var device, _i, _len, _ref;
      _ref = this.devices;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        device = _ref[_i];
        if (device.addr === newDevice.addr) {
          device.close();
        }
      }
      return this.devices.push(newDevice);
    };

    RemoteConnection.prototype._listenToDevice = function(device) {
      var _this = this;
      device.on('user_input', this._onUserInput);
      device.on('socket_data', this._onSocketData);
      device.on('connection_message', this._onConnectionMessage);
      device.on('closed', this._onDeviceClosed);
      return device.on('no_port', function() {
        return _this.emit('no_port');
      });
    };

    RemoteConnection.prototype._onUserInput = function(device, event) {
      if (this.isServer()) {
        this._broadcast(device, 'user_input', event);
      }
      return this.emit(event.type, Event.wrap(event));
    };

    RemoteConnection.prototype._onSocketData = function(device, server, type, data) {
      var _ref;
      if (type === 'data') {
        data = irc.util.arrayToArrayBuffer(data);
      }
      return (_ref = this._ircSocketMap[server]) != null ? _ref.emit(type, data) : void 0;
    };

    RemoteConnection.prototype._onConnectionMessage = function() {
      var args, device, isValid, type;
      device = arguments[0], type = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      if (type === 'irc_state') {
        isValid = this._onIRCState(device, args);
        if (!isValid) {
          return;
        }
      }
      return this.emit.apply(this, [type].concat(__slice.call(args)));
    };

    RemoteConnection.prototype._onIRCState = function(device, args) {
      if (this.getState() !== 'connecting') {
        this._log('w', "got IRC state, but we're not connecting to a server -", device.toString(), args);
        device.close();
        return false;
      }
      this._setServerDevice(device);
      this._becomeClient();
      return true;
    };

    RemoteConnection.prototype._setServerDevice = function(device) {
      var _ref;
      if ((_ref = this.serverDevice) != null) {
        _ref.close();
      }
      return this.serverDevice = device;
    };

    RemoteConnection.prototype._onDeviceClosed = function(closedDevice) {
      var device, i, _i, _len, _ref, _results;
      if (this._deviceIsClient(closedDevice)) {
        this.emit('client_parted', closedDevice);
      }
      if (this._deviceIsServer(closedDevice) && this.getState() === 'connected') {
        this._log('w', 'lost connection to server -', closedDevice.addr);
        this._state = 'device_state';
        this._type = void 0;
        this.emit('server_disconnected');
      } else if (closedDevice.equals(this._connectingTo) && this.getState() !== 'connected') {
        this.emit('invalid_server');
      }
      _ref = this.devices;
      _results = [];
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        device = _ref[i];
        if (device.id === closedDevice.id) {
          this.devices.splice(i, 1);
        }
        break;
      }
      return _results;
    };

    RemoteConnection.prototype._deviceIsServer = function(device) {
      return device != null ? device.equals(this.serverDevice) : void 0;
    };

    RemoteConnection.prototype._deviceIsClient = function(device) {
      var clientDevice, _i, _len, _ref;
      if (device.equals(this.serverDevice || device.equals(this._thisDevice))) {
        return false;
      }
      _ref = this.devices;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        clientDevice = _ref[_i];
        if (device.equals(clientDevice)) {
          return true;
        }
      }
      return false;
    };

    /*
       * Create a socket for the given server. A fake socket is used when using
       * another devices IRC connection.
       * @param {string} server The name of the IRC server that the socket is
       *     connected to.
    */


    RemoteConnection.prototype.createSocket = function(server) {
      var socket;
      if (this.isClient()) {
        socket = new net.RemoteSocket;
        this._ircSocketMap[server] = socket;
      } else {
        socket = new net.ChromeSocket;
        this.broadcastSocketData(socket, server);
      }
      return socket;
    };

    RemoteConnection.prototype.broadcastUserInput = function(userInput) {
      var _this = this;
      return userInput.on('command', function(event) {
        var _ref;
        if ((_ref = event.name) !== 'network-info' && _ref !== 'join-server' && _ref !== 'make-server' && _ref !== 'about') {
          return _this._broadcast('user_input', event);
        }
      });
    };

    RemoteConnection.prototype.broadcastSocketData = function(socket, server) {
      var _this = this;
      return socket.onAny(function(type, data) {
        if (type === 'data') {
          data = new Uint8Array(data);
        }
        return _this._broadcast('socket_data', server, type, data);
      });
    };

    RemoteConnection.prototype._broadcast = function() {
      var args, blacklistedDevice, device, opt_blacklistedDevice, type, _i, _len, _ref, _results;
      opt_blacklistedDevice = arguments[0], type = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      if (typeof opt_blacklistedDevice === "string") {
        args = [type].concat(args);
        type = opt_blacklistedDevice;
        blacklistedDevice = void 0;
      } else {
        blacklistedDevice = opt_blacklistedDevice;
      }
      _ref = this.devices;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        device = _ref[_i];
        if (!device.equals(blacklistedDevice)) {
          _results.push(device.send(type, args));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    RemoteConnection.prototype.disconnectDevices = function() {
      var device, _i, _len, _ref;
      _ref = this.devices;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        device = _ref[_i];
        device.close();
      }
      return this.becomeIdle();
    };

    RemoteConnection.prototype.waitForPort = function(callback) {
      var _ref, _ref1,
        _this = this;
      if (this.getState() === 'found_port') {
        return callback(true);
      }
      if (this.getState() === 'no_port' || this.getState() === 'no_addr') {
        return callback(false);
      }
      if ((_ref = this._thisDevice) != null) {
        _ref.once('found_port', function() {
          return callback(true);
        });
      }
      if ((_ref1 = this._thisDevice) != null) {
        _ref1.once('no_port', function() {
          return callback(false);
        });
      }
      return this.once('no_addr', function() {
        return callback(false);
      });
    };

    RemoteConnection.prototype.becomeServer = function() {
      if (this.isClient()) {
        this.disconnectDevices();
      }
      this._type = 'server';
      return this._state = 'device_state';
    };

    RemoteConnection.prototype.becomeIdle = function() {
      this._type = 'idle';
      return this._state = 'device_state';
    };

    RemoteConnection.prototype._becomeClient = function() {
      this._log('this device is now a client of', this.serverDevice.toString());
      this._type = 'client';
      this._state = 'connected';
      return this._addDevice(this.serverDevice);
    };

    RemoteConnection.prototype.disconnectFromServer = function() {
      var _ref;
      return (_ref = this.serverDevice) != null ? _ref.close() : void 0;
    };

    /*
       * Connect to a remote server. The IRC connection of the remote server will
       * replace the local connection.
       * @params {{port: number, addr: string}} connectInfo
    */


    RemoteConnection.prototype.connectToServer = function(connectInfo) {
      var device, deviceToClose,
        _this = this;
      if (this._connectingTo) {
        deviceToClose = this._connectingTo;
        this._connectingTo = void 0;
        deviceToClose.close();
      }
      this._state = 'connecting';
      device = new RemoteDevice(connectInfo.addr, connectInfo.port);
      this._connectingTo = device;
      this._listenToDevice(device);
      return device.connect(function(success) {
        if (success) {
          return _this._onConnectedToServer(device);
        } else {
          return _this._onFailedToConnectToServer(device);
        }
      });
    };

    RemoteConnection.prototype._onConnectedToServer = function(device) {
      var _this = this;
      this._log('connected to server', device.toString());
      return device.on('authentication_offer', function(device, password) {
        device.password = password;
        return _this.emit('server_found', device);
      });
    };

    RemoteConnection.prototype._onFailedToConnectToServer = function(device) {
      this._state = 'device_state';
      return this.emit('invalid_server', device);
    };

    RemoteConnection.prototype.finalizeConnection = function() {
      if (!this._connectingTo) {
        return;
      }
      this._state = 'connecting';
      return this._connectingTo.send('authenticate', [this._getAuthToken(this._connectingTo.password)]);
    };

    RemoteConnection.prototype.isServer = function() {
      return this._type === 'server';
    };

    RemoteConnection.prototype.isClient = function() {
      return this._type === 'client';
    };

    RemoteConnection.prototype.isIdle = function() {
      return this._type === 'idle';
    };

    RemoteConnection.prototype.isInitializing = function() {
      return this._type === void 0;
    };

    return RemoteConnection;

  })(EventEmitter);

  exports.RemoteConnection = RemoteConnection;

}).call(this);
