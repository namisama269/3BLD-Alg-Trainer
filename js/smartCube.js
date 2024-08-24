function toUuid128(uuid) {
    if (/^[0-9A-Fa-f]{4}$/.exec(uuid)) {
        uuid = "0000" + uuid + "-0000-1000-8000-00805F9B34FB";
    }
    return uuid.toUpperCase();
}

function matchUUID(uuid1, uuid2) {
    return toUuid128(uuid1) == toUuid128(uuid2);
}

const QIYI_SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
const MOYUV10_SERVICE_UUID = '0783b03e-7735-b5a0-1760-a305d2795cb0';

// get a supported smart cube device
async function connect(applyMoves) {
    device = await navigator.bluetooth.requestDevice(
        {
            filters: [
                { namePrefix: "QY-QYSC"}, 
                { namePrefix: 'WCU_MY32' },
            ],
            optionalServices: [
                QIYI_SERVICE_UUID,
                MOYUV10_SERVICE_UUID,
            ],
        }
    );

    if (device.name.startsWith("QY-QYSC")) {
        return new QiyiCubeConnection(device, applyMoves);
    }

    if (device.name.startsWith("WCU_MY32")) {
        return new MoyuV10CubeConnection(device, applyMoves);
    }

    return null;
}

class SmartCubeConnection {
    constructor(device, applyMoves) {
        if (this.constructor === SmartCubeConnection) {
            throw new Error("Cannot instantiate abstract class.");
        }

        this.device = device;
        this.deviceName = "";
        this.mac = "";
        this.chrctCube = null;
        this.applyMoves = applyMoves;   
    }

    // call this after the instance is initiated
    initAsync() {
        throw new Error("Method 'initAsync()' must be implemented.");
    }

    async disconnect() {
        this.chrctCube.removeEventListener('characteristicvaluechanged', this.onCubeEvent);
        this.chrctCube.stopNotifications();
        this.device.gatt.disconnect();
    }

    onCubeEvent(event) {
        throw new Error("Method 'onCubeEvent(event)' must be implemented.");
    }
}


class MoyuV10CubeConnection extends SmartCubeConnection {
    constructor(device, applyMove) {
        super(device, applyMove);
        
        this.serviceUuid = '0783b03e-7735-b5a0-1760-a305d2795cb0';
        this.chrctUuidRead = '0783b03e-7735-b5a0-1760-a305d2795cb1';
        this.chrctUuidWrite = '0783b03e-7735-b5a0-1760-a305d2795cb2';

        this.chrctWrite = null;

        this.cic_list = [0x0000, 0x0100];
        this.keys = [
			'NoJgjANGYJwQrADgjEUAMBmKAWCP4JNIRswt81Yp5DztE1EB2AXSA',
			'NoRg7ANAzArNAc1IigFgqgTB9MCcE8cAbBCJpKgeaSAAxTSPxgC6QA'
		];

        this.decoder = null;

        this.deviceName = this.device.name.trim();

        this.mac = 'CF:30:16:00:' + this.deviceName.slice(9, 11) + ':' + this.deviceName.slice(11, 13);

        this.lastTs = 0;
        this.moveCnt = -1;
        this.prevMoveCnt = -1;
        this.prevMoves = [];
    }

    getKeyAndIv(value) {
        var key = JSON.parse(LZString.decompressFromEncodedURIComponent(this.keys[0]));
        var iv = JSON.parse(LZString.decompressFromEncodedURIComponent(this.keys[1]));
        for (var i = 0; i < 6; i++) {
            key[i] = (key[i] + value[5 - i]) % 255;
            iv[i] = (iv[i] + value[5 - i]) % 255;
        }
        return [key, iv];
    }

    initDecoder() {
        var value = [];
        for (var i = 0; i < 6; i++) {
            value.push(parseInt(this.mac.slice(i * 3, i * 3 + 2), 16));
        }
        var keyiv = this.getKeyAndIv(value);
        console.log('[Moyu32Cube] key=', JSON.stringify(keyiv));
        this.decoder = new aes128(keyiv[0]);
        this.decoder.iv = keyiv[1];
    }

    decode(value) {
        var ret = [];
        for (var i = 0; i < value.byteLength; i++) {
            ret[i] = value.getUint8(i);
        }
        if (this.decoder == null) {
            return ret;
        }
        var iv = this.decoder.iv || [];
        if (ret.length > 16) {
            var offset = ret.length - 16;
            var block = this.decoder.decrypt(ret.slice(offset));
            for (var i = 0; i < 16; i++) {
                ret[i + offset] = block[i] ^ (~~iv[i]);
            }
        }
        this.decoder.decrypt(ret);
        for (var i = 0; i < 16; i++) {
            ret[i] ^= (~~iv[i]);
        }
        return ret;
    }

