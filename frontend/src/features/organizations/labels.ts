import type { MantineColor } from '@mantine/core';
import {
  ActivityType,
  RegistrationStatus,
  OrganizationType,
  Province,
  Sector,
} from '@/api/generated/model';

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  [OrganizationType.COOPERATIVE]: 'Cooperativa',
  [OrganizationType.ERT]: 'Empresa recuperada',
};

/** How the account that sent a registration request reads its status. */
export const REGISTRATION_REQUEST_STATUS_LABELS: Record<RegistrationStatus, string> = {
  [RegistrationStatus.PENDING]: 'Pendiente de aprobación',
  [RegistrationStatus.APPROVED]: 'Aprobada',
  [RegistrationStatus.REJECTED]: 'Rechazada',
  [RegistrationStatus.CHANGES_REQUESTED]: 'Solicitud de cambios',
};

/** The same colors in the observatory's panel and in the organization's, so a status reads the same everywhere. */
export const REGISTRATION_STATUS_COLORS: Record<RegistrationStatus, MantineColor> = {
  [RegistrationStatus.PENDING]: 'yellow',
  [RegistrationStatus.APPROVED]: 'green',
  [RegistrationStatus.REJECTED]: 'red',
  [RegistrationStatus.CHANGES_REQUESTED]: 'orange',
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  [ActivityType.WORK]: 'Trabajo',
  [ActivityType.SERVICE]: 'Servicio',
  [ActivityType.PRODUCT]: 'Producto',
};

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
