export interface FiliatoriosData {
    nombre: string;
    apellido: string;
    fechaNacimiento: string;
    edad: string;
    nacionalidad: string;
    estadoCivil: string;
    dni: string;
    obraSocial: string;
    domicilio: string;
    localidad: string;
    partido: string;
    telefono: string;
    ocupacion: string;
    actividadesActuales: string;
    deportesAnteriores: string;
    deportesActuales: string;
}

export interface AnamnesisData {
    diagnosticoMedico: string;
    medicoTratante: string;
    evaluacionKinesica: string;
    medicoDerivador: string;
    fechaDerivacion: string;
    kinesiologo: string;
    fechaFractura: string;
    causaFractura: string;
    fechaAtencionMedica: string;
    fechaAtencionKinesica: string;
    lugarPrimeraAtencion: string;
    rx: '' | 'si' | 'no';
    traccion: '' | 'si' | 'no';
    qx: '' | 'si' | 'no';
    diasInternacion: string;
    osteosintesis1Tipo: string;
    osteosintesis1Periodo: string;
    inmovilizacion: '' | 'si' | 'no';
    inmovilizacion1Tipo: string;
    inmovilizacion1Periodo: string;
    osteosintesis2Tipo: string;
    osteosintesis2Periodo: string;
    inmovilizacion2Tipo: string;
    inmovilizacion2Periodo: string;
    dominancia: '' | 'Derecha' | 'Izquierda' | 'Ambidiestro';
    antecedentesClinicoQuirurgicos: string;
    medicacionDolor: string;
    medicacionExtra: string;
    menopausia: '' | 'si' | 'no';
    osteopeniaOsteoporosis: '' | 'si' | 'no';
    dmo: '' | 'si' | 'no';
    ultimaDmo: string;
    caidasFrecuentes: '' | 'si' | 'no';
    caidas6meses: string;
    tabaquismo: '' | 'si' | 'no';
    alcoholismo: '' | 'si' | 'no';
    barbituricos: '' | 'si' | 'no';
    neoplasias: '' | 'si' | 'no';
    fxHombro: '' | 'si' | 'no';
    infecciones: '' | 'si' | 'no';
    enfSNC: '' | 'si' | 'no';
    altVascular: '' | 'si' | 'no';
    diabetes: '' | 'si' | 'no';
    dsr: '' | 'si' | 'no';
    tiroidismo: '' | 'si' | 'no';
    hiperlipidemia: '' | 'si' | 'no';
    dupuytren: '' | 'si' | 'no';
    manosTranspiran: '' | 'si' | 'no';
}

export interface GoniometriaValue {
    derecha: string;
    izquierda: string;
}

export interface CRPSData {
    dolorAlteracionesSensitivas: {
        dolorDesproporcionado: boolean;
        alodinia: boolean;
        hiperalgesia: boolean;
        parestesiasDisestesias: boolean;
    };
    alteracionesAutonomicasTroficas: {
        cambiosVasomotores: boolean;
        cambiosSudomotores: boolean;
        edemaPersistente: boolean;
        cambiosTroficosPiel: boolean;
        osteopeniaLocalizada: boolean;
    };
    alteracionesMotorasFuncionales: {
        rigidezArticular: boolean;
        debilidadMuscular: boolean;
        tembloresDistonia: boolean;
        limitacionFuncionalProgresiva: boolean;
    };
    factoresPersonalidad: {
        ansiedadHipervigilancia: boolean;
        rasgosDepresivos: boolean;
        catastrofizacionDolor: boolean;
        perfeccionismoAutoexigencia: boolean;
        afrontamientoPasivo: boolean;
        estresPsicosocialCronico: boolean;
    };
}


export interface PhysicalExamData {
    cftLesion: {
        dolorLocalizacion: {
            ladoCubital: boolean;
            foveaCubital: boolean;
            dorsal: boolean;
            palmar: boolean;
        };
        dolorTipo: '' | 'mecanico' | 'constante';
        dolorDesencadenantes: string;
        chasquidoPronosupinacion: '' | 'si' | 'no';
        crepitacionRotacion: '' | 'si' | 'no';
        sensacionInestabilidad: '' | 'si' | 'no';
        tumefaccionRCD: '' | 'si' | 'no';
        testFoveaCubital: '' | 'positivo' | 'negativo';
        testEstresCubital: '' | 'positivo' | 'negativo';
        signoTeclaPiano: '' | 'positivo' | 'negativo';
        testPeloteoCubitoCarpiano: '' | 'positivo' | 'negativo';
        limitacionDolorPronosupinacion: '' | 'si' | 'no';
        dolorTestDesviacionCubital: '' | 'si' | 'no';
        fuerzaPrensionDisminuida: '' | 'si' | 'no';
    };
    riesgoCapsulitisAdhesiva: {
        duracionInmovilizacionSemanas: string;
        tipoInmovilizacion: string;
        posicionMunecaInmovilizacion: string;
        romPasivoLimitado: '' | 'si' | 'no';
        hallazgosTejidoBlando: string;
        testCompresionRadiocarpiana: '' | 'positivo' | 'negativo';
        evaluacionCRPS: CRPSData;
    };
    actitudMiembroSuperior: {
        hombro: string;
        codoAntebrazo: string;
        muneca: string;
        mano: string;
    };
    pruebasFracturaEscafoides: {
        dolorSupinacionResistencia: '' | 'si' | 'no';
        supinacionLimitada: '' | 'si' | 'no';
        dolorDesviacionCubital: '' | 'si' | 'no';
        dolorTabaqueraAnatomica: '' | 'si' | 'no';
    };
    medidas: {
        figuraEn8: string;
        estiloideo: GoniometriaValue;
        palmar: GoniometriaValue;
        mtcpf: GoniometriaValue;
    };
    testKapandji: GoniometriaValue;
    goniometria: {
        flexion: GoniometriaValue;
        extension: GoniometriaValue;
        inclinacionRadial: GoniometriaValue;
        inclinacionCubital: GoniometriaValue;
        supinacion: GoniometriaValue;
        pronacion: GoniometriaValue;
    };
    dolorHombro: '' | 'si' | 'no';
    movimientosHombro: {
        elevacionAnterior: string;
        geb1: string;
        geb2: string;
    };
    pruebasPrension: {
        puntaFlecha: boolean;
        pinzaFina: boolean;
        pinzaLlave: boolean;
        tablero: boolean;
        aperturaCompleta: boolean;
        garra: boolean;
        empunadura: boolean;
    };
    inspeccion: string;
    palpacion: string;
    pruebasEspeciales: string;
}

