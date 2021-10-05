
import mssql, { ConnectionPool } from "mssql";
import { Building, BUILDINGS as BUILDING_NAMES, Metric, METRICS } from "../client/data";
import type { NextApiRequest, NextApiResponse } from "next";

export const BUILDINGS = Object.keys(BUILDING_NAMES);

/// Mobile metrics. The box metrics that can be moved, and upload data to WFIC_CEVAC_Shades
export const mobileMETRICS = new Map<number, string>([
  [8916, "Sensor14"],
  [8921, "Sensor15"],
  [8935, "Sensor16"],
  [8939, "Sensor17"],
]);

interface BoxData {
  temp: number;
  humidity: number;
};

interface MobileSensoryEntry {
  DateTime: Date;
  Sensor: string;
  Metric: string;
  Reading: number;
};

export const boxData = new Map<number, BoxData>([
  [8916, { temp: 0, humidity: 0 }],
  [8921, { temp: 0, humidity: 0 }],
  [8935, { temp: 0, humidity: 0 }],
  [8939, { temp: 0, humidity: 0 }],
]);

export const mobileSensorData = new mssql.ConnectionPool({
  user: process.env.SHADES_USER,
  password: process.env.SHADES_PASSWORD,
  server: process.env.SHADES_SERVER,
  database: process.env.SHADES_DATABASE,
  options: {
    trustServerCertificate: true
  }
});

/// Thermostat Data, is uploaded to WFIC_CEVAC. This is a fallback in case the box METRICS are not
/// online
export const thermostatData = new mssql.ConnectionPool({
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  server: process.env.MSSQL_SERVER,
  database: process.env.MSSQL_DATABASE,
  options: {
    trustServerCertificate: true
  }
});


function connectionHandler(retries: number, pool: ConnectionPool, database: string, after?: () => void) {
  return (err: any) => {
    if (err) {

      if (retries <= 10) {
        console.error(`Could not connect to ${database} database! Retrying (${retries}/10) in 1000ms... [${err}]`);
      }

      setTimeout(() => {
        pool.connect(connectionHandler(retries + 1, pool, database));
      }, 1000);


    } else {
      console.info(`Connected to ${database} database!`);
      after && after();
    }
  }
}

export async function ensureConnection() {
  return new Promise<void>((resolve) => {

    const connected = [false, false];
    const allConnected = () => connected.every(c => c);

    thermostatData.connect(connectionHandler(1, thermostatData, process.env.MSSQL_DATABASE, () => {
      connected[0] = true;
      if (allConnected()) {
        resolve();
      };
    }));
    mobileSensorData.connect(connectionHandler(1, mobileSensorData, process.env.SHADES_DATABASE, async () => {
      (async function updateSensorData() {
        console.info("Updating live METRICS...");

        for (const [id, sensor] of mobileMETRICS) {

          const tempQuery = `SELECT TOP 1 * FROM [WFIC_CEVAC_Shades].[dbo].[SensorData]
                                  WHERE (Metric='Temp(F)')
                                  AND (Sensor='${sensor}')
                                  AND (DateTime > DATEADD(HOUR, -1, GETDATE()))
                                  ORDER BY [DATETIME] DESC`;

          const humidityQuery = `SELECT TOP 1 * FROM [WFIC_CEVAC_Shades].[dbo].[SensorData]
                                  WHERE (Metric='Humidity')
                                  AND (Sensor='${sensor}')
                                  AND (DateTime > DATEADD(HOUR, -1, GETDATE()))
                                  ORDER BY [DATETIME] DESC`;


          const tempData = await mobileSensorData.query<MobileSensoryEntry>(tempQuery);
          const humidityData = await mobileSensorData.query<MobileSensoryEntry>(humidityQuery);

          if (tempData.recordset.length > 0) {
            boxData.set(id, {
              temp: tempData.recordset[0].Reading,
              humidity: humidityData.recordset[0].Reading,
            });
          }

        }

        connected[1] = true;
        if (allConnected()) {
          resolve();
        };

        setTimeout(updateSensorData, 1000 * 60);
      })();
    }));


  });
};