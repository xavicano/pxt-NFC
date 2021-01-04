
/**
 *NFC reader
 */
//% weight=10 color=#1d8045 icon="\uf0e7" block="NFC"
namespace NFC {
    let myNFCevent: Action = null;
    let receivedLen = 0;
    let password = pins.createBuffer(6);
    let receivedBuffer = pins.createBuffer(25);
    let uid = pins.createBuffer(7);
    let myRxPin=SerialPin.P14;
    let myTxPin=SerialPin.P13;
    let init=false;
    password[0] = 0xFF;
    password[1] = 0xFF;
    password[2] = 0xFF;
    password[3] = 0xFF;
    password[4] = 0xFF;
    password[5] = 0xFF;

    //% advanced=true shim=NFC::RxBufferedSize
    function RxBufferedSize(): number {
        return 1
    }

    function wakeup(): void {
        let myBuffer: number[] = [];
        myBuffer = [0x55, 0x55, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0x03, 0xfd, 0xd4,
            0x14, 0x01, 0x17, 0x00];
        let wake = pins.createBufferFromArray(myBuffer);
        serial.writeBuffer(wake);
        basic.pause(50);
        receivedLen = RxBufferedSize();
        if (receivedLen == 15) {
            receivedBuffer = serial.readBuffer(15);
        }
    }

    /**
     * Setup DFRobot NFC module Tx Rx to micro:bit pins.
     * 設定DFRobot的Tx、Rx連接腳位
     * @param pinTX to pinTX ,eg: SerialPin.P13
     * @param pinRX to pinRX ,eg: SerialPin.P14
    */
    //% weight=100
    //% blockId="NFC_setSerial" block="set NFC TX to %pinTX | RX to %pinRX"
    export function NFC_setSerial(pinTX: SerialPin, pinRX: SerialPin): void {
        myRxPin=pinRX;
        myTxPin=pinTX;
        serial.redirect(
            pinRX,
            pinTX,
            BaudRate.BaudRate115200
        )
        init=true;
    }

    //% weight=95
    //% blockId="NFC_disconnect" block="NFC disconnect"
    export function NFC_disconnect(): void {
        init=false;
    }

    //% weight=94
    //% blockId="NFC_reconnect" block="NFC reconnect"
    export function NFC_reconnect(): void {
        serial.redirect(
            myRxPin,
            myTxPin,
            BaudRate.BaudRate115200
        )
        init=true;
    }

    //% weight=90
    //% blockId="nfcEvent" block="When RFID card is detected"
    export function nfcEvent(tempAct: Action) {
        myNFCevent = tempAct;
    }

