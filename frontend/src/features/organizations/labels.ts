import { Province, Sector } from '@/api/generated/model';

export const SECTOR_LABELS: Record<Sector, string> = {
  [Sector.FOOD]: 'Alimentos',
  [Sector.TEXTILE]: 'Textil',
  [Sector.METALWORKING]: 'Metalúrgica',
  [Sector.PRINTING]: 'Gráfica',
  [Sector.SERVICES]: 'Servicios',
  [Sector.OTHER]: 'Otro',
};

export const PROVINCE_LABELS: Record<Province, string> = {
  [Province.BUENOS_AIRES]: 'Buenos Aires',
  [Province.CITY_OF_BUENOS_AIRES]: 'Ciudad Autónoma de Buenos Aires',
  [Province.CATAMARCA]: 'Catamarca',
  [Province.CHACO]: 'Chaco',
  [Province.CHUBUT]: 'Chubut',
  [Province.CORDOBA]: 'Córdoba',
  [Province.CORRIENTES]: 'Corrientes',
  [Province.ENTRE_RIOS]: 'Entre Ríos',
  [Province.FORMOSA]: 'Formosa',
  [Province.JUJUY]: 'Jujuy',
  [Province.LA_PAMPA]: 'La Pampa',
  [Province.LA_RIOJA]: 'La Rioja',
  [Province.MENDOZA]: 'Mendoza',
  [Province.MISIONES]: 'Misiones',
  [Province.NEUQUEN]: 'Neuquén',
  [Province.RIO_NEGRO]: 'Río Negro',
  [Province.SALTA]: 'Salta',
  [Province.SAN_JUAN]: 'San Juan',
  [Province.SAN_LUIS]: 'San Luis',
  [Province.SANTA_CRUZ]: 'Santa Cruz',
  [Province.SANTA_FE]: 'Santa Fe',
  [Province.SANTIAGO_DEL_ESTERO]: 'Santiago del Estero',
  [Province.TIERRA_DEL_FUEGO]: 'Tierra del Fuego',
  [Province.TUCUMAN]: 'Tucumán',
};
