import React, { useEffect, useState, useRef } from 'react';
import { getPatientDetails, updateCIFProfile, updateHypothesisComparison, updateRecordSummary } from '../services/db';
import { Patient, CIFProfile, HypothesisComparison, ImpactData, GoniometriaValue, PhysicalExamData, ClinicalData, CRPSData, ClinicalRecord } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, FileDownIcon, LoaderIcon, SparklesIcon, BrainCircuitIcon, PlusCircleIcon, GoogleDriveIcon, JsonIcon, TrendingUpIcon } from '../components/IconComponents';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { generateCIFProfile, generateHypothesisComparison, generateSummaryForSavedRecord, generateEvolutionSummary } from '../services/ai';
import { initialPhysicalExam, initialRadiology, initialScales, initialImpactData } from '../initialData';

declare const google: any;

interface PatientDetailPageProps {
    patientId: string;
    onNavigate: (page: 'history' | 'form', options?: { initialData?: ClinicalData }) => void;
}

const TABS = [
    { id: 'analysis', name: 'Análisis IA' },
    { id: 'anamnesis', name: 'Anamnesis' },
    { id: 'exam', name: 'Ex. Físico' },
    { id: 'studies', name: 'Estudios' },
    { id: 'scales', name: 'Escalas' },
    { id: 'impact', name: 'Impacto y Banderas' },
];