export interface PRWEData {
    dolor: {
        enReposo: string;
        movimientoRepetitivo: string;
        objetoPesado: string;
        peorMomento: string;
        conQueFrecuencia: string;
    };
    funcion: {
        // Actividades específicas
        darVueltaManija: string;
        cortarCarne: string;
        abrocharseCamisa: string;
        levantarseSilla: string;
        cargar5kg: string;
        usarPapelHigienico: string;
        // Actividades cotidianas
        cuidadoPersonal: string;
        tareasHogar: string;
        trabajo: string;
        tiempoLibre: string;
    };
}

export interface DASHData {
    items: {
        [key: string]: string; // e.g., item1, item2, ... work1, sports1
    };
    mainScore: number | null;
    workScore: number | null;
    sportsScore: number | null;
}

export interface ScalesData {
    dolorVAS: string;
    dolorNocturnoSeveridad: string;
    dolorNocturnoFrecuencia: string;
    dolorDiurnoFrecuencia: string;
    dolorDiurnoEpisodios: string;
    dolorDiurnoDuracion: string;
    entumecimiento: string;
    debilidad: string;
    hormigueo: string;
    entumecimientoHormigueoNocturnoSeveridad: string;
    entumecimientoHormigueoNocturnoFrecuencia: string;
    dificultadAgarre: string;
    tugTest: string;
    prwe: PRWEData;
    dash: DASHData;
}

export interface StudyImage {
    name: string;
    base64: string;
    type: string;
}

export interface RadiologyData {
    studies: StudyImage[];
    interpretation: string;
    inclinacionRadial?: string;
    varianzaCubital?: string;
    varianzaCubitalClasificacion?: '' | 'neutra' | 'positiva' | 'negativa';
    inclinacionPalmar?: string;
    clasificacionFracturaRadioDistal?: '' | 'estable' | 'potencialmente_inestable' | 'inestable';
}

export interface ImpactData {
    // Station 1
    roja_dolor_golpe: '' | 'si' | 'no';
    roja_fiebre_inflamacion: '' | 'si' | 'no';
    amarilla_creencia_dolor: '' | 'mejorara' | 'empeorara' | 'no_sabe';
    azul_trabajo_dificulta: '' | 'si' | 'no';
    negra_barreras_recuperacion: '' | 'si' | 'no';
    naranja_animo_interes: '' | 'si' | 'no';

    // Station 2 (conditional)
    roja_dolor_empeoro?: '' | 'si' | 'no';
    roja_movilidad_mano?: '' | 'si' | 'no';
    amarilla_evita_actividades?: '' | 'si' | 'no';
    amarilla_interferencia_dolor?: '' | 'poco' | 'moderado' | 'mucho';
    azul_trabajo_ayuda_empeora?: '' | 'ayuda' | 'empeora';
    azul_apoyo_laboral?: '' | 'si' | 'no';
    negra_barreras_sistema?: '' | 'si' | 'no';
    negra_apoyo_entorno?: '' | 'ayuda' | 'limita';
    naranja_impacto_animo?: string;
    naranja_desesperanza?: '' | 'si' | 'no';

    otrasConsideraciones: string;
    interpretacionProfesional: string;
}


export interface ClinicalData {
    filiatorios: FiliatoriosData;
    anamnesis: AnamnesisData;
    physicalExam: PhysicalExamData;
    radiology: RadiologyData;
    scales: ScalesData;
    impact: ImpactData;
}

export interface CIFCode {
    codigo: string;
    descripcion: string;
    calificador: number | string;
}

export interface CIFProfile {
    funciones_estructuras: CIFCode[];
    actividad_participacion: CIFCode[];
    factores_ambientales: CIFCode[];
    factores_personales: string;
}

export interface HypothesisComparison {
    paciente_id: string;
    hipotesis_profesional: string;
    interpretacion_ia: string;
    coincidencia: 'alta' | 'parcial' | 'baja';
    puntos_comunes: string[];
    diferencias: string[];
}

export interface ClinicalRecord {
    id: number;
    createdAt: string;
    anamnesis: AnamnesisData;
    physicalExam: PhysicalExamData;
    scales: ScalesData;
    radiology: RadiologyData;
    impact?: ImpactData;
    summary: string;
    cifProfile?: CIFProfile;
    hypothesisComparison?: HypothesisComparison;
}

export interface ComplementaryStudy {
    id: string;
    name: string;
    date: string;
    fileData: string; // Base64 encoded file
    fileType: string; // MIME type
}

export interface Patient {
    id: string; // DNI will be used as ID
    filiatorios: FiliatoriosData;
    clinicalRecords: ClinicalRecord[];
    complementaryStudies: ComplementaryStudy[];
}

export interface Step {
    id: string;
    name: string;
}

export interface ChatMessage {
    sender: 'user' | 'bot';
    text: string | React.ReactNode;
    options?: { text: string; payload: string }[];
}