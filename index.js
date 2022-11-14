
require("dotenv").config();
const { SerialPort } = require('serialport');
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

function comm() {
    serialPort.on('open', function () {
        console.log("open!")
        // console.log(process.env.INFLUXDB_TOKEN);
    });

    serialPort.on('error', function (err) {
        console.log('Error: ', err.message);
    })

    serialPort.on('readable', function () {

        const data = [...serialPort.read()]

        if (data != null) {
            if (data.length == 7
                && String(data[0]).startsWith('2')
                && String(data[6]).endsWith('3')
            ) {
                const vib1 = parseInt(data[1]).toString(16)
                const vib2 = parseInt(data[2]).toString(16)
                const vib = parseInt(String(vib1) + String(vib2), 16)
                const temperature1 = parseInt(data[3]).toString(16)
                const temperature2 = parseInt(data[4]).toString(16)
                const temperature = parseInt(String(temperature1) + String(temperature2), 16) / 100
                // console.log('data', data)
                console.log('vib', vib)
                console.log('temp', temperature)
                writeDb(vib, temperature)
            }
        }

    });
}



function writeDb(vib, temperature) {

    const writeClient = client.getWriteApi(org, bucket)
    const point1 = new Point('vib')
        .tag('sensor_id', 'OSTSen-VIB100')
        .intField('value', vib)
    const point2 = new Point('temperature')
        .tag('sensor_id', 'TB-485-H08')
        .floatField('value', temperature)

    writeClient.writePoints([
        point1, point2
    ])

    writeClient.close().then(() => {
        console.log('WRITE FINISHED')
    })
}

comm();