// FIX: Added missing helper functions 'formatDisplayValue' and 'formatBilateralValue'.
const formatDisplayValue = (value?: string | null): string => {
    if (!value) return 'No informado';
    if (value === 'si') return 'Sí';
    if (value === 'no') return 'No';
    // for enums like 'potencialmente_inestable'
    return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

const formatBilateralValue = (value?: GoniometriaValue, unit: string = '°'): string | null => {
    if (!value) return null;
    const { derecha, izquierda } = value;
    const d = derecha ? String(derecha).trim() : '';
    const i = izquierda ? String(izquierda).trim() : '';
    if (d && i) return `D: ${d}${unit} / I: ${i}${unit}`;
    if (d) return `D: ${d}${unit}`;
    if (i) return `I: ${i}${unit}`;
    return null;
};


// Helper Display Components

const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    const processInline = (line: string): { __html: string } => {
        const processedLine = line
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-100">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
        return { __html: processedLine };
    };

    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let listItems: { content: string, type: 'ul' | 'ol' }[] = [];

    const flushList = () => {
        if (listItems.length === 0) return;
        
        const listKey = `list-${elements.length}`;
        const items = listItems.map((item, index) => (
            <li key={`${listKey}-${index}`} dangerouslySetInnerHTML={processInline(item.content)} />
        ));

        if (listItems[0].type === 'ul') {
            elements.push(<ul key={listKey} className="list-disc list-outside ml-5 space-y-1 my-2 text-slate-300">{items}</ul>);
        } else {
            elements.push(<ol key={listKey} className="list-decimal list-outside ml-5 space-y-1 my-2 text-slate-300">{items}</ol>);
        }
        
        listItems = [];
    };

    lines.forEach((line, index) => {
        const hashtagHeaderMatch = line.match(/^(#+)\s+(.*)/);
        if (hashtagHeaderMatch) {
            flushList();
            const level = hashtagHeaderMatch[1].length;
            const content = hashtagHeaderMatch[2];
            const Tag = `h4` as keyof JSX.IntrinsicElements;
            const className = `font-bold text-slate-100 mt-4 mb-2 first-of-type:mt-0 ${level === 1 ? 'text-lg' : ''}`;
            elements.push(<Tag key={index} className={className} dangerouslySetInnerHTML={processInline(content)} />);
            return;
        }

        const boldHeaderMatch = line.match(/^(?:\d+\.\s*)?\*\*(.*?)\*\*:\s*$/);
        if (boldHeaderMatch) {
            flushList();
            elements.push(<h4 key={index} className="font-bold text-slate-100 mt-4 mb-2 first-of-type:mt-0" dangerouslySetInnerHTML={processInline(line)} />);
            return;
        }

        const ulMatch = line.match(/^(\s*[-*]\s+)(.*)/);
        if (ulMatch) {
            if (listItems.length > 0 && listItems[0].type !== 'ul') flushList();
            listItems.push({ content: ulMatch[2], type: 'ul' });
            return;
        }
        
        const olMatch = line.match(/^(\s*\d+\.\s+)(.*)/);
        if (olMatch) {
            if (listItems.length > 0 && listItems[0].type !== 'ol') flushList();
            listItems.push({ content: olMatch[2], type: 'ol' });
            return;
        }

        flushList();
        if (line.trim() !== '') {
            elements.push(<p key={index} className="text-slate-300" dangerouslySetInnerHTML={processInline(line)} />);
        }
    });

    flushList(); 

    return <div className="space-y-2">{elements}</div>;
};


const DetailItem: React.FC<{ label: string; value?: string | number | null | React.ReactNode }> = ({ label, value }) => (
    value || value === 0 ? <div className="text-sm"><strong className="font-medium text-slate-600">{label}:</strong> <span className="text-slate-900">{value}</span></div> : null
);

const CIFProfileDisplay: React.FC<{ profile: CIFProfile }> = ({ profile }) => (
    <div className="space-y-4 text-sm">
        {profile.funciones_estructuras?.length > 0 && (
            <div>
                <h5 className="font-medium text-slate-600">Funciones y Estructuras Corporales</h5>
                <table className="mt-1 w-full text-left border-collapse">
                    <thead><tr className="border-b"><th className="py-2 pr-2 font-semibold text-slate-700">Código</th><th className="py-2 px-2 font-semibold text-slate-700">Descripción</th><th className="py-2 pl-2 font-semibold text-slate-700 text-right">Calificador</th></tr></thead>
                    <tbody>{profile.funciones_estructuras.map((item, i) => (<tr key={i} className="border-b border-slate-100"><td className="py-2 pr-2 font-mono text-xs text-slate-800">{item.codigo}</td><td className="py-2 px-2 text-slate-800">{item.descripcion}</td><td className="py-2 pl-2 text-right font-medium text-slate-800">{item.calificador.toString()}</td></tr>))}</tbody>
                </table>
            </div>
        )}
        {profile.actividad_participacion?.length > 0 && (
            <div>
                <h5 className="font-medium text-slate-600">Actividad y Participación</h5>
                <table className="mt-1 w-full text-left border-collapse">
                     <thead><tr className="border-b"><th className="py-2 pr-2 font-semibold text-slate-700">Código</th><th className="py-2 px-2 font-semibold text-slate-700">Descripción</th><th className="py-2 pl-2 font-semibold text-slate-700 text-right">Calificador</th></tr></thead>
                    <tbody>{profile.actividad_participacion.map((item, i) => (<tr key={i} className="border-b border-slate-100"><td className="py-2 pr-2 font-mono text-xs text-slate-800">{item.codigo}</td><td className="py-2 px-2 text-slate-800">{item.descripcion}</td><td className="py-2 pl-2 text-right font-medium text-slate-800">{item.calificador.toString()}</td></tr>))}</tbody>
                </table>
            </div>
        )}
        {profile.factores_ambientales?.length > 0 && (
            <div>
                <h5 className="font-medium text-slate-600">Factores Ambientales</h5>
                <table className="mt-1 w-full text-left border-collapse">
                     <thead><tr className="border-b"><th className="py-2 pr-2 font-semibold text-slate-700">Código</th><th className="py-2 px-2 font-semibold text-slate-700">Descripción</th><th className="py-2 pl-2 font-semibold text-slate-700 text-right">Calificador</th></tr></thead>
                    <tbody>{profile.factores_ambientales.map((item, i) => (<tr key={i} className="border-b border-slate-100"><td className="py-2 pr-2 font-mono text-xs text-slate-800">{item.codigo}</td><td className="py-2 px-2 text-slate-800">{item.descripcion}</td><td className={`py-2 pl-2 text-right font-medium ${item.calificador.toString().startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>{item.calificador.toString()}</td></tr>))}</tbody>
                </table>
            </div>
        )}
        {profile.factores_personales && (
            <div><h5 className="font-medium text-slate-600">Factores Personales</h5><p className="mt-1 text-slate-900 bg-slate-50 p-3 rounded-md border">{profile.factores_personales}</p></div>
        )}
    </div>
);

const HypothesisComparisonDisplay: React.FC<{ comparison: HypothesisComparison }> = ({ comparison }) => {
    const coincidenceStyles = { alta: 'bg-green-100 text-green-800 border-green-300', parcial: 'bg-yellow-100 text-yellow-800 border-yellow-300', baja: 'bg-red-100 text-red-800 border-red-300' };
    return (
        <div className="space-y-4 text-sm">
            <div className={`p-3 rounded-lg border ${coincidenceStyles[comparison.coincidencia]}`}><span className="font-semibold">Nivel de Coincidencia:</span> {comparison.coincidencia.charAt(0).toUpperCase() + comparison.coincidencia.slice(1)}</div>
            <div><h5 className="font-medium text-slate-600">Hipótesis del Profesional</h5><p className="mt-1 text-slate-900 bg-slate-50 p-3 rounded-md border">{comparison.hipotesis_profesional}</p></div>
            <div><h5 className="font-medium text-slate-600">Interpretación de IA</h5><p className="mt-1 text-slate-900 bg-slate-50 p-3 rounded-md border">{comparison.interpretacion_ia}</p></div>
            {comparison.puntos_comunes.length > 0 && (<div><h5 className="font-medium text-slate-600">Puntos en Común</h5><ul className="list-disc list-inside mt-1 space-y-1 text-slate-800">{comparison.puntos_comunes.map((item, i) => <li key={i}>{item}</li>)}</ul></div>)}
            {comparison.diferencias.length > 0 && (<div><h5 className="font-medium text-slate-600">Diferencias y Puntos Adicionales</h5><ul className="list-disc list-inside mt-1 space-y-1 text-slate-800">{comparison.diferencias.map((item, i) => <li key={i}>{item}</li>)}</ul></div>)}
        </div>
    );
};

// Tab Content Components

const AnalysisTab: React.FC<{
    record: ClinicalRecord; patient: Patient; onGenerateCIF: (id: number) => void; onGenerateSummary: (id: number) => void; onGenerateComparison: (id: number) => void; cifLoadingRecordId: number | null; summaryLoadingRecordId: number | null; comparisonLoadingId: number | null; hypothesisInput: string; onHypothesisChange: (value: string) => void;
}> = ({ record, patient, onGenerateCIF, onGenerateSummary, onGenerateComparison, cifLoadingRecordId, summaryLoadingRecordId, comparisonLoadingId, hypothesisInput, onHypothesisChange }) => (
    <div className="space-y-6">
        <div>
            <div className="flex justify-between items-center mb-2"><h4 className="text-lg font-semibold text-slate-800">Resumen y Análisis IA</h4><button onClick={() => onGenerateSummary(record.id)} disabled={summaryLoadingRecordId === record.id} className="inline-flex items-center gap-2 px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"><SparklesIcon className="w-4 h-4" />{summaryLoadingRecordId === record.id ? 'Regenerando...' : 'Regenerar'}</button></div>
            {record.summary ? <div className="p-4 bg-slate-800 rounded-lg border border-slate-700"><MarkdownRenderer text={record.summary} /></div> : <p className="text-sm text-slate-500">No hay resumen disponible.</p>}
        </div>
        <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-2"><h4 className="text-lg font-semibold text-slate-800">Perfil CIF</h4><button onClick={() => onGenerateCIF(record.id)} disabled={cifLoadingRecordId === record.id} className="inline-flex items-center gap-2 px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"><BrainCircuitIcon className="w-4 h-4" />{cifLoadingRecordId === record.id ? 'Generando...' : 'Generar Perfil'}</button></div>
            {record.cifProfile ? <CIFProfileDisplay profile={record.cifProfile} /> : <p className="text-sm text-slate-500">Aún no se ha generado un perfil CIF para este registro.</p>}
        </div>
        <div className="border-t pt-6">
            <h4 className="text-lg font-semibold text-slate-800 mb-2">Comparación de Hipótesis</h4>
            <div className="space-y-4">
                <div><label htmlFor={`hypothesis-${record.id}`} className="block text-sm font-medium text-slate-700">Hipótesis del Profesional (Editable)</label><textarea id={`hypothesis-${record.id}`} value={hypothesisInput} onChange={(e) => onHypothesisChange(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm text-slate-900 focus:outline-none focus:border-blue-500" placeholder="Ingrese su hipótesis clínica aquí..."></textarea></div>
                <button onClick={() => onGenerateComparison(record.id)} disabled={comparisonLoadingId === record.id || !hypothesisInput.trim()} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50">{comparisonLoadingId === record.id ? 'Comparando...' : 'Comparar con IA'}</button>
                {record.hypothesisComparison && <div className="mt-4"><HypothesisComparisonDisplay comparison={record.hypothesisComparison} /></div>}
            </div>
        </div>
    </div>
);

const AnamnesisTab: React.FC<{ record: ClinicalRecord }> = ({ record }) => {
    const { anamnesis } = record;
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                <DetailItem label="Dx. Médico" value={anamnesis.diagnosticoMedico} />
                <DetailItem label="Médico Tratante" value={anamnesis.medicoTratante} />
                <DetailItem label="Fecha Lesión" value={safeToLocaleDate(anamnesis.fechaFractura)} />
                <DetailItem label="Fecha At. Médica" value={safeToLocaleDate(anamnesis.fechaAtencionMedica)} />
                <DetailItem label="Fecha At. Kinésica" value={safeToLocaleDate(anamnesis.fechaAtencionKinesica)} />
                <DetailItem label="Causa" value={anamnesis.causaFractura} />
                <DetailItem label="Dominancia" value={anamnesis.dominancia} />
                <DetailItem label="Cirugía" value={formatDisplayValue(anamnesis.qx)} />
                <DetailItem label="Osteosíntesis" value={anamnesis.osteosintesis1Tipo} />
                <DetailItem label="Inmovilización" value={anamnesis.inmovilizacion === 'si' ? `Sí (${anamnesis.inmovilizacion1Tipo || 'N/A'}, ${anamnesis.inmovilizacion1Periodo || 'N/A'})` : formatDisplayValue(anamnesis.inmovilizacion)} />
                <DetailItem label="Tabaquismo" value={formatDisplayValue(anamnesis.tabaquismo)} />
                <DetailItem label="Diabetes" value={formatDisplayValue(anamnesis.diabetes)} />
                <DetailItem label="Menopausia" value={formatDisplayValue(anamnesis.menopausia)} />
                <DetailItem label="Osteoporosis/penia" value={formatDisplayValue(anamnesis.osteopeniaOsteoporosis)} />
                <DetailItem label="DMO" value={anamnesis.dmo === 'si' ? `Sí (Última: ${safeToLocaleDate(anamnesis.ultimaDmo)})` : formatDisplayValue(anamnesis.dmo)} />
                <DetailItem label="Caídas Frecuentes" value={anamnesis.caidasFrecuentes === 'si' ? `Sí (${anamnesis.caidas6meses || 0} en 6 meses)` : formatDisplayValue(anamnesis.caidasFrecuentes)} />
                <DetailItem label="Med. para Dolor" value={anamnesis.medicacionDolor} />
                <DetailItem label="Otra Med." value={anamnesis.medicacionExtra} />
            </div>
        </div>
    );
};

const ExamTab: React.FC<{ record: ClinicalRecord }> = ({ record }) => {
    // ... all the helper display components from the original file...
    const { physicalExam } = record;
    return (
        <div className="space-y-6">
            <DetailItem label="Inspección" value={physicalExam.inspeccion} />
            <DetailItem label="Palpación" value={physicalExam.palpacion} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <h5 className="font-semibold text-slate-600 mb-2">Medidas y Kapandji</h5>
                    <div className="space-y-2 text-sm">
                        <DetailItem label="Edema (Figura en 8)" value={physicalExam.medidas.figuraEn8 ? `${physicalExam.medidas.figuraEn8} cm` : null} />
                        <DetailItem label="Ø Estiloideo" value={formatBilateralValue(physicalExam.medidas.estiloideo, ' cm')} />
                        <DetailItem label="Ø Palmar" value={formatBilateralValue(physicalExam.medidas.palmar, ' cm')} />
                        <DetailItem label="Ø MTCPF" value={formatBilateralValue(physicalExam.medidas.mtcpf, ' cm')} />
                        <DetailItem label="Test de Kapandji" value={formatBilateralValue(physicalExam.testKapandji, '/10')} />
                    </div>
                 </div>
                <div>
                    <h5 className="font-semibold text-slate-600 mb-2">Goniometría (°)</h5>
                    <div className="space-y-2 text-sm">
                        <DetailItem label="Flexión" value={formatBilateralValue(physicalExam.goniometria.flexion)} />
                        <DetailItem label="Extensión" value={formatBilateralValue(physicalExam.goniometria.extension)} />
                        <DetailItem label="Desv. Radial" value={formatBilateralValue(physicalExam.goniometria.inclinacionRadial)} />
                        <DetailItem label="Desv. Cubital" value={formatBilateralValue(physicalExam.goniometria.inclinacionCubital)} />
                        <DetailItem label="Supinación" value={formatBilateralValue(physicalExam.goniometria.supinacion)} />
                        <DetailItem label="Pronación" value={formatBilateralValue(physicalExam.goniometria.pronacion)} />
                    </div>
                </div>
            </div>
            {/* Specific tests sections */}
        </div>
    );
};

const StudiesTab: React.FC<{ record: ClinicalRecord }> = ({ record }) => {
    const { radiology } = record;
    return (
        <div className="space-y-4">
            {radiology.studies?.length > 0 && (
                <div>
                    <h5 className="font-semibold text-slate-600 mb-2">Imágenes</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {radiology.studies.map((study, index) => (
                             <a key={index} href={study.base64} target="_blank" rel="noopener noreferrer" className="block group bg-slate-50 p-2 rounded-lg border hover:border-blue-400">
                                <img src={study.base64} alt={study.name} className="rounded-md w-full h-28 object-cover" />
                                <p className="text-xs text-slate-600 mt-1 truncate" title={study.name}>{study.name}</p>
                            </a>
                        ))}
                    </div>
                </div>
            )}
            <div>
                <h5 className="font-semibold text-slate-600 mb-2">Parámetros Radiográficos</h5>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                    <DetailItem label="Inc. Radial" value={radiology.inclinacionRadial ? `${radiology.inclinacionRadial}°` : null} />
                    <DetailItem label="Inc. Palmar" value={radiology.inclinacionPalmar ? `${radiology.inclinacionPalmar}°` : null} />
                    <DetailItem label="Varianza Cubital" value={radiology.varianzaCubital ? `${radiology.varianzaCubital} mm (${formatDisplayValue(radiology.varianzaCubitalClasificacion)})` : null} />
                    <DetailItem label="Clasif. Fractura" value={formatDisplayValue(radiology.clasificacionFracturaRadioDistal)} />
                </div>
            </div>
            <div>
                <h5 className="font-semibold text-slate-600 mb-2">Interpretación IA</h5>
                {radiology.interpretation ? <div className="p-4 bg-slate-50 rounded-lg border"><MarkdownRenderer text={radiology.interpretation} /></div> : <p className="text-sm text-slate-500">No hay interpretación disponible.</p>}
            </div>
        </div>
    );
};

const ScalesTab: React.FC<{ record: ClinicalRecord }> = ({ record }) => {
    const { scales } = record;
    return (
        <div className="space-y-4">
            <h5 className="font-semibold text-slate-600">Escalas Generales</h5>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                <DetailItem label="Dolor Actual (EVA)" value={scales.dolorVAS ? `${scales.dolorVAS}/10` : null} />
                <DetailItem label="Dolor Nocturno (Severidad)" value={scales.dolorNocturnoSeveridad ? `${scales.dolorNocturnoSeveridad}/10` : null} />
                <DetailItem label="Dolor Diurno (Frecuencia)" value={scales.dolorDiurnoFrecuencia ? `${scales.dolorDiurnoFrecuencia}/10` : null} />
                <DetailItem label="Debilidad" value={scales.debilidad ? `${scales.debilidad}/10` : null} />
                <DetailItem label="Hormigueo" value={scales.hormigueo ? `${scales.hormigueo}/10` : null} />
                <DetailItem label="Dificultad Agarre" value={scales.dificultadAgarre ? `${scales.dificultadAgarre}/10` : null} />
                <DetailItem label="TUG Test" value={scales.tugTest ? `${scales.tugTest} segs` : null} />
            </div>
            {/* PRWE and DASH scores can be added here if available in data */}
        </div>
    );
};

const ImpactTab: React.FC<{ record: ClinicalRecord }> = ({ record }) => {
    return record.impact ? <FlagsDisplay impact={record.impact} /> : <p className="text-sm text-slate-500">No se registraron datos de impacto y banderas.</p>;
};

// ... other helper components (FlagsDisplay, safeToLocaleDate, etc.)
const safeToLocaleDate = (dateString?: string | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString.includes('T') ? dateString : `${dateString}T00:00:00`);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const FlagsDisplay: React.FC<{ impact: ImpactData }> = ({ impact }) => { /* ... implementation from original file ... */ return <p className="text-sm text-slate-500">No se marcaron banderas ni consideraciones para este registro.</p>};


// Accordion Component

const RecordAccordion: React.FC<{ record: ClinicalRecord; patient: Patient; isOpen: boolean; onToggle: () => void; onGenerateCIF: (id: number) => void; onGenerateSummary: (id: number) => void; onGenerateComparison: (id: number) => void; cifLoadingRecordId: number | null; summaryLoadingRecordId: number | null; comparisonLoadingId: number | null; hypothesisInput: string; onHypothesisChange: (value: string) => void; }> = ({ record, patient, isOpen, onToggle, ...props }) => {
    const [activeTab, setActiveTab] = useState('analysis');

    useEffect(() => {
        if (isOpen) {
            setActiveTab('analysis');
        }
    }, [isOpen]);
    
    return (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200/80 overflow-hidden">
            <button onClick={onToggle} className="w-full flex justify-between items-center p-4 sm:p-6 text-left hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
                <h3 className="text-lg font-semibold text-slate-800">Registro del: {safeToLocaleDate(record.createdAt)}</h3>
                <ChevronRightIcon className={`transform transition-transform text-slate-500 ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            {isOpen && (
                <div className="p-4 sm:p-6 pt-0 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                    <div className="border-b border-slate-200">
                        <nav className="-mb-px flex space-x-4 sm:space-x-6 overflow-x-auto" aria-label="Tabs">
                            {TABS.map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}>
                                    {tab.name}
                                </button>
                            ))}
                        </nav>
                    </div>
                    <div className="mt-6">
                        {activeTab === 'analysis' && <AnalysisTab record={record} patient={patient} {...props} />}
                        {activeTab === 'anamnesis' && <AnamnesisTab record={record} />}
                        {activeTab === 'exam' && <ExamTab record={record} />}
                        {activeTab === 'studies' && <StudiesTab record={record} />}
                        {activeTab === 'scales' && <ScalesTab record={record} />}
                        {activeTab === 'impact' && <ImpactTab record={record} />}
                    </div>
                </div>
            )}
        </div>
    );
};


// Main Page Component

const PatientDetailPage: React.FC<PatientDetailPageProps> = ({ patientId, onNavigate }) => {
    const [patient, setPatient] = useState<Patient | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPrinting, setIsPrinting] = useState(false);
    const [openRecordId, setOpenRecordId] = useState<number | null>(null);
    const [cifLoadingRecordId, setCifLoadingRecordId] = useState<number | null>(null);
    const [summaryLoadingRecordId, setSummaryLoadingRecordId] = useState<number | null>(null);
    const [comparisonLoadingId, setComparisonLoadingId] = useState<number | null>(null);
    const [hypothesisInputs, setHypothesisInputs] = useState<Record<number, string>>({});
    const [isSavingToDrive, setIsSavingToDrive] = useState(false);
    const [driveSaveMessage, setDriveSaveMessage] = useState('');
    const [evolutionSummary, setEvolutionSummary] = useState<string>('');
    const [isGeneratingEvolution, setIsGeneratingEvolution] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);
    
    const tokenClientRef = useRef<any>(null);
    const patientRef = useRef<Patient | null>(null);
    patientRef.current = patient;
    
    useEffect(() => {
        const loadPatient = async () => {
            setIsLoading(true);
            try {
                const details = await getPatientDetails(patientId);
                if (details) {
                    setPatient(details);
                    if (details.clinicalRecords.length > 0) {
                        setOpenRecordId(details.clinicalRecords[0].id);
                    }
                    const initialInputs: Record<number, string> = {};
                    details.clinicalRecords.forEach((record: any) => {
                        initialInputs[record.id] = record.hypothesisComparison?.hipotesis_profesional || record.impact?.interpretacionProfesional || '';
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
    
    useEffect(() => {
        if (typeof google === 'undefined' || !google.accounts) {
            console.error("Google Identity Services library not loaded. The 'Save to Drive' feature will be unavailable.");
            return;
        }

        const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
        if (!CLIENT_ID) {
            console.error("Google Client ID is not configured.");
            return;
        }

        const uploadFile = async (accessToken: string) => {
            setIsSavingToDrive(true); // Mover esto aquí para que el estado de carga sea más preciso
            const currentPatient = patientRef.current;

            if (!currentPatient) {
                setDriveSaveMessage("Error: No se encontraron datos del paciente para guardar.");
                setIsSavingToDrive(false);
                return;
            }

            try {
                const fileName = `Ficha_Paciente_${currentPatient.filiatorios.apellido}_${currentPatient.filiatorios.dni}.json`;
                const fileContent = JSON.stringify(currentPatient, null, 2);
                const fileMetadata = {
                    name: fileName,
                    // Opcional: si quieres guardarlo en una carpeta específica, necesitas su ID
                    // parents: ['ID_DE_LA_CARPETA'] 
                };

                const form = new FormData();
                form.append(
                    'metadata', 
                    new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' })
                );
                form.append(
                    'file', 
                    new Blob([fileContent], { type: 'application/json' })
                );

                const response = await fetch('https://upload.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST',
                    // Simplificación: Pasamos un objeto plano. Dejamos que el navegador
                    // gestione el 'Content-Type' para FormData, lo cual es crucial.
                    headers: {
                        'Authorization': 'Bearer ' + accessToken,
                    },
                    body: form
                });

                if (!response.ok) {
                    // Intentamos leer el error específico de la API de Google
                    const errorData = await response.json();
                    console.error('API Error Response:', errorData);
                    throw new Error(errorData.error.message || `Error del servidor: ${response.statusText}`);
                }
                
                const result = await response.json();
                console.log('File uploaded successfully:', result);
                setDriveSaveMessage('¡Ficha guardada en Google Drive con éxito!');

            } catch (uploadError: any) {
                console.error("Google Drive Upload Error:", uploadError);
                const errorMessage = uploadError.message || 'No se pudo guardar el archivo. Revisa la consola para más detalles.';
                setDriveSaveMessage(`Error de subida: ${errorMessage}`);
            } finally {
                setIsSavingToDrive(false);
            }
        };
        try {
            const client = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/drive.file',
                callback: (tokenResponse: any) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        uploadFile(tokenResponse.access_token);
                    } else {
                        setIsSavingToDrive(false);
                        setDriveSaveMessage('No se pudo obtener el token de acceso.');
                    }
                },
                error_callback: (error: any) => {
                    console.error("Google Auth Error:", error);
                    let message = `Error de autenticación: ${error.type || 'desconocido'}.`;
                    if (error.type === 'popup_closed') {
                        message = 'Se cerró la ventana de inicio de sesión.';
                    } else if (error.type === 'popup_failed_to_open') {
                        message = 'No se pudo abrir la ventana de inicio de sesión. Verifique si su navegador bloquea pop-ups.';
                    }
                    setDriveSaveMessage(message);
                    setIsSavingToDrive(false);
                }
            });
            tokenClientRef.current = client;
        } catch (error) {
            console.error("Failed to initialize Google token client:", error);
            setDriveSaveMessage('Error al inicializar el cliente de Google.');
        }

    }, []);

     useEffect(() => {
        if (driveSaveMessage) {
            const timer = setTimeout(() => setDriveSaveMessage(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [driveSaveMessage]);

    const handleDownloadJson = () => {
        if (!patient) return;

        try {
            const fileName = `Ficha_Paciente_${patient.filiatorios.apellido}_${patient.filiatorios.dni}.json`;
            const jsonString = JSON.stringify(patient, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Error creating JSON file for download", error);
            alert("Hubo un error al generar el archivo JSON.");
        }
    };

    const handleSaveToDrive = () => {
        if (isSavingToDrive) return;
        setIsSavingToDrive(true);
        setDriveSaveMessage('Iniciando...');

        if (!tokenClientRef.current) {
            setDriveSaveMessage("La función de Guardar en Drive no está lista. Puede ser un problema de configuración (Client ID) o de carga de la librería de Google.");
            setIsSavingToDrive(false);
            console.error("Google token client is not initialized.");
            return;
        }

        tokenClientRef.current.requestAccessToken({ prompt: '' });
    };

    const handleHypothesisChange = (recordId: number, value: string) => {
        setHypothesisInputs(prev => ({ ...prev, [recordId]: value }));
    };

    const handleCreateNewRecord = () => {
        if (!patient || patient.clinicalRecords.length === 0) return;
        const latestRecord = patient.clinicalRecords[0];
        const initialDataForNewForm: ClinicalData = { filiatorios: patient.filiatorios, anamnesis: latestRecord.anamnesis, physicalExam: initialPhysicalExam, radiology: initialRadiology, scales: initialScales, impact: initialImpactData };
        onNavigate('form', { initialData: initialDataForNewForm });
    };

    const handleGenerateComparison = async (recordId: number) => {
        if (!patient || !hypothesisInputs[recordId]?.trim()) { alert("Por favor, ingrese una hipótesis clínica."); return; }
        setComparisonLoadingId(recordId);
        const record = patient.clinicalRecords.find(r => r.id === recordId);
        if (record) {
            try {
                const comparison = await generateHypothesisComparison(record, patient, hypothesisInputs[recordId]);
                if (comparison) {
                    await updateHypothesisComparison(recordId, comparison);
                    setPatient(prev => prev && { ...prev, clinicalRecords: prev.clinicalRecords.map(r => r.id === recordId ? { ...r, hypothesisComparison: comparison } : r) });
                }
            } catch (error) { console.error(error); alert("Hubo un error al generar la comparación."); }
        }
        setComparisonLoadingId(null);
    };

    const handleGenerateSummaryForRecord = async (recordId: number) => {
        if (!patient) return;
        setSummaryLoadingRecordId(recordId);
        const record = patient.clinicalRecords.find(r => r.id === recordId);
        if (record) {
            try {
                const newSummary = await generateSummaryForSavedRecord(record, patient);
                await updateRecordSummary(recordId, newSummary);
                setPatient(prev => prev && { ...prev, clinicalRecords: prev.clinicalRecords.map(r => r.id === recordId ? { ...r, summary: newSummary } : r) });
            } catch (error) { console.error(error); alert("Hubo un error al generar el resumen.");
            } finally { setSummaryLoadingRecordId(null); }
        }
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
                    setPatient(prev => prev && { ...prev, clinicalRecords: prev.clinicalRecords.map(r => r.id === recordId ? { ...r, cifProfile: profile } : r) });
                }
            } catch (error) { console.error(error); alert("Hubo un error al generar el perfil CIF."); }
        }
        setCifLoadingRecordId(null);
    };

    const handleGenerateEvolution = async () => {
        if (!patient) return;
        setIsGeneratingEvolution(true);
        setEvolutionSummary(''); // Clear previous summary
        try {
            const summary = await generateEvolutionSummary(patient);
            setEvolutionSummary(summary);
        } catch (error) {
            console.error("Failed to generate evolution summary:", error);
            setEvolutionSummary("Error al generar el resumen de evolución. Verifique que el paciente tenga al menos dos registros clínicos.");
        } finally {
            setIsGeneratingEvolution(false);
        }
    };


    const handleDownloadPdf = async () => { /* ... implementation from original file ... */ };
    
    if (isLoading) return <div className="flex justify-center items-center h-64"><LoaderIcon /><span className="ml-4 text-slate-500">Cargando...</span></div>;
    if (!patient) return <div className="text-center py-10">No se encontraron datos.</div>;

    return (
        <div className="animate-fadeIn space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                 <button onClick={() => onNavigate('history')} className="inline-flex items-center gap-1 px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50"><ChevronLeftIcon /> Volver al Historial</button>
                 <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                     <div className="flex items-center gap-3">
                        <button onClick={handleCreateNewRecord} className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"><PlusCircleIcon /> Nuevo Registro</button>
                        <button onClick={handleDownloadJson} className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700"><JsonIcon /> JSON</button>
                        <button onClick={handleSaveToDrive} disabled={isSavingToDrive} className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50">{isSavingToDrive ? <LoaderIcon /> : <GoogleDriveIcon />}{isSavingToDrive ? 'Guardando...' : ''}</button>
                        <button onClick={handleDownloadPdf} disabled={isPrinting} className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50">{isPrinting ? <LoaderIcon /> : <FileDownIcon />}{isPrinting ? 'Generando...' : ''}</button>
                     </div>
                      {driveSaveMessage && (<p className={`text-xs text-center sm:text-left mt-2 sm:mt-0 ${driveSaveMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>{driveSaveMessage}</p>)}
                </div>
            </div>
            
             <div ref={printRef} className="p-4 sm:p-0 print-container">
                 <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200/80">
                     <h1 className="text-3xl font-bold text-slate-900">{patient.filiatorios.nombre} {patient.filiatorios.apellido}</h1>
                     <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2">
                        <DetailItem label="DNI" value={patient.filiatorios.dni} />
                        <DetailItem label="Edad" value={patient.filiatorios.edad} />
                        <DetailItem label="Ocupación" value={patient.filiatorios.ocupacion} />
                        <DetailItem label="Teléfono" value={patient.filiatorios.telefono} />
                     </div>
                 </div>

                <div className="mt-6 bg-white p-6 rounded-xl shadow-lg border border-slate-200/80 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <h2 className="text-xl font-bold text-slate-800">Resumen de Evolución</h2>
                        <button
                            onClick={handleGenerateEvolution}
                            disabled={isGeneratingEvolution || !patient || patient.clinicalRecords.length < 2}
                            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGeneratingEvolution ? <LoaderIcon /> : <TrendingUpIcon />}
                            {isGeneratingEvolution ? 'Generando...' : 'Generar Resumen de Evolución'}
                        </button>
                    </div>
                    {patient && patient.clinicalRecords.length < 2 && (
                        <p className="text-sm text-slate-500 text-center sm:text-left">Se necesitan al menos dos registros para generar un resumen de evolución.</p>
                    )}

                    {isGeneratingEvolution && (
                        <div className="flex items-center justify-center mt-4 p-4 bg-slate-50 rounded-lg animate-fadeIn">
                            <LoaderIcon />
                            <p className="ml-3 text-slate-600">Analizando la evolución del paciente...</p>
                        </div>
                    )}
                    {evolutionSummary && !isGeneratingEvolution && (
                        <div className="mt-4 p-4 bg-slate-800 rounded-lg border border-slate-700 animate-fadeIn">
                            <MarkdownRenderer text={evolutionSummary} />
                        </div>
                    )}
                </div>


                <div className="mt-6 space-y-4">
                    <h2 className="text-2xl font-bold text-slate-800">Registros Clínicos</h2>
                    {patient.clinicalRecords.length > 0 ? (
                        patient.clinicalRecords.map((record) => (
                           <RecordAccordion
                                key={record.id}
                                record={record}
                                patient={patient}
                                isOpen={openRecordId === record.id}
                                onToggle={() => setOpenRecordId(openRecordId === record.id ? null : record.id)}
                                onGenerateCIF={handleGenerateCIF}
                                onGenerateSummary={handleGenerateSummaryForRecord}
                                onGenerateComparison={handleGenerateComparison}
                                cifLoadingRecordId={cifLoadingRecordId}
                                summaryLoadingRecordId={summaryLoadingRecordId}
                                comparisonLoadingId={comparisonLoadingId}
                                hypothesisInput={hypothesisInputs[record.id] || ''}
                                onHypothesisChange={(value) => handleHypothesisChange(record.id, value)}
                            />
                        ))
                    ) : (
                        <div className="bg-white p-6 rounded-xl shadow-lg border text-center"><p>No hay registros clínicos para este paciente.</p></div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PatientDetailPage;