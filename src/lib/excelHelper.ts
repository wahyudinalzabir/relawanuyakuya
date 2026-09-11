import * as XLSX from 'xlsx';
import { Relawan } from '../types';

export interface FieldDefinition {
  key: string;
  label: string;
  required?: boolean;
  aliases: string[];
}

export const RELAWAN_FIELDS: FieldDefinition[] = [
  {
    key: 'nik',
    label: 'NIK (Wajib)',
    required: true,
    aliases: ['nik', 'no ktp', 'no. ktp', 'nomor ktp', 'nomor induk kependudukan', 'nomor identitas', 'ktp'],
  },
  {
    key: 'nama',
    label: 'Nama Lengkap (Wajib)',
    required: true,
    aliases: ['nama', 'nama lengkap', 'nama relawan', 'name', 'full name', 'nama sesuai ktp'],
  },
  {
    key: 'no_hp',
    label: 'No. HP / WhatsApp',
    aliases: ['no hp', 'nomor hp', 'no. hp', 'telepon', 'no telepon', 'no telp', 'whatsapp', 'wa', 'no wa', 'phone', 'hp'],
  },
  {
    key: 'kelurahan',
    label: 'Kelurahan',
    aliases: ['kelurahan', 'desa', 'desa/kelurahan', 'kel', 'nama kelurahan'],
  },
  {
    key: 'rw',
    label: 'RW',
    aliases: ['rw', 'no rw', 'nomor rw', 'rukun warga'],
  },
  {
    key: 'rt',
    label: 'RT',
    aliases: ['rt', 'no rt', 'nomor rt', 'rukun tetangga'],
  },
  {
    key: 'alamat',
    label: 'Alamat KTP / Domisili',
    aliases: ['alamat', 'alamat ktp', 'alamat domisili', 'alamat lengkap', 'jalan', 'tempat tinggal'],
  },
  {
    key: 'tps',
    label: 'TPS',
    aliases: ['tps', 'no tps', 'nomor tps', 'tps pemilihan'],
  },
  {
    key: 'tempat_lahir',
    label: 'Tempat Lahir',
    aliases: ['tempat lahir', 'tmp lahir', 'kota lahir', 'tempat lahir / kota'],
  },
  {
    key: 'tanggal_lahir',
    label: 'Tanggal Lahir',
    aliases: ['tanggal lahir', 'tgl lahir', 'birth date', 'dob'],
  },
  {
    key: 'jenis_kelamin',
    label: 'Jenis Kelamin',
    aliases: ['jenis kelamin', 'jk', 'gender', 'sex'],
  },
  {
    key: 'golongan_darah',
    label: 'Golongan Darah',
    aliases: ['golongan darah', 'gol darah', 'goldar', 'blood type'],
  },
  {
    key: 'agama',
    label: 'Agama',
    aliases: ['agama', 'religion'],
  },
  {
    key: 'status_perkawinan',
    label: 'Status Perkawinan',
    aliases: ['status perkawinan', 'status nikah', 'status pernikahan', 'marital status'],
  },
  {
    key: 'pekerjaan',
    label: 'Pekerjaan',
    aliases: ['pekerjaan', 'profesi', 'occupation'],
  },
  {
    key: 'status_relawan',
    label: 'Status Relawan',
    aliases: ['status', 'status relawan', 'keaktifan'],
  },
  {
    key: 'koordinator',
    label: 'Koordinator',
    aliases: ['koordinator', 'kor', 'nama koordinator', 'penanggung jawab', 'pj'],
  },
  {
    key: 'keterangan',
    label: 'Keterangan',
    aliases: ['keterangan', 'catatan', 'notes'],
  },
];

/**
 * Automatically match an Excel header to the best known Relawan field key
 */
export function guessFieldMapping(header: string): string | null {
  const clean = header.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
  for (const field of RELAWAN_FIELDS) {
    if (field.key === clean) return field.key;
    for (const alias of field.aliases) {
      const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
      if (clean === cleanAlias || clean.includes(cleanAlias) || cleanAlias.includes(clean)) {
        return field.key;
      }
    }
  }
  return null;
}

/**
 * Export array of Relawan to .xlsx file with formatting and text-encoded NIK
 */