    //% weight=80
    //% blockId="getUID" block="RFID UID string"
    export function getUID(): string {
        serial.setRxBufferSize(100)
        wakeup();
        let myBuffer: number[] = []
        let uidBuffer: number[] = []
        myBuffer = [0x00, 0x00, 0xFF, 0x04, 0xFC, 0xD4, 0x4A, 0x01, 0x00, 0xE1, 0x00]
        let cmdUID = pins.createBufferFromArray(myBuffer)
        serial.writeBuffer(cmdUID);
        basic.pause(50);
        receivedLen = RxBufferedSize();
        if (receivedLen == 25) {
            receivedBuffer = serial.readBuffer(25);
            for (let i = 0; i < 4; i++) {
                uid[i] = receivedBuffer[19 + i];
            }

            if (uid[0] == uid[1] && uid[1] == uid[2] && uid[2] == uid[3] && uid[3] == 0xFF) {
                return "";
            } else {
                uidBuffer = [uid[0], uid[1], uid[2], uid[3]];
            }
            return convertString(uidBuffer, 4);
        } else if (receivedLen > 25) {   // To read UID of 7 bytes MIFARE Ultralight
            receivedBuffer = serial.readBuffer(28);
            for (let i = 0; i < 7; i++) {
                uid[i] = receivedBuffer[19 + i];
            }
            if (uid[0] == uid[1] && uid[1] == uid[2] && uid[2] == uid[3] && uid[3] == 0xFF) {
                return "";
            } else {
                uidBuffer = [uid[0], uid[1], uid[2], uid[3], uid[4], uid[5], uid[6]];
            }
            return convertString(uidBuffer, 7);
        } else {
            return "";
        }
    }
    //block="set NFC TX to %pinTX | RX to %pinRX
    //% weight=80
    //% blockId="ReadBlock" block="RFID Read Data  %blockNumber"
    export function ReadBlock(blockNumber: number): string {
        serial.setRxBufferSize(100)
        wakeup();
        let myBuffer: number[] = []
        let dataBlock=""
        //[PREAMBLE 0x00, 
        //START oF PACKET 0x00 0xFF, 
        //NUM OF BYTES 0x04, from TFI+DATA
        //LCS = Lower byte of LEN + LCS=0x00, 
        //TFI =0xD4, 
        //DATA, 
        //Packet DAta Checksum DCS=TFI+DATAn+DCS=0x00, 
        //POSTAMBLE=0x00]
        // myBuffer = [0x00, 0x00, 0xFF, 0x04, 0xFC, 0xD4, 0x4A, 0x01, 0x00, 0xE1, 0x00]
        myBuffer = [0x00, 0x00, 0xFF, 0x04, 0xFC, 0xD4, 0x40, 0x01, 0x30]
        myBuffer[9]=blockNumber
        myBuffer[10]=0xBB           // CheckSum
        myBuffer[11]=0x00           //POSTAMBLE
        let cmdRead = pins.createBufferFromArray(myBuffer)
        serial.writeBuffer(cmdRead);
        basic.pause(50);
        receivedLen = RxBufferedSize();
        //if (receivedLen > 25) {
            receivedBuffer = serial.readBuffer(receivedLen);
            for (let i = 0; i < receivedLen; i++) {
                dataBlock += getHexStr(receivedBuffer[16 + i]);
            }
            return dataBlock;
        //} else {
        //    return "";
        //}
    }

    //% weight=70
    //% blockId="detectedRFIDcard" block="Detected RFID card?"
    export function detectedRFIDcard(): boolean {
        serial.setRxBufferSize(100)
        wakeup();
        let myBuffer: number[] = []
        myBuffer = [0x00, 0x00, 0xFF, 0x04, 0xFC, 0xD4, 0x4A, 0x01, 0x00, 0xE1, 0x00]
        let cmdUID = pins.createBufferFromArray(myBuffer)
        serial.writeBuffer(cmdUID);
        basic.pause(50);
        receivedLen = RxBufferedSize();
        if (receivedLen >= 25) {  //if (receivedLen == 25) {
            receivedBuffer = serial.readBuffer(25);
            for (let i = 0; i < 4; i++) {
                uid[i] = receivedBuffer[19 + i];
            }
            if (uid[0] == uid[1] && uid[1] == uid[2] && uid[2] == uid[3] && uid[3] == 0xFF) {
                return false;
            }
            return true;
        }
        return false;
    }

    function getHexStr(myNum: number): string {
        let tempStr = "";
        if (myNum < 0x0A) {
            tempStr += myNum.toString();
        } else {
            switch (myNum) {
                case 0x0A:
                    tempStr += "A";
                    break;
                case 0x0B:
                    tempStr += "B";
                    break;
                case 0x0C:
                    tempStr += "C";
                    break;
                case 0x0D:
                    tempStr += "D";
                    break;
                case 0x0E:
                    tempStr += "E";
                    break;
                case 0x0F:
                    tempStr += "F";
                    break;
                default:
                    break;

            }
        }
        return tempStr;
    }

    function convertString(myBuffer: number[], len: number): string {
        let myStr = "";
        let temp = 0;
        for (let i = 0; i < len; i++) {
            temp = (myBuffer[i] & 0xF0) >> 4;
            myStr += getHexStr(temp);
            temp = (myBuffer[i] & 0x0F);
            myStr += getHexStr(temp);
        }
        return myStr;
    }


    basic.forever(() => {
        if (init && (myNFCevent != null)) {
            if (detectedRFIDcard()) {
                myNFCevent();
            }
            basic.pause(50);
        }
    })
}
