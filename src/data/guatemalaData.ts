import { GuatemalaDepartment, SeismicFault, EmergencyContact, BackpackItem } from '../types';

export const GUATEMALA_DEPARTMENTS: GuatemalaDepartment[] = [
  { name: 'Guatemala (Capital)', lat: 14.6349, lng: -90.5069, capital: 'Ciudad de Guatemala', riskZone: 'Zona 4 (Riesgo Muy Alto)' },
  { name: 'Sacatepéquez', lat: 14.5586, lng: -90.7295, capital: 'Antigua Guatemala', riskZone: 'Zona 4 (Riesgo Muy Alto)' },
  { name: 'Chimaltenango', lat: 14.6611, lng: -90.8208, capital: 'Chimaltenango', riskZone: 'Zona 4 (Riesgo Muy Alto)' },
  { name: 'Escuintla', lat: 14.3009, lng: -90.7850, capital: 'Escuintla', riskZone: 'Zona 4 (Riesgo Muy Alto)' },
  { name: 'Santa Rosa', lat: 14.2811, lng: -90.3017, capital: 'Cuilapa', riskZone: 'Zona 4 (Riesgo Muy Alto)' },
  { name: 'San Marcos', lat: 14.9639, lng: -91.7944, capital: 'San Marcos', riskZone: 'Zona 4 (Riesgo Muy Alto)' },
  { name: 'Quetzaltenango', lat: 14.8347, lng: -91.5181, capital: 'Quetzaltenango (Xela)', riskZone: 'Zona 4 (Riesgo Muy Alto)' },
  { name: 'Suchitepéquez', lat: 14.5342, lng: -91.5033, capital: 'Mazatenango', riskZone: 'Zona 4 (Riesgo Muy Alto)' },
  { name: 'Retalhuleu', lat: 14.5361, lng: -91.6778, capital: 'Retalhuleu', riskZone: 'Zona 4 (Riesgo Muy Alto)' },
  { name: 'Sololá', lat: 14.7739, lng: -91.1833, capital: 'Sololá', riskZone: 'Zona 4 (Riesgo Muy Alto)' },
  { name: 'Totonicapán', lat: 14.9108, lng: -91.3611, capital: 'Totonicapán', riskZone: 'Zona 4 (Riesgo Muy Alto)' },
  { name: 'Huehuetenango', lat: 15.3197, lng: -91.4708, capital: 'Huehuetenango', riskZone: 'Zona 4 (Riesgo Muy Alto)' },
  { name: 'Quiché', lat: 15.0306, lng: -91.1486, capital: 'Santa Cruz del Quiché', riskZone: 'Zona 4 (Riesgo Muy Alto)' },
  { name: 'Baja Verapaz', lat: 15.1042, lng: -90.3167, capital: 'Salamá', riskZone: 'Zona 4 (Riesgo Muy Alto)' },
  { name: 'Alta Verapaz', lat: 15.4714, lng: -90.3794, capital: 'Cobán', riskZone: 'Zona 3 (Riesgo Alto)' },
  { name: 'El Progreso', lat: 14.8653, lng: -90.0194, capital: 'Guastatoya', riskZone: 'Zona 4 (Riesgo Muy Alto)' },
  { name: 'Izabal', lat: 15.7278, lng: -88.5944, capital: 'Puerto Barrios', riskZone: 'Zona 4 (Riesgo Muy Alto)' },
  { name: 'Zacapa', lat: 14.9722, lng: -89.5306, capital: 'Zacapa', riskZone: 'Zona 4 (Riesgo Muy Alto)' },
  { name: 'Chiquimula', lat: 14.7981, lng: -89.5458, capital: 'Chiquimula', riskZone: 'Zona 3 (Riesgo Alto)' },
  { name: 'Jalapa', lat: 14.6347, lng: -89.9889, capital: 'Jalapa', riskZone: 'Zona 4 (Riesgo Muy Alto)' },
  { name: 'Jutiapa', lat: 14.2819, lng: -89.8958, capital: 'Jutiapa', riskZone: 'Zona 4 (Riesgo Muy Alto)' },
  { name: 'Petén', lat: 16.9120, lng: -89.8970, capital: 'Flores', riskZone: 'Zona 1 (Riesgo Bajo)' }
];

