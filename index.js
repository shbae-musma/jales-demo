
require("dotenv").config();
const { SerialPort } = require('serialport');
const { ByteLengthParser } = require('@serialport/parser-byte-length')
const { InfluxDB, Point } = require('@influxdata/influxdb-client')

const org = process.env.ORG
const bucket = process.env.BUCKET
const token = process.env.INFLUXDB_TOKEN
const url = process.env.URL
const client = new InfluxDB({ url, token })
const serialPort = new SerialPort({
    path: 'COM3',
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
});
const parser = serialPort.pipe(new ByteLengthParser({ length: 7 }))

function comm() {
    serialPort.on('open', function () {
        console.log("open!")
    });
    
    serialPort.on('close', function () {
        console.log("close!")
    });

    serialPort.on('error', function (err) {
        console.log('Error: ', err.message);
    })

    parser.on('data', function (raw) {
        // console.log(raw)
        const data = [...raw]
        // console.log(data)

        if (data != null) {
            const vib1 = parseInt(data[1]).toString(16).padStart(2,'0')
            const vib2 = parseInt(data[2]).toString(16).padStart(2,'0')
            const vib = parseInt(String(vib1) + String(vib2), 16)
            const temperature1 = parseInt(data[3]).toString(16).padStart(2,'0')
            const temperature2 = parseInt(data[4]).toString(16).padStart(2,'0')
            const temperature = parseInt(String(temperature1) + String(temperature2), 16) / 100
            const sum = parseInt(data[1]) + parseInt(data[2]) + parseInt(data[3]) + parseInt(data[4])
            const cs = (sum & 0xff) == parseInt(data[5])
            console.log('vib', vib, 'temp', temperature, 'cs', cs)
            writeDb(vib, temperature, cs)
        }
    })

}



function writeDb(vib, temperature, cs) {

    const writeClient = client.getWriteApi(org, bucket)
    const point1 = new Point('vib')
        .tag('sensor_id', 'OSTSen-VIB100')
        .intField('value', vib)
    const point2 = new Point('temperature')
        .tag('sensor_id', 'TB-485-H08')
        .floatField('value', temperature)
    // const point3 = new Point('checksum')
    //     .booleanField('value', cs)

    writeClient.writePoints([
        point1, point2, 
        // point3
    ])

    writeClient.close().then(() => {
        console.log('WRITE FINISHED')
    })
}

comm();