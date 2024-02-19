import { isValid } from 'date-fns';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';

import axios from "axios";

const baseUrl = "http://127.0.0.1:3000/";

export const http = axios.create({
  baseURL: baseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

type IPlanilhaType = {
  [key: string]: number;
};

const IPlanilha: IPlanilhaType = {
  'Depositante': 0,
  'Número': 1,
  'Centros': 2,
  'Título': 3,
  'Data do Depósito': 4,
  'Data da Publicação': 5,
  'Concessão': 6,
  'IPC': 8,
  'Categorias': 7,
  'Inventor 1': 10,
  'Inventor 2': 11,
  'Inventor 3': 12,
  'Inventor 4': 13,
  'Inventor 5': 14,
  'Inventor 6': 15,
  'Inventor 7': 16,
  'Inventor 8': 17,
  'Inventor 9': 18,
  'Inventor 10': 19,
  'Inventor 11': 20,
  'Inventor 12': 21,
  'Inventor 13': 22,
  'Inventor 14': 23,
  'Inventor 15': 24,
  'Inventor 16': 25,
  'Procurador': 26,
  'Resumo': 27,
}

export interface Categoria {
  id_categoria: string;
  descricao: string;
}

export interface Instituicao {
  instituicao: string;
  centros: string;
}

export interface Inventor {
  nome: string;
}

export interface Patente {
  num_patente: string;
  titulo: string;
  IPC: string;
  descricao: string;
  data_deposito: Date | null;
  data_publicacao: Date | null;
  data_concesao: Date | null;
  instituicao: Instituicao;
  inventores: Inventor[];
  categorias: Categoria[];
}

export interface Procurador {
  nome: string;
}

async function readExcel(filePath: string): Promise<any> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  // Supondo que a planilha tenha apenas uma folha
  const worksheet = workbook.worksheets[0];

  // Lê os dados da planilha e armazena em uma matriz
  const data: any[][] = [];
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const rowData: any[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      rowData.push(cell.value);
    });
    data.push(rowData);
  });

  return data;
}

// Exemplo de uso
const filePath = 'planilha.xlsx';
run();

async function run() {
  readExcel(filePath)
    .then(async (data) => {
      const responses: Patente[] = [];
      const MAX_ROWS = 210;
      for (let i = 1; i < MAX_ROWS - 1; i++) {

        const inventores: Inventor[] = [];
        for (let index = 1; index <= 16; index++) {
          let chave: keyof IPlanilhaType = `Inventor ${index}`;
          if (data[i][IPlanilha[chave]] !== null) {
            inventores.push({ nome: data[i][IPlanilha[chave]].trim() });
          }
        }

        const categorias: Categoria[] = await Promise.all(
          data[i][IPlanilha['Categorias']].split('; ').map(async (categoria: string) => {
            categoria = categoria.replace('; ', '').replace(';', '');
            let data: any = await http.get<Categoria>(`/categoria/${categoria}`).then(data => data.data);
            if (!data) {
              data = await http.post<Categoria>('/categoria', { descricao: categoria }).then(data => data.data);
            }
            return data;
          })
        );

        const response: Patente = {
          titulo: data[i][IPlanilha['Título']],
          categorias: categorias,
          descricao: data[i][IPlanilha['Resumo']],
          instituicao: { centros: data[i][IPlanilha['Centros']], instituicao: data[i][IPlanilha['Depositante']] },
          inventores: inventores,
          IPC: data[i][IPlanilha['IPC']],
          num_patente: data[i][IPlanilha['Número']],
          data_concesao: isValid(new Date(data[i][IPlanilha['Concessão']])) ? new Date(data[i][IPlanilha['Concessão']]) : null,
          data_deposito: isValid(new Date(data[i][IPlanilha['Data do Depósito']])) ? new Date(data[i][IPlanilha['Concessão']]) : null,
          data_publicacao: isValid(new Date(data[i][IPlanilha['Concessão']])) ? new Date(data[i][IPlanilha['Data da Publicação']]) : null,
        };
        responses.push(response);
      }

      responses.forEach(async response => {
        await http.post('/patente', response).catch(_ => { return });
      });
    })
    .catch((error) => {
      console.error('Erro ao ler a planilha:', error);
    });
}