export const GUATEMALA_FAULTS: SeismicFault[] = [
  {
    name: 'Falla de Motagua',
    type: 'Falla de Transformación Transcurrente Izquierda (Límite de Placas Norteamérica y Caribe)',
    description: 'Causa del destructivo terremoto del 4 de febrero de 1976 (M7.5). Atraviesa el país de este a oeste a lo largo del valle del Río Motagua.',
    coordinates: [
      [15.82, -88.45],
      [15.55, -88.95],
      [15.28, -89.45],
      [15.05, -90.05],
      [14.90, -90.65],
      [14.82, -91.20],
      [14.80, -91.75],
      [14.75, -92.20]
    ],
    color: '#ef4444',
    riskLevel: 'Muy Alto'
  },
  {
    name: 'Falla de Chixoy-Polochic',
    type: 'Falla Transcurrente',
    description: 'Sistema paralelo al norte de la Falla de Motagua, extendiéndose desde Huehuetenango, Alta y Baja Verapaz hasta el Lago de Izabal.',
    coordinates: [
      [15.88, -89.10],
      [15.65, -89.65],
      [15.42, -90.20],
      [15.35, -90.80],
      [15.38, -91.45],
      [15.45, -92.05]
    ],
    color: '#f97316',
    riskLevel: 'Muy Alto'
  },
  {
    name: 'Falla de Jalpatagua',
    type: 'Falla de Rumbo / Graben Volcánico',
    description: 'Importante estructura tectónica en el sur-oriente del país (Santa Rosa, Jutiapa), asociada a la cadena volcánica activa.',
    coordinates: [
      [14.15, -89.70],
      [14.28, -90.05],
      [14.42, -90.40],
      [14.50, -90.75]
    ],
    color: '#eab308',
    riskLevel: 'Alto'
  },
  {
    name: 'Zona de Subducción (Fosa Mesoamericana - Placa de Cocos)',
    type: 'Megatrust Subducción Oceánica',
    description: 'Donde la Placa de Cocos se hunde bajo la Placa del Caribe. Es la fuente sísmica más frecuente y capaz de generar sismos de magnitud > 7.5 y tsunamis en la costa del Pacífico.',
    coordinates: [
      [13.20, -90.20],
      [13.45, -90.90],
      [13.80, -91.70],
      [14.10, -92.50],
      [14.30, -93.10]
    ],
    color: '#dc2626',
    riskLevel: 'Muy Alto'
  }
];

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    institution: 'CONRED (Coordinadora Nacional para la Reducción de Desastres)',
    acronym: 'CONRED',
    number: '119',
    description: 'Gestión integral de riesgos, alertas oficiales y reporte de emergencias nacionales.',
    iconName: 'ShieldAlert',
    color: 'bg-amber-600'
  },
  {
    institution: 'Cuerpo de Bomberos Voluntarios de Guatemala',
    acronym: 'CBV',
    number: '122',
    description: 'Rescate, primeros auxilios, evacuación y combate de incendios a nivel nacional.',
    iconName: 'Flame',
    color: 'bg-red-600'
  },
  {
    institution: 'Cuerpo de Bomberos Municipales de la Ciudad de Guatemala',
    acronym: 'CBM',
    number: '123',
    description: 'Atención de emergencias pre-hospitalarias y rescate en el área metropolitana.',
    iconName: 'Truck',
    color: 'bg-orange-600'
  },
  {
    institution: 'Asociación Nacional de Bomberos Municipales Departamentales',
    acronym: 'ASONBOMD',
    number: '1554',
    description: 'Servicio de bomberos en departamentos y municipios del interior del país.',
    iconName: 'Ambulance',
    color: 'bg-rose-700'
  },
  {
    institution: 'Cruz Roja Guatemalteca',
    acronym: 'CRG',
    number: '125',
    description: 'Atención médica humanitaria de emergencia, ambulancias y soporte vital.',
    iconName: 'HeartPulse',
    color: 'bg-red-500'
  },
  {
    institution: 'Policía Nacional Civil',
    acronym: 'PNC',
    number: '110',
    description: 'Seguridad ciudadana, control de orden público y asistencia inmediata.',
    iconName: 'Shield',
    color: 'bg-blue-600'
  },
  {
    institution: 'INSIVUMEH (Instituto Nacional de Sismología, Vulcanología, Meteorología e Hidrología)',
    acronym: 'INSIVUMEH',
    number: '1546',
    description: 'Información técnica oficial, boletines sismológicos y vulcanológicos.',
    iconName: 'Activity',
    color: 'bg-emerald-600'
  }
];