    encode(ret) {
        if (this.decoder == null) {
            return ret;
        }
        var iv = this.decoder.iv || [];
        for (var i = 0; i < 16; i++) {
            ret[i] ^= ~~iv[i];
        }
        this.decoder.encrypt(ret);
        if (ret.length > 16) {
            var offset = ret.length - 16;
            var block = ret.slice(offset);
            for (var i = 0; i < 16; i++) {
                block[i] ^= ~~iv[i];
            }
            this.decoder.encrypt(block);
            for (var i = 0; i < 16; i++) {
                ret[i + offset] = block[i];
            }
        }
        return ret;
    }

    sendRequest(req) {
        if (!this.chrctWrite) {
            console.log('[Moyu32Cube] sendRequest cannot find write chrct');
            return;
        }
        var encodedReq = this.encode(req.slice());
        console.log('[Moyu32Cube] sendRequest', req, encodedReq);
        return this.chrctWrite.writeValue(new Uint8Array(encodedReq).buffer);
    }

    sendSimpleRequest(opcode) {
        var req = mathlib.valuedArray(20, 0);
        req[0] = opcode;
        return this.sendRequest(req);
    }

    requestCubeInfo() {
        return this.sendSimpleRequest(161);
    }

    requestCubeStatus() {
        return this.sendSimpleRequest(163);
    }

    requestCubePower() {
        return this.sendSimpleRequest(164);
    }

    async initAsync() {
        console.log('[Moyu32Cube]', 'start init device');
        let gatt = await this.device.gatt.connect();
        let service = await gatt.getPrimaryService(this.serviceUuid);
        console.log('[Moyu32Cube]', 'got primary service', this.serviceUuid);
        let chrcts = await service.getCharacteristics();

        for (var i = 0; i < chrcts.length; i++) {
            var chrct = chrcts[i];
            console.log('[Moyu32Cube]', 'init find chrct', chrct.uuid);
            if (matchUUID(chrct.uuid, this.chrctUuidRead)) {
                this.chrctCube = chrct;
            } else if (matchUUID(chrct.uuid, this.chrctUuidWrite)) {
                this.chrctWrite = chrct;
            }
        }

        this.initDecoder(this.mac);

        this.chrctCube.addEventListener('characteristicvaluechanged', this.onCubeEvent.bind(this));
        await this.chrctCube.startNotifications();

        this.requestCubeInfo();
        this.requestCubeStatus();
        this.requestCubePower(); 
    }

    onCubeEvent(event) {
        if (this.prevMoveCnt == -1) {
            this.requestCubeStatus();
        }
        var value = event.target.value;
        if (this.decoder == null) {
            return;
        }
        this.parseData(value);
    }

    parseData(value) {
        value = this.decode(value);
        // console.log(value);
        for (var i = 0; i < value.length; i++) {
            value[i] = (value[i] + 256).toString(2).slice(1);
        }
        value = value.join('');
        var msgType = parseInt(value.slice(0, 8), 2);
        if (msgType == 161) { // info
            console.log('[Moyu32Cube]', 'received hardware info event', value);
        } else if (msgType == 163) { // state (facelets)
            this.moveCnt = parseInt(value.slice(152, 160), 2);
            this.prevMoveCnt = this.moveCnt;
            // console.log("163 " + this.moveCnt + " " + this.prevMoveCnt);
        } else if (msgType == 164) { // battery level
        } else if (msgType == 165) { // move
            this.moveCnt = parseInt(value.slice(88, 96), 2);
            // console.log("165: " + this.moveCnt + " " + this.prevMoveCnt);
            if (this.moveCnt == this.prevMoveCnt || this.prevMoveCnt == -1) {
                return;
            }
            this.prevMoves = [];
            var invalidMove = false;
            for (var i = 0; i < 5; i++) {
                var m = parseInt(value.slice(96 + i * 5, 101 + i * 5), 2);
                this.prevMoves[i] = "FBUDLR".charAt(m >> 1) + " '".charAt(m & 1);
                if (m >= 12) {
                    this.prevMoves[i] = "U ";
                    invalidMove = true;
                }
            }
            if (!invalidMove) {
                this.updateMoveTimes();
            }
        } else if (msgType == 171) { // gyro
        }
    }

    updateMoveTimes() {
        var moveDiff = (this.moveCnt - this.prevMoveCnt) & 0xff;
        // console.log("upd: " + this.moveCnt + " " + this.prevMoveCnt);
        moveDiff > 1 && console.log('[Moyu32Cube]', 'bluetooth event was lost, moveDiff = ' + moveDiff);
        this.prevMoveCnt = this.moveCnt;
        if (moveDiff > this.prevMoves.length) {
            moveDiff = this.prevMoves.length;
        }
        for (var i = moveDiff - 1; i >= 0; i--) {
            this.applyMoves(this.prevMoves[i]);
            // console.log('[Moyu32Cube] move', this.prevMoves[i]);
        }
    }
}


