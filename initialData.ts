import { FiliatoriosData, AnamnesisData, PhysicalExamData, ScalesData, RadiologyData, ImpactData, PRWEData, DASHData, ClinicalData, CRPSData } from './types';

export const initialFiliatorios: FiliatoriosData = { nombre: '', apellido: '', fechaNacimiento: '', edad: '', nacionalidad: '', estadoCivil: '', dni: '', obraSocial: '', domicilio: '', localidad: '', partido: '', telefono: '', ocupacion: '', actividadesActuales: '', deportesAnteriores: '', deportesActuales: '' };
// Fix: Added missing 'medicoTratante' property to satisfy the AnamnesisData type.
export const initialAnamnesis: AnamnesisData = { diagnosticoMedico: '', medicoTratante: '', evaluacionKinesica: '', medicoDerivador: '', fechaDerivacion: '', kinesiologo: '', fechaFractura: '', causaFractura: '', fechaAtencionMedica: '', fechaAtencionKinesica: '', lugarPrimeraAtencion: '', rx: '', traccion: '', qx: '', diasInternacion: '', osteosintesis1Tipo: '', osteosintesis1Periodo: '', inmovilizacion: '', inmovilizacion1Tipo: '', inmovilizacion1Periodo: '', osteosintesis2Tipo: '', osteosintesis2Periodo: '', inmovilizacion2Tipo: '', inmovilizacion2Periodo: '', dominancia: '', antecedentesClinicoQuirurgicos: '', medicacionDolor: '', medicacionExtra: '', menopausia: '', osteopeniaOsteoporosis: '', dmo: '', ultimaDmo: '', caidasFrecuentes: '', caidas6meses: '', tabaquismo: '', alcoholismo: '', barbituricos: '', neoplasias: '', fxHombro: '', infecciones: '', enfSNC: '', altVascular: '', diabetes: '', dsr: '', tiroidismo: '', hiperlipidemia: '', dupuytren: '', manosTranspiran: '' };
export const initialGoniometriaValue = { derecha: '', izquierda: '' };
export const initialCRPSData: CRPSData = {
    dolorAlteracionesSensitivas: { dolorDesproporcionado: false, alodinia: false, hiperalgesia: false, parestesiasDisestesias: false },
    alteracionesAutonomicasTroficas: { cambiosVasomotores: false, cambiosSudomotores: false, edemaPersistente: false, cambiosTroficosPiel: false, osteopeniaLocalizada: false },
    alteracionesMotorasFuncionales: { rigidezArticular: false, debilidadMuscular: false, tembloresDistonia: false, limitacionFuncionalProgresiva: false },
    factoresPersonalidad: { ansiedadHipervigilancia: false, rasgosDepresivos: false, catastrofizacionDolor: false, perfeccionismoAutoexigencia: false, afrontamientoPasivo: false, estresPsicosocialCronico: false }
};

export const initialPhysicalExam: PhysicalExamData = { 
    cftLesion: {
        dolorLocalizacion: { ladoCubital: false, foveaCubital: false, dorsal: false, palmar: false },
        dolorTipo: '',
        dolorDesencadenantes: '',
        chasquidoPronosupinacion: '',
        crepitacionRotacion: '',
        sensacionInestabilidad: '',
        tumefaccionRCD: '',
        testFoveaCubital: '',
        testEstresCubital: '',
        signoTeclaPiano: '',
        testPeloteoCubitoCarpiano: '',
        limitacionDolorPronosupinacion: '',
        dolorTestDesviacionCubital: '',
        fuerzaPrensionDisminuida: '',
    },
    riesgoCapsulitisAdhesiva: {
        duracionInmovilizacionSemanas: '',
        tipoInmovilizacion: '',
        posicionMunecaInmovilizacion: '',
        romPasivoLimitado: '',
        hallazgosTejidoBlando: '',
        testCompresionRadiocarpiana: '',
        evaluacionCRPS: initialCRPSData,
    },
    actitudMiembroSuperior: { hombro: '', codoAntebrazo: '', muneca: '', mano: '' }, 
    pruebasFracturaEscafoides: { dolorSupinacionResistencia: '', supinacionLimitada: '', dolorDesviacionCubital: '', dolorTabaqueraAnatomica: '' }, 
    // FIX: Changed string initializers to use `initialGoniometriaValue` object to match the `GoniometriaValue` type.
    medidas: { figuraEn8: '', estiloideo: initialGoniometriaValue, palmar: initialGoniometriaValue, mtcpf: initialGoniometriaValue }, 
    testKapandji: initialGoniometriaValue, 
    goniometria: { flexion: initialGoniometriaValue, extension: initialGoniometriaValue, inclinacionRadial: initialGoniometriaValue, inclinacionCubital: initialGoniometriaValue, supinacion: initialGoniometriaValue, pronacion: initialGoniometriaValue }, 
    dolorHombro: '', 
    movimientosHombro: { elevacionAnterior: '', geb1: '', geb2: '' }, 
    pruebasPrension: { puntaFlecha: false, pinzaFina: false, pinzaLlave: false, tablero: false, aperturaCompleta: false, garra: false, empunadura: false }, 
    inspeccion: '', 
    palpacion: '', 
    pruebasEspeciales: '' 
};
export const initialPRWEData: PRWEData = {
    dolor: { enReposo: '', movimientoRepetitivo: '', objetoPesado: '', peorMomento: '', conQueFrecuencia: '' },
    funcion: { darVueltaManija: '', cortarCarne: '', abrocharseCamisa: '', levantarseSilla: '', cargar5kg: '', usarPapelHigienico: '', cuidadoPersonal: '', tareasHogar: '', trabajo: '', tiempoLibre: '' }
};
export const initialDASHData: DASHData = {
    items: {},
    mainScore: null,
    workScore: null,
    sportsScore: null,
};
export const initialScales: ScalesData = { dolorVAS: '', dolorNocturnoSeveridad: '', dolorNocturnoFrecuencia: '', dolorDiurnoFrecuencia: '', dolorDiurnoEpisodios: '', dolorDiurnoDuracion: '', entumecimiento: '', debilidad: '', hormigueo: '', entumecimientoHormigueoNocturnoSeveridad: '', entumecimientoHormigueoNocturnoFrecuencia: '', dificultadAgarre: '', tugTest: '', prwe: initialPRWEData, dash: initialDASHData };
export const initialRadiology: RadiologyData = { studies: [], interpretation: '', inclinacionRadial: '', varianzaCubital: '', varianzaCubitalClasificacion: '', inclinacionPalmar: '', clasificacionFracturaRadioDistal: '' };
export const initialImpactData: ImpactData = {
    roja_dolor_golpe: '',
    roja_fiebre_inflamacion: '',
    amarilla_creencia_dolor: '',
    azul_trabajo_dificulta: '',
    negra_barreras_recuperacion: '',
    naranja_animo_interes: '',
    otrasConsideraciones: '',
// Fix: Corrected typo 'interpretacionProfes' to 'interpretacionProfesional' and provided an initializer to fix type error.
    interpretacionProfesional: '',
};

// Fix: Exported a combined initialClinicalData object to be used in FormPage.tsx, resolving the module export error.
export const initialClinicalData: ClinicalData = {
    filiatorios: initialFiliatorios,
    anamnesis: initialAnamnesis,
    physicalExam: initialPhysicalExam,
    radiology: initialRadiology,
    scales: initialScales,
    impact: initialImpactData,
};