import fs from "node:fs";
import dayjs from "dayjs";
import * as fastCsv from "fast-csv";
import customParseFormat from "dayjs/plugin/customParseFormat";
import utc from "dayjs/plugin/utc";
import StreamBuf from "../utils/stream-buf";
import { exists } from "../utils/utils";

dayjs.extend(customParseFormat);
dayjs.extend(utc);

/* eslint-disable quote-props */
const SpecialValues: Record<string, any> = {
  true: true,
  false: false,
  '#N/A': {error: '#N/A'},
  '#REF!': {error: '#REF!'},
  '#NAME?': {error: '#NAME?'},
  '#DIV/0!': {error: '#DIV/0!'},
  '#NULL!': {error: '#NULL!'},
  '#VALUE!': {error: '#VALUE!'},
  '#NUM!': {error: '#NUM!'},
};
/* eslint-ensable quote-props */

/** A date format, with an optional necessary-condition pattern: text that fails it cannot parse strictly as `format`. */
interface DateFormat {
  format: string;
  shape?: RegExp;
}

// Strict parsing requires the text to equal the format's own output, so each default format's
// output shape is a necessary condition for it.
const DEFAULT_DATE_FORMATS: DateFormat[] = [
  { format: 'YYYY-MM-DD[T]HH:mm:ssZ', shape: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}./ },
  { format: 'YYYY-MM-DD[T]HH:mm:ss', shape: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/ },
  { format: 'MM-DD-YYYY', shape: /^\d{2}-\d{2}-\d{4}$/ },
  { format: 'YYYY-MM-DD', shape: /^\d{4}-\d{2}-\d{2}$/ },
];

class CSV {
  workbook: any;
  worksheet: any;

  constructor(workbook: any) {
    this.workbook = workbook;
    this.worksheet = null;
  }

  async readFile(filename: any, options: any) {
    options = options || {};
    if (!(await exists(filename))) {
      throw new Error(`File not found: ${filename}`);
    }
    const stream = fs.createReadStream(filename);
    const worksheet = await this.read(stream, options);
    stream.close();
    return worksheet;
  }

  read(stream: any, options: any) {
    options = options || {};

    return new Promise((resolve, reject) => {
      const worksheet = this.workbook.addWorksheet(options.sheetName);

      const dateFormats: DateFormat[] = options.dateFormats
        ? options.dateFormats.map((format: string) => ({ format }))
        : DEFAULT_DATE_FORMATS;
      const map =
        options.map ||
        function(datum: any) {
          if (datum === '') {
            return null;
          }
          const datumNumber = Number(datum);
          if (!Number.isNaN(datumNumber) && datumNumber !== Infinity) {
            return datumNumber;
          }
          for (const { format, shape } of dateFormats) {
            // Strict parsing is slow (~50us), and most text is not a date: skip formats whose shape cannot match.
            if (shape && typeof datum === 'string' && !shape.test(datum)) {
              continue;
            }
            const parsed = dayjs(datum, format, true);
            if (parsed.isValid()) {
              return new Date(parsed.valueOf());
            }
          }
          const special = SpecialValues[datum];
          if (special !== undefined) {
            return special;
          }
          return datum;
        };

      const csvStream = fastCsv
        .parse(options.parserOptions)
        .on('data', data => {
          worksheet.addRow(data.map(map));
        })
        .on('end', () => {
          csvStream.emit('worksheet', worksheet);
        });

      csvStream.on('worksheet', resolve).on('error', reject);

      stream.pipe(csvStream);
    });
  }

  /**
   * @deprecated Not supported: use `CSV#read` instead.
   */
  createInputStream() {
    throw new Error(
      '`CSV#createInputStream` is not supported. Use `CSV#read` instead.'
    );
  }

  write(stream: any, options: any) {
    return new Promise<void>((resolve, reject) => {
      options = options || {};
      // const encoding = options.encoding || 'utf8';
      // const separator = options.separator || ',';
      // const quoteChar = options.quoteChar || '\'';

      const worksheet = this.workbook.getWorksheet(options.sheetName || options.sheetId);

      const csvStream = fastCsv.format(options.formatterOptions);
      stream.on('finish', () => {
        resolve();
      });
      csvStream.on('error', reject);
      csvStream.pipe(stream);

      const {dateFormat, dateUTC} = options;
      const map =
        options.map ||
        ((value: any) => {
          if (value) {
            if (value.text || value.hyperlink) {
              return value.hyperlink || value.text || '';
            }
            if (value.formula || value.result) {
              return value.result || '';
            }
            if (value instanceof Date) {
              if (dateFormat) {
                return dateUTC
                  ? dayjs.utc(value).format(dateFormat)
                  : dayjs(value).format(dateFormat);
              }
              return dateUTC ? dayjs.utc(value).format() : dayjs(value).format();
            }
            if (value.error) {
              return value.error;
            }
            if (typeof value === 'object') {
              return JSON.stringify(value);
            }
          }
          return value;
        });

      const includeEmptyRows = options.includeEmptyRows === undefined || options.includeEmptyRows;
      let lastRow = 1;
      if (worksheet) {
        worksheet.eachRow((row: any, rowNumber: any) => {
          if (includeEmptyRows) {
            while (lastRow++ < rowNumber - 1) {
              csvStream.write([]);
            }
          }
          const {values} = row;
          values.shift();
          csvStream.write(values.map(map));
          lastRow = rowNumber;
        });
      }
      csvStream.end();
    });
  }

  writeFile(filename: any, options: any) {
    options = options || {};

    const streamOptions = {
      encoding: options.encoding || 'utf8',
    };
    const stream = fs.createWriteStream(filename, streamOptions);

    return this.write(stream, options);
  }

  async writeBuffer(options: any) {
    const stream = new StreamBuf();
    await this.write(stream, options);
    return stream.read();
  }
}

export default CSV;
