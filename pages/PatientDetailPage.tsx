import React, { useEffect, useState, useRef } from 'react';
import { getPatientDetails, updateCIFProfile, updateHypothesisComparison } from '../services/db';
import { Patient, CIFProfile, HypothesisComparison, ImpactData, GoniometriaValue, PhysicalExamData, ClinicalData } from '../types';
import { ChevronLeftIcon, FileDownIcon, LoaderIcon, SparklesIcon, BrainCircuitIcon, PlusCircleIcon } from '../components/IconComponents';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { generateCIFProfile, generateHypothesisComparison } from '../services/ai';
import { initialPhysicalExam, initialRadiology, initialScales, initialImpactData } from '../initialData';

interface PatientDetailPageProps {
    patientId: string;
    onNavigate: (page: 'history' | 'form', options?: { initialData?: ClinicalData }) => void;
}

const DetailItem: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
    value || value === 0 ? <p className="text-sm"><strong className="font-medium text-slate-600">{label}:</strong> <span className="text-slate-900">{value}</span></p> : null
);

const CIFProfileDisplay: React.FC<{ profile: CIFProfile }> = ({ profile }) => (
    <div className="space-y-4 text-sm">
        {profile.funciones_estructuras?.length > 0 && (
            <div>
                <h5 className="font-medium text-slate-600">Funciones y Estructuras Corporales</h5>
                <table className="mt-1 w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b">
                            <th className="py-2 pr-2 font-semibold text-slate-700">Código</th>
                            <th className="py-2 px-2 font-semibold text-slate-700">Descripción</th>
                            <th className="py-2 pl-2 font-semibold text-slate-700 text-right">Calificador</th>
                        </tr>
                    </thead>
                    <tbody>
                        {profile.funciones_estructuras.map((item, i) => (
                            <tr key={i} className="border-b border-slate-100">
                                <td className="py-2 pr-2 font-mono text-xs text-slate-800">{item.codigo}</td>
                                <td className="py-2 px-2 text-slate-800">{item.descripcion}</td>
                                <td className="py-2 pl-2 text-right font-medium text-slate-800">{item.calificador.toString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
        {profile.actividad_participacion?.length > 0 && (
            <div>
                <h5 className="font-medium text-slate-600">Actividad y Participación</h5>
                <table className="mt-1 w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b">
                            <th className="py-2 pr-2 font-semibold text-slate-700">Código</th>
                            <th className="py-2 px-2 font-semibold text-slate-700">Descripción</th>
                            <th className="py-2 pl-2 font-semibold text-slate-700 text-right">Calificador</th>
                        </tr>
                    </thead>
                    <tbody>
                        {profile.actividad_participacion.map((item, i) => (
                            <tr key={i} className="border-b border-slate-100">
                                <td className="py-2 pr-2 font-mono text-xs text-slate-800">{item.codigo}</td>
                                <td className="py-2 px-2 text-slate-800">{item.descripcion}</td>
                                <td className="py-2 pl-2 text-right font-medium text-slate-800">{item.calificador.toString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
        {profile.factores_ambientales?.length > 0 && (
            <div>
                <h5 className="font-medium text-slate-600">Factores Ambientales</h5>
                <table className="mt-1 w-full text-left border-collapse">
                     <thead>
                        <tr className="border-b">
                            <th className="py-2 pr-2 font-semibold text-slate-700">Código</th>
                            <th className="py-2 px-2 font-semibold text-slate-700">Descripción</th>
                            <th className="py-2 pl-2 font-semibold text-slate-700 text-right">Calificador</th>
                        </tr>
                    </thead>
                    <tbody>
                        {profile.factores_ambientales.map((item, i) => (
                            <tr key={i} className="border-b border-slate-100">
                                <td className="py-2 pr-2 font-mono text-xs text-slate-800">{item.codigo}</td>
                                <td className="py-2 px-2 text-slate-800">{item.descripcion}</td>
                                <td className={`py-2 pl-2 text-right font-medium ${item.calificador.toString().startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>{item.calificador.toString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
        {profile.factores_personales && (
            <div>
                <h5 className="font-medium text-slate-600">Factores Personales</h5>
                <p className="mt-1 text-slate-900 bg-slate-50 p-3 rounded-md border">{profile.factores_personales}</p>
            </div>
        )}
    </div>
);

const FlagDisplaySection: React.FC<{ title: string; color: string; children: React.ReactNode }> = ({ title, color, children }) => {
    const hasContent = React.Children.toArray(children).some(child => child !== null);
    if (!hasContent) return null;

    return (
        <div className="p-3 rounded-lg border" style={{ borderColor: color, background: `${color}1A` }}>
            <h6 className="font-semibold" style={{ color: color }}>{title}</h6>
            <ul className="mt-2 space-y-1 text-sm text-slate-800">
                {children}
            </ul>
        </div>
    );
};

const FlagItem: React.FC<{ question: string; answer?: string | null }> = ({ question, answer }) => {
    if (!answer || answer === '') return null;
    
    let displayAnswer = answer;
    const translations: Record<string, string> = {
        'si': 'Sí', 'no': 'No',
        'mejorara': 'Mejorará', 'empeorara': 'Empeorará', 'no_sabe': 'No sabe',
        'poco': 'Poco', 'moderado': 'Moderado', 'mucho': 'Mucho',
        'ayuda': 'Ayuda', 'empeora': 'Empeora',
        'limita': 'Limita'
    };

    return (
        <li>
            <span className="text-slate-600">{question}:</span> <span className="font-semibold">{translations[answer] || displayAnswer}</span>
        </li>
    );
};


const FlagsDisplay: React.FC<{ impact: ImpactData }> = ({ impact }) => {
    const hasAnyFlag = Object.values(impact).some(value => value && value !== '');

    if (!hasAnyFlag) {
        return <p className="text-sm text-slate-500">No se marcaron banderas ni consideraciones para este registro.</p>;
    }
    
    return (
        <div className="space-y-3 text-sm">
            {impact.interpretacionProfesional && (
                 <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                    <h6 className="font-semibold text-indigo-800">Hipótesis del Profesional</h6>
                    <p className="mt-1 text-indigo-900">{impact.interpretacionProfesional}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FlagDisplaySection title="Banderas Rojas" color="#ef4444">
                    <FlagItem question="Inicio tras golpe/caída" answer={impact.roja_dolor_golpe} />
                    <FlagItem question="Fiebre, inflamación, debilidad repentina" answer={impact.roja_fiebre_inflamacion} />
                    <FlagItem question="Dolor empeoró en 24-48hs" answer={impact.roja_dolor_empeoro} />
                    <FlagItem question="Movilidad de mano/dedos afectada" answer={impact.roja_movilidad_mano === 'si' ? 'Sí' : impact.roja_movilidad_mano === 'no' ? 'No' : ''} />
                </FlagDisplaySection>

                <FlagDisplaySection title="Banderas Amarillas" color="#f59e0b">
                    <FlagItem question="Creencia sobre el dolor" answer={impact.amarilla_creencia_dolor} />
                    <FlagItem question="Evita actividades por miedo" answer={impact.amarilla_evita_actividades} />
                    <FlagItem question="Interferencia en vida diaria" answer={impact.amarilla_interferencia_dolor} />
                </FlagDisplaySection>

                <FlagDisplaySection title="Banderas Azules" color="#3b82f6">
                    <FlagItem question="Trabajo dificulta/influye" answer={impact.azul_trabajo_dificulta} />
                    <FlagItem question="Trabajo ayuda o empeora" answer={impact.azul_trabajo_ayuda_empeora} />
                    <FlagItem question="Apoyo laboral" answer={impact.azul_apoyo_laboral} />
                </FlagDisplaySection>

                <FlagDisplaySection title="Banderas Negras" color="#374151">
                    <FlagItem question="Trabas externas a la recuperación" answer={impact.negra_barreras_recuperacion} />
                    <FlagItem question="Barreras del sistema de salud" answer={impact.negra_barreras_sistema} />
                    <FlagItem question="Entorno familiar/social" answer={impact.negra_apoyo_entorno} />
                </FlagDisplaySection>
                
                <FlagDisplaySection title="Banderas Naranjas" color="#f97316">
                    <FlagItem question="Desánimo/pérdida de interés" answer={impact.naranja_animo_interes} />
                    <FlagItem question="Impacto en el ánimo diario" answer={impact.naranja_impacto_animo} />
                    <FlagItem question="Pensamientos de desesperanza" answer={impact.naranja_desesperanza} />
                </FlagDisplaySection>
            </div>

            {impact.otrasConsideraciones && (
                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <h6 className="font-semibold text-slate-800">Otras Consideraciones</h6>
                    <p className="mt-1 text-slate-900">{impact.otrasConsideraciones}</p>
                </div>
            )}
        </div>
    );
}

const safeToLocaleDate = (dateString?: string | null): string => {
  if (!dateString) return '';
  // Handles both ISO strings with 'T' and plain 'YYYY-MM-DD' dates
  const date = new Date(dateString.includes('T') ? dateString : `${dateString}T00:00:00`);
  if (isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatBilateralValue = (valueObj?: GoniometriaValue, unit: string = ''): string | null => {
    if (!valueObj) return null;
    const { derecha, izquierda } = valueObj;
    const d = derecha ? String(derecha).trim() : '';
    const i = izquierda ? String(izquierda).trim() : '';
    
    if (d && i) return `D: ${d}${unit} / I: ${i}${unit}`;
    if (d) return `D: ${d}${unit}`;
    if (i) return `I: ${i}${unit}`;
    return null;
};

const formatDisplayValue = (value?: string | null) => {
    if (!value) return null;
    const translations: Record<string, string> = {
        'si': 'Sí',
        'no': 'No',
        'positivo': 'Positivo',
        'negativo': 'Negativo',
    };
    return translations[value] || (value.charAt(0).toUpperCase() + value.slice(1));
};

const CFTLesionDisplay: React.FC<{ cftLesion: PhysicalExamData['cftLesion'] }> = ({ cftLesion }) => {
    if (!cftLesion) return null;

    const dolorLocalizacion = Object.entries(cftLesion.dolorLocalizacion || {})
        .filter(([, checked]) => checked)
        .map(([key]) => ({ ladoCubital: 'Lado cubital', foveaCubital: 'Fóvea cubital', dorsal: 'Dorsal', palmar: 'Palmar' }[key]))
        .join(', ');

    const items = [
        { label: 'Localización Dolor', value: dolorLocalizacion },
        { label: 'Tipo Dolor', value: formatDisplayValue(cftLesion.dolorTipo) },
        { label: 'Desencadenantes', value: cftLesion.dolorDesencadenantes },
        { label: 'Chasquido Pronosupinación', value: formatDisplayValue(cftLesion.chasquidoPronosupinacion) },
        { label: 'Crepitación en Rotación', value: formatDisplayValue(cftLesion.crepitacionRotacion) },
        { label: 'Sensación Inestabilidad', value: formatDisplayValue(cftLesion.sensacionInestabilidad) },
        { label: 'Tumefacción RCD', value: formatDisplayValue(cftLesion.tumefaccionRCD) },
        { label: 'Test Fóvea Cubital', value: formatDisplayValue(cftLesion.testFoveaCubital) },
        { label: 'Test Estrés Cubital', value: formatDisplayValue(cftLesion.testEstresCubital) },
        { label: 'Signo Tecla Piano', value: formatDisplayValue(cftLesion.signoTeclaPiano) },
        { label: 'Test Peloteo Cúbito-Carpiano', value: formatDisplayValue(cftLesion.testPeloteoCubitoCarpiano) },
        { label: 'Limitación Dolorosa Pronosup.', value: formatDisplayValue(cftLesion.limitacionDolorPronosupinacion) },
        { label: 'Dolor Test Desv. Cubital', value: formatDisplayValue(cftLesion.dolorTestDesviacionCubital) },
        { label: 'Fuerza Prensión Disminuida', value: formatDisplayValue(cftLesion.fuerzaPrensionDisminuida) },
    ];
    
    const validItems = items.filter(item => item.value);

    if (validItems.length === 0) return null;

    return (
        <div>
            <h5 className="font-semibold text-slate-600 mt-3 mb-1">Lesión CFCT</h5>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {validItems.map(item => <DetailItem key={item.label} label={item.label} value={item.value} />)}
            </div>
        </div>
    );
};

const CapsulitisRiskDisplay: React.FC<{ data: PhysicalExamData['riesgoCapsulitisAdhesiva'] }> = ({ data }) => {
    if (!data) return null;

    const crpsRiskFactorsMap = {
        manosTranspiran: 'Manos transpiran',
        tiroidismo: 'Tiroidismo',
        dupuytren: 'Dupuytren',
        hiperlipidemia: 'Hiperlipidemia',
        altVascular: 'Alteración/Qx vascular',
    };
    const selectedCrpsSigns = Object.entries(data.signosCRPS || {})
        .filter(([, checked]) => checked)
        .map(([key]) => crpsRiskFactorsMap[key as keyof typeof crpsRiskFactorsMap])
        .join(', ');

    const items = [
        { label: 'Duración Inmovilización', value: data.duracionInmovilizacionSemanas ? `${data.duracionInmovilizacionSemanas} semanas` : null },
        { label: 'Tipo Inmovilización', value: data.tipoInmovilizacion },
        { label: 'Posición Muñeca', value: data.posicionMunecaInmovilizacion },
        { label: 'Limitación ROM Pasivo', value: formatDisplayValue(data.romPasivoLimitado) },
        { label: 'Test Compresión Radiocarpiana', value: formatDisplayValue(data.testCompresionRadiocarpiana) },
        { label: 'Factores de Riesgo/Signos CRPS', value: selectedCrpsSigns || null },
        { label: 'Hallazgos Tejido Blando', value: data.hallazgosTejidoBlando },
    ];

    const validItems = items.filter(item => item.value);

    if (validItems.length === 0) return null;

    return (
        <div>
            <h5 className="font-semibold text-slate-600 mt-3 mb-1">Riesgo Capsulitis / Rigidez</h5>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {validItems.map(item => <DetailItem key={item.label} label={item.label} value={item.value} />)}
            </div>
        </div>
    );
};


const PatientDetailPage: React.FC<PatientDetailPageProps> = ({ patientId, onNavigate }) => {
    const [patient, setPatient] = useState<Patient | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPrinting, setIsPrinting] = useState(false);
    const [cifLoadingRecordId, setCifLoadingRecordId] = useState<number | null>(null);
    const [comparisonLoadingId, setComparisonLoadingId] = useState<number | null>(null);
    const [hypothesisInputs, setHypothesisInputs] = useState<Record<number, string>>({});
    const printRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const loadPatient = async () => {
            setIsLoading(true);
            try {
                const details = await getPatientDetails(patientId);
                if (details) {
                    setPatient(details);
                    const initialInputs: Record<number, string> = {};
                    details.clinicalRecords.forEach((record: any) => {
                        if (record.hypothesisComparison) {
                            initialInputs[record.id] = record.hypothesisComparison.hipotesis_profesional;
                        } else if (record.impact?.interpretacionProfesional) {
                            initialInputs[record.id] = record.impact.interpretacionProfesional;
                        } else {
                            initialInputs[record.id] = '';
                        }
                    });
                    setHypothesisInputs(initialInputs);
                }
            } catch (error) {
                console.error("Failed to load patient details:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadPatient();
    }, [patientId]);

    const handleHypothesisChange = (recordId: number, value: string) => {
        setHypothesisInputs(prev => ({ ...prev, [recordId]: value }));
    };

    const handleCreateNewRecord = () => {
        if (!patient || patient.clinicalRecords.length === 0) return;

        const latestRecord = patient.clinicalRecords[0];

        const initialDataForNewForm: ClinicalData = {
            filiatorios: patient.filiatorios,
            anamnesis: latestRecord.anamnesis,
            // Reset the rest
            physicalExam: initialPhysicalExam,
            radiology: initialRadiology,
            scales: initialScales,
            impact: initialImpactData,
        };

        onNavigate('form', { initialData: initialDataForNewForm });
    };

    const handleGenerateComparison = async (recordId: number) => {
        if (!patient || !hypothesisInputs[recordId]?.trim()) {
            alert("Por favor, ingrese una hipótesis clínica.");
            return;
        }
        setComparisonLoadingId(recordId);
        const record = patient.clinicalRecords.find(r => r.id === recordId);
        const professionalHypothesis = hypothesisInputs[recordId];

        if (record) {
            try {
                const comparison = await generateHypothesisComparison(record, patient, professionalHypothesis);
                if (comparison) {
                    await updateHypothesisComparison(recordId, comparison);
                    setPatient(prevPatient => {
                        if (!prevPatient) return null;
                        const updatedRecords = prevPatient.clinicalRecords.map(r =>
                            r.id === recordId ? { ...r, hypothesisComparison: comparison } : r
                        );
                        return { ...prevPatient, clinicalRecords: updatedRecords };
                    });
                } else {
                    alert("La IA no pudo generar una comparación con los datos proporcionados.");
                }
            } catch (error) {
                console.error("Error generating comparison:", error);
                alert("Hubo un error al generar la comparación. Por favor, intente de nuevo.");
            }
        }
        setComparisonLoadingId(null);
    };

    const handleGenerateCIF = async (recordId: number) => {
        if (!patient) return;
        setCifLoadingRecordId(recordId);
        const record = patient.clinicalRecords.find(r => r.id === recordId);
        if (record) {
            try {
                const profile = await generateCIFProfile(record, patient);
                if (profile) {
                    await updateCIFProfile(recordId, profile);
                    setPatient(prevPatient => {
                        if (!prevPatient) return null;
                        const updatedRecords = prevPatient.clinicalRecords.map(r =>
                            r.id === recordId ? { ...r, cifProfile: profile } : r
                        );
                        return { ...prevPatient, clinicalRecords: updatedRecords };
                    });
                } else {
                     alert("La IA no pudo generar un perfil CIF con los datos proporcionados.");
                }
            } catch (error) {
                console.error("Error generating CIF profile:", error);
                alert("Hubo un error al generar el perfil CIF. Por favor, intente de nuevo.");
            }
        }
        setCifLoadingRecordId(null);
    };

    const handleDownloadPdf = async () => {
        const element = printRef.current;
        if (!element || !patient) return;

        setIsPrinting(true);
        const canvas = await html2canvas(element, {
             scale: 2, 
             useCORS: true,
             logging: false,
        });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;
        const widthInPdf = pdfWidth - 20; // with margin
        const heightInPdf = widthInPdf / ratio;

        let position = 0;
        let remainingHeight = imgHeight * (widthInPdf / imgWidth);

        pdf.addImage(imgData, 'PNG', 10, 10, widthInPdf, heightInPdf);
        remainingHeight -= (pdfHeight - 20);

        while (remainingHeight > 0) {
            position -= (pdfHeight - 20);
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 10, position, widthInPdf, heightInPdf);
            remainingHeight -= (pdfHeight - 20);
        }

        pdf.save(`Ficha_${patient.filiatorios.apellido}_${patient.filiatorios.dni}.pdf`);
        setIsPrinting(false);
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><LoaderIcon /><span className="ml-4 text-slate-500">Cargando datos del paciente...</span></div>;
    }

    if (!patient) {
        return <div className="text-center py-10">No se encontraron datos para el paciente.</div>;
    }
    
    const coincidenceStyles = {
        alta: 'bg-green-100 text-green-800',
        parcial: 'bg-yellow-100 text-yellow-800',
        baja: 'bg-red-100 text-red-800',
    };


    return (
        <div className="animate-fadeIn space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <button
                    onClick={() => onNavigate('history')}
                    className="inline-flex items-center gap-1 px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50"
                >
                    <ChevronLeftIcon />
                    Volver al Historial
                </button>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCreateNewRecord}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <PlusCircleIcon />
                        Crear Nuevo Registro
                    </button>
                    <button
                        onClick={handleDownloadPdf}
                        disabled={isPrinting}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                        {isPrinting ? <LoaderIcon /> : <FileDownIcon />}
                        {isPrinting ? 'Generando PDF...' : 'Descargar como PDF'}
                    </button>
                </div>
            </div>

            <div ref={printRef} className="p-4 sm:p-0">
                <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200/80">
                    <h1 className="text-3xl font-bold text-slate-900">{patient.filiatorios.nombre} {patient.filiatorios.apellido}</h1>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2">
                        <DetailItem label="DNI" value={patient.filiatorios.dni} />
                        <DetailItem label="Edad" value={patient.filiatorios.edad} />
                        <DetailItem label="Estado Civil" value={patient.filiatorios.estadoCivil} />
                        <DetailItem label="Teléfono" value={patient.filiatorios.telefono} />
                        <DetailItem label="Obra Social" value={patient.filiatorios.obraSocial} />
                        <DetailItem label="Ocupación" value={patient.filiatorios.ocupacion} />
                        <DetailItem label="Actividades Actuales" value={patient.filiatorios.actividadesActuales} />
                        <DetailItem label="Domicilio" value={patient.filiatorios.domicilio} />
                        <DetailItem label="Localidad" value={`${patient.filiatorios.localidad}${patient.filiatorios.partido ? `, ${patient.filiatorios.partido}` : ''}`} />
                    </div>
                </div>

                <div className="mt-6 space-y-6">
                    <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-blue-200 pb-2">Registros Clínicos</h2>
                    {patient.clinicalRecords.map((record, index) => {
                         let prweScores = null;
                         if (record.scales?.prwe) {
                             const { dolor, funcion } = record.scales.prwe;
                             const parse = (val: string | number) => parseInt(String(val), 10) || 0;
                             const dolorValues = Object.values(dolor);
                             const funcionValues = Object.values(funcion);
                             
                             if (dolorValues.some(v => v && String(v) !== '') || funcionValues.some(v => v && String(v) !== '')) {
                                 const totalDolor = dolorValues.reduce((sum, val) => sum + parse(val), 0);
                                 const totalFuncionRaw = funcionValues.reduce((sum, val) => sum + parse(val), 0);
                                 const totalFuncion = totalFuncionRaw / 2;
                                 const prweGlobal = totalDolor + totalFuncion;
                                 prweScores = { totalDolor, totalFuncion, prweGlobal };
                             }
                         }

                        const { dash } = record.scales;
                        const hasDashScores = dash && dash.mainScore !== null;
                        
                        const clasificacionFracturaTexto = {
                            'estable': 'Estable',
                            'potencialmente_inestable': 'Potencialmente Inestable',
                            'inestable': 'Inestable',
                        }[record.radiology?.clasificacionFracturaRadioDistal || ''];


                        return (
                        <details key={record.id} className="bg-white rounded-xl shadow-md border border-slate-200/80 overflow-hidden" open={index === 0}>
                            <summary className="px-6 py-4 font-semibold text-lg text-slate-800 cursor-pointer hover:bg-slate-50 flex justify-between items-center">
                                <span>Ficha del {safeToLocaleDate(record.createdAt)} <span className="font-normal text-base text-blue-600 ml-2">- Sesión {patient.clinicalRecords.length - index}</span></span>
                                <span className="text-sm text-blue-600 group-open:hidden">Expandir</span>
                            </summary>
                            <div className="px-6 pb-6 pt-2 border-t border-slate-200 space-y-6">
                                <div>
                                    <h3 className="font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-md inline-block mb-3">Resumen y Análisis de IA</h3>
                                    <p className="text-slate-100 bg-slate-800 whitespace-pre-wrap font-mono text-sm p-4 rounded-lg border">{record.summary}</p>
                                </div>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
                                    <div>
                                        <h4 className="font-semibold text-slate-700 mb-2">Anamnesis</h4>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                          <DetailItem label="Dx. Médico" value={record.anamnesis?.diagnosticoMedico} />
                                          <DetailItem label="Causa Lesión" value={record.anamnesis?.causaFractura} />
                                          <DetailItem label="Fecha Lesión" value={safeToLocaleDate(record.anamnesis?.fechaFractura)} />
                                          <DetailItem label="At. Médica" value={safeToLocaleDate(record.anamnesis?.fechaAtencionMedica)} />
                                          <DetailItem label="At. Kinésica" value={safeToLocaleDate(record.anamnesis?.fechaAtencionKinesica)} />
                                          <DetailItem label="Dominancia" value={record.anamnesis?.dominancia} />
                                          <DetailItem label="Cirugía" value={formatDisplayValue(record.anamnesis?.qx)} />
                                          <DetailItem label="Osteosíntesis" value={record.anamnesis?.osteosintesis1Tipo} />
                                          <DetailItem label="Inmovilización" value={formatDisplayValue(record.anamnesis?.inmovilizacion)} />
                                          <DetailItem label="Tipo Inmovilización" value={record.anamnesis?.inmovilizacion1Tipo} />
                                          <DetailItem label="Tiempo Inmovilización" value={record.anamnesis?.inmovilizacion1Periodo} />
                                          <DetailItem label="Tabaquismo" value={formatDisplayValue(record.anamnesis?.tabaquismo)} />
                                          <DetailItem label="Menopausia" value={formatDisplayValue(record.anamnesis?.menopausia)} />
                                          <DetailItem label="Osteoporosis/penia" value={formatDisplayValue(record.anamnesis?.osteopeniaOsteoporosis)} />
                                          <DetailItem label="DMO" value={formatDisplayValue(record.anamnesis?.dmo)} />
                                          <DetailItem label="Última DMO" value={safeToLocaleDate(record.anamnesis?.ultimaDmo)} />
                                          <DetailItem label="Caídas Frecuentes" value={formatDisplayValue(record.anamnesis?.caidasFrecuentes)} />
                                          <DetailItem label="Nº Caídas (6m)" value={record.anamnesis?.caidas6meses} />
                                          <DetailItem label="Medicación Dolor" value={record.anamnesis?.medicacionDolor} />
                                          <DetailItem label="Otra Medicación" value={record.anamnesis?.medicacionExtra} />
                                        </div>
                                    </div>
                                     <div>
                                        <h4 className="font-semibold text-slate-700 mb-2">Examen Físico y Escalas</h4>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                          <DetailItem label="Dolor Actual (EVA)" value={record.scales?.dolorVAS ? `${record.scales.dolorVAS} / 10` : ''} />
                                          <DetailItem label="Medida en 8" value={record.physicalExam?.medidas?.figuraEn8 ? `${record.physicalExam.medidas.figuraEn8} cm` : ''} />
                                          <DetailItem label="Kapandji" value={formatBilateralValue(record.physicalExam?.testKapandji, '/10')} />
                                          <DetailItem label="Ø Estiloideo" value={formatBilateralValue(record.physicalExam?.medidas?.estiloideo, ' cm')} />
                                          <DetailItem label="Ø Palmar" value={formatBilateralValue(record.physicalExam?.medidas?.palmar, ' cm')} />
                                          <DetailItem label="Ø MTCPF" value={formatBilateralValue(record.physicalExam?.medidas?.mtcpf, ' cm')} />
                                          <DetailItem label="Flexión" value={formatBilateralValue(record.physicalExam?.goniometria?.flexion, '°')} />
                                          <DetailItem label="Extensión" value={formatBilateralValue(record.physicalExam?.goniometria?.extension, '°')} />
                                          <DetailItem label="Desv. Radial" value={formatBilateralValue(record.physicalExam?.goniometria?.inclinacionRadial, '°')} />
                                          <DetailItem label="Desv. Cubital" value={formatBilateralValue(record.physicalExam?.goniometria?.inclinacionCubital, '°')} />
                                          <DetailItem label="Supinación" value={formatBilateralValue(record.physicalExam?.goniometria?.supinacion, '°')} />
                                          <DetailItem label="Pronación" value={formatBilateralValue(record.physicalExam?.goniometria?.pronacion, '°')} />
                                          <DetailItem label="Dolor Supinación Res." value={formatDisplayValue(record.physicalExam?.pruebasFracturaEscafoides?.dolorSupinacionResistencia)} />
                                          <DetailItem label="Supinación < 10%" value={formatDisplayValue(record.physicalExam?.pruebasFracturaEscafoides?.supinacionLimitada)} />
                                          <DetailItem label="Dolor Desv. Cubital" value={formatDisplayValue(record.physicalExam?.pruebasFracturaEscafoides?.dolorDesviacionCubital)} />
                                          <DetailItem label="Dolor Tabaquera Anat." value={formatDisplayValue(record.physicalExam?.pruebasFracturaEscafoides?.dolorTabaqueraAnatomica)} />
                                          <DetailItem label="TUG Test" value={record.scales?.tugTest ? `${record.scales.tugTest} segs` : ''} />
                                          {prweScores && (
                                              <>
                                                  <DetailItem label="PRWE Global" value={`${prweScores.prweGlobal} / 100`} />
                                                  <DetailItem label="PRWE Dolor" value={`${prweScores.totalDolor} / 50`} />
                                                  <DetailItem label="PRWE Función" value={`${prweScores.totalFuncion} / 50`} />
                                              </>
                                          )}
                                          {hasDashScores && (
                                                <>
                                                    <DetailItem label="DASH Global" value={`${dash.mainScore} / 100`} />
                                                    {dash.workScore !== null && <DetailItem label="DASH Trabajo" value={`${dash.workScore} / 100`} />}
                                                    {dash.sportsScore !== null && <DetailItem label="DASH Deportes" value={`${dash.sportsScore} / 100`} />}
                                                </>
                                            )}
                                        </div>
                                        {record.physicalExam?.cftLesion && <CFTLesionDisplay cftLesion={record.physicalExam.cftLesion} />}
                                        {record.physicalExam?.riesgoCapsulitisAdhesiva && <CapsulitisRiskDisplay data={record.physicalExam.riesgoCapsulitisAdhesiva} />}
                                    </div>
                                </div>
                                {record.radiology && (record.radiology.studies?.length > 0 || record.radiology.inclinacionRadial) && (
                                    <div className="mt-6">
                                        <h3 className="font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-md inline-block mb-3">Estudios Complementarios</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                                    {record.radiology.studies && record.radiology.studies.length > 0 && 
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                            {record.radiology.studies.map((study, studyIndex) => (
                                                                <a href={study.base64} target="_blank" rel="noopener noreferrer" key={studyIndex} className="group">
                                                                    <img src={study.base64} alt={`Estudio ${studyIndex + 1}`} className="rounded-lg border border-slate-200 w-full h-28 object-cover group-hover:opacity-80 transition-opacity" />
                                                                    <p className="text-xs text-slate-600 mt-1 truncate" title={study.name}>{study.name}</p>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    }
                                                    <div className={!record.radiology.studies || record.radiology.studies.length === 0 ? 'md:col-span-2' : ''}>
                                                        <div className="space-y-1 mb-3 bg-slate-50 p-3 rounded-md border">
                                                            <DetailItem label="Inclinación Radial" value={record.radiology?.inclinacionRadial ? `${record.radiology.inclinacionRadial}°` : ''} />
                                                            <DetailItem
                                                                label="Varianza Cubital"
                                                                value={
                                                                    (record.radiology?.varianzaCubital || record.radiology?.varianzaCubitalClasificacion)
                                                                    ? [
                                                                        record.radiology.varianzaCubital ? `${record.radiology.varianzaCubital} mm` : '',
                                                                        record.radiology.varianzaCubitalClasificacion ? `(${record.radiology.varianzaCubitalClasificacion.charAt(0).toUpperCase() + record.radiology.varianzaCubitalClasificacion.slice(1)})` : ''
                                                                      ].filter(Boolean).join(' ')
                                                                    : null
                                                                }
                                                            />
                                                            <DetailItem label="Inclinación Palmar" value={record.radiology?.inclinacionPalmar ? `${record.radiology.inclinacionPalmar}°` : ''} />
                                                            <DetailItem label="Clasificación de Fractura" value={clasificacionFracturaTexto} />
                                                        </div>
                                                        {record.radiology.interpretation && (
                                                            <>
                                                                <h5 className="font-medium text-sm text-slate-600">Interpretación de IA</h5>
                                                                <p className="text-slate-900 whitespace-pre-wrap font-sans bg-slate-50 p-3 mt-1 rounded-lg border text-sm">{record.radiology.interpretation}</p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {record.impact && (
                                    <div className="mt-6">
                                        <h3 className="font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-md inline-block mb-3">Impacto y Banderas</h3>
                                        <FlagsDisplay impact={record.impact} />
                                    </div>
                                )}
                                <div className="mt-6">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-md inline-block">Perfil CIF</h3>
                                        <button
                                            onClick={() => handleGenerateCIF(record.id)}
                                            disabled={cifLoadingRecordId === record.id}
                                            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
                                        >
                                            {cifLoadingRecordId === record.id ? <LoaderIcon /> : <SparklesIcon />}
                                            {cifLoadingRecordId === record.id ? 'Generando...' : (record.cifProfile ? 'Regenerar Perfil' : 'Generar Perfil con IA')}
                                        </button>
                                    </div>
                                    {record.cifProfile ? (
                                        <div className="mt-2 animate-fadeIn">
                                            <CIFProfileDisplay profile={record.cifProfile} />
                                        </div>
                                    ) : (
                                       cifLoadingRecordId !== record.id && <p className="text-sm text-slate-500 mt-2">Aún no se ha generado un perfil CIF para este registro.</p>
                                    )}
                                </div>
                                
                                <div className="mt-6 bg-slate-50/80 p-4 sm:p-6 rounded-lg border border-slate-200/80">
                                    <div className="flex items-center gap-3 mb-4">
                                        <BrainCircuitIcon className="w-8 h-8 text-indigo-600" />
                                        <div>
                                            <h3 className="text-lg font-bold text-indigo-800">Asistente de Razonamiento Clínico</h3>
                                            <p className="text-sm text-slate-500">Compare su hipótesis con el análisis de la IA.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor={`hypothesis-${record.id}`} className="block text-sm font-medium text-slate-700">Su Hipótesis Clínica</label>
                                            <textarea
                                                id={`hypothesis-${record.id}`}
                                                rows={3}
                                                value={hypothesisInputs[record.id] || ''}
                                                onChange={(e) => handleHypothesisChange(record.id, e.target.value)}
                                                placeholder="Ej: 'Tendinopatía de De Quervain con componente de sensibilización central...'"
                                                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleGenerateComparison(record.id)}
                                            disabled={comparisonLoadingId === record.id || !hypothesisInputs[record.id]?.trim()}
                                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                        >
                                            {comparisonLoadingId === record.id ? <LoaderIcon /> : <SparklesIcon />}
                                            {comparisonLoadingId === record.id ? 'Analizando...' : 'Comparar con IA'}
                                        </button>
                                    </div>
                                    
                                    {record.hypothesisComparison && comparisonLoadingId !== record.id && (
                                        <div className="mt-6 space-y-4 animate-fadeIn">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-semibold text-slate-800">Resultado de la Comparación</h4>
                                                <span className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${coincidenceStyles[record.hypothesisComparison.coincidencia]}`}>{record.hypothesisComparison.coincidencia}</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="bg-white p-3 border rounded-lg">
                                                    <h5 className="font-medium text-sm text-slate-600">Su Hipótesis</h5>
                                                    <p className="text-sm text-slate-800 mt-1">"{record.hypothesisComparison.hipotesis_profesional}"</p>
                                                </div>
                                                <div className="bg-white p-3 border rounded-lg">
                                                    <h5 className="font-medium text-sm text-slate-600">Interpretación de IA</h5>
                                                    <p className="text-sm text-slate-800 mt-1">"{record.hypothesisComparison.interpretacion_ia}"</p>
                                                </div>
                                            </div>
                                            <div>
                                                 <h5 className="font-medium text-sm text-slate-600 mb-2">Detalles del Análisis</h5>
                                                 <div className="space-y-3">
                                                    {record.hypothesisComparison.puntos_comunes.length > 0 && <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                                        <h6 className="font-semibold text-green-800">Puntos en Común</h6>
                                                        <ul className="list-disc list-inside mt-1 text-sm text-green-900 space-y-1">
                                                            {record.hypothesisComparison.puntos_comunes.map((point, i) => <li key={i}>{point}</li>)}
                                                        </ul>
                                                    </div>}
                                                    {record.hypothesisComparison.diferencias.length > 0 && <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                                        <h6 className="font-semibold text-yellow-800">Diferencias Relevantes</h6>
                                                         <ul className="list-disc list-inside mt-1 text-sm text-yellow-900 space-y-1">
                                                            {record.hypothesisComparison.diferencias.map((point, i) => <li key={i}>{point}</li>)}
                                                        </ul>
                                                    </div>}
                                                 </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>
                        </details>
                    )})}
                </div>
            </div>
        </div>
    );
};

export default PatientDetailPage;