export function exportRelawanToExcel(relawanList: Relawan[], filename?: string) {
  const headers = [
    'No',
    'ID Relawan',
    'NIK',
    'Nama Lengkap',
    'No. HP / WA',
    'Kelurahan',
    'RW',
    'RT',
    'TPS',
    'Alamat Lengkap',
    'Tempat Lahir',
    'Tanggal Lahir',
    'Jenis Kelamin',
    'Gol. Darah',
    'Agama',
    'Status Perkawinan',
    'Pekerjaan',
    'Kewarganegaraan',
    'Kecamatan',
    'Kota/Kabupaten',
    'Provinsi',
    'Status Relawan',
    'Koordinator',
    'Sumber Data',
    'Tanggal Input',
    'Operator',
    'Keterangan',
  ];

  const rows = relawanList.map((r, idx) => [
    idx + 1,
    r.id_relawan || '',
    r.nik ? String(r.nik) : '',
    r.nama || '',
    r.no_hp || '',
    r.kelurahan || '',
    r.rw || '',
    r.rt || '',
    r.tps || '',
    r.alamat || '',
    r.tempat_lahir || '',
    r.tanggal_lahir || '',
    r.jenis_kelamin || '',
    r.golongan_darah || '-',
    r.agama || '',
    r.status_perkawinan || '',
    r.pekerjaan || '',
    r.kewarganegaraan || 'WNI',
    r.kecamatan || 'Jagakarsa',
    r.kabupaten_kota || 'Kota Jakarta Selatan',
    r.provinsi || 'DKI Jakarta',
    r.status_relawan || 'Aktif',
    r.koordinator || '',
    r.sumber_data || 'Manual / OCR',
    r.tanggal_input || '',
    r.operator_name || r.operator_id || '',
    r.keterangan || '',
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Ensure NIK column (index 2) is explicitly treated as string so Excel doesn't turn it into scientific notation
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  for (let R = 1; R <= range.e.r; ++R) {
    const nikCellAddress = XLSX.utils.encode_cell({ r: R, c: 2 });
    if (worksheet[nikCellAddress]) {
      worksheet[nikCellAddress].t = 's'; // string type
    }
  }

  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 18 }, // ID Relawan
    { wch: 20 }, // NIK
    { wch: 25 }, // Nama
    { wch: 16 }, // No HP
    { wch: 16 }, // Kelurahan
    { wch: 8 },  // RW
    { wch: 8 },  // RT
    { wch: 10 }, // TPS
    { wch: 32 }, // Alamat
    { wch: 16 }, // Tempat Lahir
    { wch: 14 }, // Tgl Lahir
    { wch: 14 }, // JK
    { wch: 10 }, // Gol Darah
    { wch: 12 }, // Agama
    { wch: 16 }, // Status Kawin
    { wch: 18 }, // Pekerjaan
    { wch: 16 }, // Kewarganegaraan
    { wch: 14 }, // Kecamatan
    { wch: 20 }, // Kota
    { wch: 14 }, // Provinsi
    { wch: 14 }, // Status Relawan
    { wch: 20 }, // Koordinator
    { wch: 16 }, // Sumber Data
    { wch: 14 }, // Tgl Input
    { wch: 18 }, // Operator
    { wch: 28 }, // Keterangan
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Relawan');

  const defaultFilename = `DATA_RELAWAN_JAGAKARSA_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, filename || defaultFilename);
}

/**
 * Parse an uploaded Excel ArrayBuffer into list of rows and header names
 */
export function parseExcelFile(data: ArrayBuffer): {
  sheetNames: string[];
  selectedSheet: string;
  headers: string[];
  rows: Record<string, any>[];
} {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) {
    throw new Error('File Excel tidak memiliki lembar kerja (worksheet).');
  }

  const selectedSheet = sheetNames[0];
  const worksheet = workbook.Sheets[selectedSheet];

  // Convert to JSON with raw strings to preserve NIK formatting
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: '',
  });

  if (rawRows.length === 0) {
    throw new Error('File Excel kosong atau tidak memiliki baris data.');
  }

  const headerRow = rawRows[0] as string[];
  const headers = headerRow.map((h, i) => (h && String(h).trim()) || `Kolom_${i + 1}`);

  const rows: Record<string, any>[] = [];
  for (let i = 1; i < rawRows.length; i++) {
    const rowData = rawRows[i];
    // Skip completely empty rows
    if (!rowData || rowData.every((cell: any) => cell === '' || cell === undefined || cell === null)) {
      continue;
    }
    const rowObj: Record<string, any> = { _rowIndex: i + 1 };
    headers.forEach((header, colIndex) => {
      rowObj[header] = rowData[colIndex] !== undefined ? String(rowData[colIndex]).trim() : '';
    });
    rows.push(rowObj);
  }

  return {
    sheetNames,
    selectedSheet,
    headers,
    rows,
  };
}