export const INITIAL_BACKPACK_ITEMS: BackpackItem[] = [
  {
    id: 'b1',
    category: 'Agua y Alimentos',
    name: 'Agua embotellada (mínimo 2 litros por persona)',
    description: 'Para hidratación de al menos 72 horas para cada miembro familiar.',
    checked: false,
    important: true
  },
  {
    id: 'b2',
    category: 'Agua y Alimentos',
    name: 'Alimentos no perecederos y enlatados con abrelatas manual',
    description: 'Atún, frijoles, barras energéticas, galletas y leche en polvo.',
    checked: false,
    important: true
  },
  {
    id: 'b3',
    category: 'Primeros Auxilios',
    name: 'Botiquín de primeros auxilios completo',
    description: 'Gasas, vendas, alcohol, analgésicos, curitas y medicamentos recetados habituales.',
    checked: false,
    important: true
  },
  {
    id: 'b4',
    category: 'Herramientas y Comunicación',
    name: 'Radio portátil a baterías / recargable con pilas de repuesto',
    description: 'Para sintonizar emisoras de emergencia y avisos oficiales de CONRED/INSIVUMEH.',
    checked: false,
    important: true
  },
  {
    id: 'b5',
    category: 'Herramientas y Comunicación',
    name: 'Linterna LED y pilas extras',
    description: 'Evitar usar velas o fósforos tras un sismo por posibles fugas de gas.',
    checked: false,
    important: true
  },
  {
    id: 'b6',
    category: 'Herramientas y Comunicación',
    name: 'Silbato de emergencia',
    description: 'Vital para pedir auxilio sonoro si se queda atrapado bajo escombros.',
    checked: false,
    important: true
  },
  {
    id: 'b7',
    category: 'Herramientas y Comunicación',
    name: 'Batería externa cargada (Power Bank) para celular y cables',
    description: 'Mantener comunicación de emergencia.',
    checked: false,
    important: false
  },
  {
    id: 'b8',
    category: 'Documentos y Valores',
    name: 'Copias de DPI, pasaportes, escrituras y pólizas en bolsa hermética',
    description: 'Protegidos contra agua y humedad, con una memoria USB con respaldo digital.',
    checked: false,
    important: true
  },
  {
    id: 'b9',
    category: 'Documentos y Valores',
    name: 'Efectivo en billetes pequeños y monedas (Quetzales)',
    description: 'Los cajeros automáticos y POS pueden no operar sin electricidad.',
    checked: false,
    important: true
  },
  {
    id: 'b10',
    category: 'Higiene y Ropa',
    name: 'Ropa abrigada, frazada térmica impermeable y mudada extra',
    description: 'Para protegerse de bajas temperaturas o intemperie.',
    checked: false,
    important: false
  },
  {
    id: 'b11',
    category: 'Higiene y Ropa',
    name: 'Artículos de higiene personal y mascarillas KN95/quirúrgicas',
    description: 'Papel higiénico, toallas húmedas, jabón y protección contra polvo.',
    checked: false,
    important: false
  },
  {
    id: 'b12',
    category: 'Herramientas y Comunicación',
    name: 'Navaja multiusos y cinta adhesiva para aislar',
    description: 'Para reparaciones provisionales y emergencias.',
    checked: false,
    important: false
  }
];