class QiyiCubeConnection extends SmartCubeConnection {
    constructor(device, applyMove) {
        super(device, applyMove);
        
        this.uuidSuffix = '-0000-1000-8000-00805f9b34fb';
        this.serviceUuid = '0000fff0' + this.uuidSuffix;
        this.chrctUuidCube = '0000fff6' + this.uuidSuffix;

        this.cic_list = [0x0504];
        this.keys = ['NoDg7ANAjGkEwBYCc0xQnADAVgkzGAzHNAGyRTanQi5QIFyHrjQMQgsC6QA'];

        this.decoder = new aes128(JSON.parse(LZString.decompressFromEncodedURIComponent(this.keys[0])));

        this.deviceName = this.device.name.trim();

        this.mac = 'CC:A3:00:00:' + this.deviceName.slice(10, 12) + ':' + this.deviceName.slice(12, 14);

        this.moveMap = {
            0x1: "L'",
            0x2: "L",
            0x3: "R'",
            0x4: "R",
            0x5: "D'",
            0x6: "D",
            0x7: "U'",
            0x8: "U",
            0x9: "F'",
            0xa: "F",
            0xb: "B'",
            0xc: "B",
        };

        this.lastTs = 0;
    }

    async initAsync() {
        let gatt = await this.device.gatt.connect();
        let service = await gatt.getPrimaryService(this.serviceUuid);
        let chrcts = await service.getCharacteristics();

        for (var i = 0; i < chrcts.length; i++) {
            var chrct = chrcts[i];
            if (matchUUID(chrct.uuid, this.chrctUuidCube)) {
                this.chrctCube = chrct;
            }
        }

        this.chrctCube.addEventListener('characteristicvaluechanged', this.onCubeEvent.bind(this));
        await this.chrctCube.startNotifications();

        await this.sendHello(this.mac);
    }

    sendMessage(content) {
        var msg = [0xfe];
        msg.push(4 + content.length); // length = 1 (op) + cont.length + 2 (crc)
        for (var i = 0; i < content.length; i++) {
            msg.push(content[i]);
        }
        var crc = crc16modbus(msg);
        msg.push(crc & 0xff, crc >> 8);
        var npad = (16 - msg.length % 16) % 16;
        for (var i = 0; i < npad; i++) {
            msg.push(0);
        }
        var encMsg = [];
        for (var i = 0; i < msg.length; i += 16) {
            var block = msg.slice(i, i + 16);
            this.decoder.encrypt(block);    
            for (var j = 0; j < 16; j++) {
                encMsg[i + j] = block[j];
            }
        }
        return this.chrctCube.writeValue(new Uint8Array(encMsg).buffer);
    }

    sendHello() {
        if (!this.mac) {
            return;
        }
        var content = [0x00, 0x6b, 0x01, 0x00, 0x00, 0x22, 0x06, 0x00, 0x02, 0x08, 0x00];
        for (var i = 5; i >= 0; i--) {
            content.push(parseInt(this.mac.slice(i * 3, i * 3 + 2), 16));
        }
        return this.sendMessage(content);
    }

    onCubeEvent(event) {
        var value = event.target.value;
        var encMsg = [];
        for (var i = 0; i < value.byteLength; i++) {
            encMsg[i] = value.getUint8(i);
        }
        var msg = [];
        for (var i = 0; i < encMsg.length; i += 16) {
            var block = encMsg.slice(i, i + 16);
            this.decoder.decrypt(block);
            for (var j = 0; j < 16; j++) {
                msg[i + j] = block[j];
            }
        }
        msg = msg.slice(0, msg[1]);
        if (msg.length < 3 || crc16modbus(msg) != 0) {
            return;
        }
        this.parseCubeData(msg);
    }

    parseCubeData(msg) {
        if (msg[0] != 0xfe) {
            console.log('[qiyicube]', 'error cube data', msg);
        }
        var opcode = msg[2];
        var ts = (msg[3] << 24 | msg[4] << 16 | msg[5] << 8 | msg[6]);
        if (opcode == 0x2) { // cube hello
            this.sendMessage(msg.slice(2, 7));
            this.batteryLevel = msg[35];
        } else if (opcode == 0x3) { // state change
            this.sendMessage(msg.slice(2, 7));
    
            var todoMoves = [[msg[34], ts]];
            while (todoMoves.length < 10) {
                var off = 91 - 5 * todoMoves.length;
                var hisTs = (msg[off] << 24 | msg[off + 1] << 16 | msg[off + 2] << 8 | msg[off + 3]);
                var hisMv = msg[off + 4];
                if (hisTs <= this.lastTs) {
                    break;
                }
                todoMoves.push([hisMv, hisTs]);
            }
            if (todoMoves.length > 1) {
                console.log('[qiyicube]', 'miss history moves', JSON.stringify(todoMoves), this.lastTs);
            }
    
            for (let i = todoMoves.length-1; i >= 0; --i) {
                this.applyMoves(this.moveMap[todoMoves[i][0]]);
            }
        }
        this.lastTs = ts;
    }

    // not sure if needed
    parseFacelet(faceMsg) {
        var ret = [];
        for (var i = 0; i < 54; i++) {
            ret.push("LRDUFB".charAt(faceMsg[i >> 1] >> (i % 2 << 2) & 0xf));
        }
        ret = ret.join("");
        return ret;
    }
}