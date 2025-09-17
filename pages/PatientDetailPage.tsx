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

const MarkdownRenderer: React.FC<{ text: string, className?: string }> = ({ text, className }) => {
    const processInline = (line: string): { __html: string } => {
        const processedLine = line
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
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
            elements.push(<ul key={listKey} className="list-disc list-outside ml-5 space-y-1 my-2">{items}</ul>);
        } else {
            elements.push(<ol key={listKey} className="list-decimal list-outside ml-5 space-y-1 my-2">{items}</ol>);
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
            const baseClass = `font-bold mt-4 mb-2 first-of-type:mt-0 ${level === 1 ? 'text-lg' : ''}`;
            elements.push(<Tag key={index} className={baseClass} dangerouslySetInnerHTML={processInline(content)} />);
            return;
        }

        const boldHeaderMatch = line.match(/^(?:\d+\.\s*)?\*\*(.*?)\*\*:\s*$/);
        if (boldHeaderMatch) {
            flushList();
            elements.push(<h4 key={index} className="font-bold mt-4 mb-2 first-of-type:mt-0" dangerouslySetInnerHTML={processInline(line)} />);
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
            elements.push(<p key={index} dangerouslySetInnerHTML={processInline(line)} />);
        }
    });

    flushList(); 

    return <div className={`space-y-2 ${className}`}>{elements}</div>;
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
            {record.summary ? <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 text-white"><MarkdownRenderer text={record.summary} className="prose-invert" /></div> : <p className="text-sm text-slate-500">No hay resumen disponible.</p>}
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
    const { physicalExam } = record;

    const TestGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
        const childArray = React.Children.toArray(children).filter(Boolean);
        if (childArray.length === 0) return null;
        return (
            <div>
                <h5 className="font-semibold text-slate-600 mb-2">{title}</h5>
                <div className="space-y-2 text-sm p-3 bg-slate-50 rounded-md border">
                    {children}
                </div>
            </div>
        );
    };

    const CRPSDisplay: React.FC<{ data?: CRPSData }> = ({ data }) => {
        if (!data) return null;
        const sections: {title: string, items: {key: string, label: string}[]}[] = [
             { title: "Dolor y Alteraciones Sensitivas", items: Object.entries(data.dolorAlteracionesSensitivas).filter(([,v]) => v).map(([k]) => ({key:k, label: k.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())})) },
             { title: "Alteraciones Autonómicas y Tróficas", items: Object.entries(data.alteracionesAutonomicasTroficas).filter(([,v]) => v).map(([k]) => ({key:k, label: k.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())})) },
             { title: "Alteraciones Motoras y Funcionales", items: Object.entries(data.alteracionesMotorasFuncionales).filter(([,v]) => v).map(([k]) => ({key:k, label: k.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())})) },
             { title: "Factores de Personalidad", items: Object.entries(data.factoresPersonalidad).filter(([,v]) => v).map(([k]) => ({key:k, label: k.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())})) },
        ];
        
        const filledSections = sections.filter(s => s.items.length > 0);
        if (filledSections.length === 0) return <DetailItem label="Signos/Síntomas de CRPS" value="Ninguno reportado" />;

        return (
            <div className="space-y-2">
                {filledSections.map(section => (
                    <div key={section.title}>
                        <h6 className="font-medium text-slate-700">{section.title}</h6>
                        <ul className="list-disc list-inside ml-2 text-slate-800">
                           {section.items.map(item => <li key={item.key}>{item.label}</li>)}
                        </ul>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <DetailItem label="Inspección" value={physicalExam.inspeccion} />
            <DetailItem label="Palpación" value={physicalExam.palpacion} />
             <DetailItem label="Pruebas Especiales Adicionales" value={physicalExam.pruebasEspeciales} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
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
                 <div className="md:col-span-2">
                    <h5 className="font-semibold text-slate-600 mb-2">Miembro Superior</h5>
                     <div className="space-y-2 text-sm">
                        <DetailItem label="Actitud Hombro" value={physicalExam.actitudMiembroSuperior?.hombro} />
                        <DetailItem label="Actitud Codo/Antebrazo" value={physicalExam.actitudMiembroSuperior?.codoAntebrazo} />
                        <DetailItem label="Actitud Muñeca" value={physicalExam.actitudMiembroSuperior?.muneca} />
                        <DetailItem label="Actitud Mano" value={physicalExam.actitudMiembroSuperior?.mano} />
                        <DetailItem label="Dolor de Hombro" value={formatDisplayValue(physicalExam.dolorHombro)} />
                        <DetailItem label="Mov. Hombro - Elev. Anterior" value={physicalExam.movimientosHombro?.elevacionAnterior} />
                        <DetailItem label="Mov. Hombro - GEB1 (Tras nuca)" value={physicalExam.movimientosHombro?.geb1} />
                        <DetailItem label="Mov. Hombro - GEB2 (Tras espalda)" value={physicalExam.movimientosHombro?.geb2} />
                     </div>
                 </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                 <TestGroup title="Pruebas de Fractura de Escafoides">
                    <DetailItem label="Dolor supinación resistida" value={formatDisplayValue(physicalExam.pruebasFracturaEscafoides.dolorSupinacionResistencia)} />
                    <DetailItem label="Supinación < 10% del contralateral" value={formatDisplayValue(physicalExam.pruebasFracturaEscafoides.supinacionLimitada)} />
                    <DetailItem label="Dolor desviación cubital" value={formatDisplayValue(physicalExam.pruebasFracturaEscafoides.dolorDesviacionCubital)} />
                    <DetailItem label="Dolor tabaquera anatómica" value={formatDisplayValue(physicalExam.pruebasFracturaEscafoides.dolorTabaqueraAnatomica)} />
                 </TestGroup>
                 <TestGroup title="Lesión del CFCT">
                    <DetailItem label="Localización dolor" value={Object.entries(physicalExam.cftLesion.dolorLocalizacion).filter(([, checked]) => checked).map(([key]) => formatDisplayValue(key)).join(', ') || 'No especificado'} />
                    <DetailItem label="Tipo de dolor" value={formatDisplayValue(physicalExam.cftLesion.dolorTipo)} />
                    <DetailItem label="Chasquido pronosup." value={formatDisplayValue(physicalExam.cftLesion.chasquidoPronosupinacion)} />
                    <DetailItem label="Sensación inestabilidad" value={formatDisplayValue(physicalExam.cftLesion.sensacionInestabilidad)} />
                    <DetailItem label="Test fóvea cubital" value={formatDisplayValue(physicalExam.cftLesion.testFoveaCubital)} />
                    <DetailItem label="Test estrés cubital" value={formatDisplayValue(physicalExam.cftLesion.testEstresCubital)} />
                 </TestGroup>
                  <TestGroup title="Riesgo de Capsulitis Adhesiva / Rigidez">
                    <DetailItem label="Semanas inmovilizado" value={physicalExam.riesgoCapsulitisAdhesiva.duracionInmovilizacionSemanas} />
                    <DetailItem label="Limitación ROM pasivo" value={formatDisplayValue(physicalExam.riesgoCapsulitisAdhesiva.romPasivoLimitado)} />
                    <CRPSDisplay data={physicalExam.riesgoCapsulitisAdhesiva.evaluacionCRPS} />
                 </TestGroup>
            </div>
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
                {radiology.interpretation ? <div className="p-4 bg-slate-50 rounded-lg border"><MarkdownRenderer text={radiology.interpretation} className="prose-sm" /></div> : <p className="text-sm text-slate-500">No hay interpretación disponible.</p>}
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

const safeToLocaleDate = (dateString?: string | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString.includes('T') ? dateString : `${dateString}T00:00:00`);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const FlagsDisplay: React.FC<{ impact: ImpactData }> = ({ impact }) => {
    const FlagItem: React.FC<{ label: string, value?: string | null, condition?: boolean }> = ({ label, value, condition = true }) => {
        if (!condition || !value || value === 'no' || value === '') return null;
        return (
             <li className="text-sm">
                <span className="font-semibold text-slate-700">{label}:</span>{' '}
                <span className="text-slate-900">{formatDisplayValue(value)}</span>
            </li>
        );
    };

    const FlagSection: React.FC<{color: string; title: string; children: React.ReactNode}> = ({ color, title, children }) => {
        const childArray = React.Children.toArray(children).filter(Boolean);
        if (childArray.length === 0) return null;

        return (
            <div className="rounded-md border-l-4 p-3 bg-slate-50/50" style={{ borderLeftColor: color }}>
                <h3 className="flex items-center gap-2 text-md font-semibold text-slate-800">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
                    {title}
                </h3>
                <ul className="mt-2 space-y-1 pl-5">
                    {childArray}
                </ul>
            </div>
        );
    };
    
    const hasFlags = Object.values(impact).some(val => val && val !== 'no' && val !== '');

    if (!hasFlags) {
        return <p className="text-sm text-slate-500">No se marcaron banderas ni consideraciones para este registro.</p>;
    }

    return (
        <div className="space-y-4">
             <DetailItem label="Hipótesis del Profesional" value={impact.interpretacionProfesional} />
            <FlagSection color="#ef4444" title="Rojas">
                <FlagItem label="Dolor tras golpe/caída" value={impact.roja_dolor_golpe} />
                <FlagItem label="Fiebre/Inflamación marcada" value={impact.roja_fiebre_inflamacion} />
                <FlagItem label="Dolor empeoró (últimas 48h)" value={impact.roja_dolor_empeoro} />
                <FlagItem label="Movilidad mano reducida" value={impact.roja_movilidad_mano} />
            </FlagSection>
            <FlagSection color="#f59e0b" title="Amarillas">
                <FlagItem label="Cree que el dolor empeorará" value={impact.amarilla_creencia_dolor} condition={impact.amarilla_creencia_dolor === 'empeorara'} />
                <FlagItem label="Evita actividades por miedo" value={impact.amarilla_evita_actividades} />
                <FlagItem label="Interferencia del dolor" value={impact.amarilla_interferencia_dolor} />
            </FlagSection>
            <FlagSection color="#3b82f6" title="Azules">
                <FlagItem label="Trabajo dificulta la condición" value={impact.azul_trabajo_dificulta} />
                <FlagItem label="Percibe que el trabajo empeora" value={impact.azul_trabajo_ayuda_empeora} condition={impact.azul_trabajo_ayuda_empeora === 'empeora'}/>
                <FlagItem label="Sin apoyo laboral" value={impact.azul_apoyo_laboral} />
            </FlagSection>
            <FlagSection color="#374151" title="Negras">
                 <FlagItem label="Barreras externas a recuperación" value={impact.negra_barreras_recuperacion} />
                 <FlagItem label="Barreras del sistema de salud" value={impact.negra_barreras_sistema} />
                 <FlagItem label="Entorno limita recuperación" value={impact.negra_apoyo_entorno} condition={impact.negra_apoyo_entorno === 'limita'}/>
            </FlagSection>
             <FlagSection color="#f97316" title="Naranjas">
                <FlagItem label="Desanimado o sin interés" value={impact.naranja_animo_interes} />
                <FlagItem label="Impacto en el ánimo diario" value={impact.naranja_impacto_animo} />
                <FlagItem label="Pensamientos de desesperanza" value={impact.naranja_desesperanza} />
            </FlagSection>
            <DetailItem label="Otras Consideraciones" value={impact.otrasConsideraciones} />
        </div>
    );
};


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

        const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '268400273541-vasieodhnl5p3c62pd7lka4em1st3e9a.apps.googleusercontent.com';
        if (!CLIENT_ID) {
            console.error("Google Client ID is not configured.");
            return;
        }

        const uploadFile = async (accessToken: string) => {
            const currentPatient = patientRef.current;
            if (!currentPatient) {
                setDriveSaveMessage("Error: No se encontraron datos del paciente para guardar.");
                setIsSavingToDrive(false);
                return;
            }

            try {
                const fileName = `Ficha_Paciente_${currentPatient.filiatorios.apellido}_${currentPatient.filiatorios.dni}.json`;
                const fileContent = JSON.stringify(currentPatient, null, 2);
                const fileMetadata = { name: fileName, parents: ['root'] };
                
                const form = new FormData();
                form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
                form.append('file', new Blob([fileContent], { type: 'application/json' }));
                
                const response = await fetch('https://upload.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST',
                    headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
                    body: form
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error.message || 'Error al subir el archivo.');
                }
                
                await response.json();
                setDriveSaveMessage('¡Guardado en Google Drive con éxito!');

            } catch (uploadError: any) {
                console.error("Google Drive Upload Error:", uploadError);
                const errorMessage = uploadError.message || 'No se pudo guardar.';
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

    useEffect(() => {
        const generatePdf = async () => {
            if (!isPrinting || !printRef.current || !patient) return;
    
            const elementToPrint = printRef.current;
            const patientName = `${patient.filiatorios.apellido}_${patient.filiatorios.nombre}`.replace(/\s/g, '_');
            const fileName = `Ficha_Clinica_${patientName}.pdf`;
    
            try {
                const canvas = await html2canvas(elementToPrint, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    width: elementToPrint.offsetWidth,
                    height: elementToPrint.offsetHeight,
                    windowWidth: elementToPrint.scrollWidth,
                    windowHeight: elementToPrint.scrollHeight,
                });
    
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
                
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgHeight = (canvas.height * pdfWidth) / canvas.width;
                
                let heightLeft = imgHeight;
                let position = 0;
    
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
                heightLeft -= pdfHeight;
    
                while (heightLeft > 0) {
                    position -= pdfHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
                    heightLeft -= pdfHeight;
                }
                
                pdf.save(fileName);
            } catch (error) {
                console.error("Error generating PDF:", error);
                alert("Hubo un error al generar el PDF.");
            } finally {
                setIsPrinting(false);
            }
        };
    
        generatePdf();
    }, [isPrinting, patient]);


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


    const handleDownloadPdf = () => {
        if (!patient) {
            alert("No hay datos del paciente para generar el PDF.");
            return;
        }
        setIsPrinting(true);
    };

    const PrintableView: React.FC<{ patient: Patient, evolutionSummary: string }> = ({ patient, evolutionSummary }) => (
        <div>
            <h1>Ficha Clínica Completa</h1>
            <div style={{ marginBottom: '20px' }}>
                <h2>{patient.filiatorios.nombre} {patient.filiatorios.apellido}</h2>
                <p><strong>DNI:</strong> {patient.filiatorios.dni} | <strong>Edad:</strong> {patient.filiatorios.edad} | <strong>Ocupación:</strong> {patient.filiatorios.ocupacion} | <strong>Teléfono:</strong> {patient.filiatorios.telefono}</p>
            </div>
    
            {evolutionSummary && (
                <div style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
                    <h3>Resumen de Evolución</h3>
                    <div className="markdown-print-view"><MarkdownRenderer text={evolutionSummary} /></div>
                </div>
            )}
    
            {patient.clinicalRecords.map(record => (
                <div key={record.id} className="record-container">
                    <h2>Registro del: {safeToLocaleDate(record.createdAt)}</h2>
                    
                    {record.summary && (<><h3>Análisis IA</h3><div className="markdown-print-view prose-sm"><MarkdownRenderer text={record.summary} /></div></>)}
                    {record.cifProfile && (<><h3>Perfil CIF</h3><CIFProfileDisplay profile={record.cifProfile} /></>)}
                    {record.hypothesisComparison && (<><h3>Comparación de Hipótesis</h3><HypothesisComparisonDisplay comparison={record.hypothesisComparison} /></>)}

                    <h3>Anamnesis</h3>
                    <AnamnesisTab record={record} />
    
                    <h3>Examen Físico</h3>
                    <ExamTab record={record} />
    
                    <h3>Estudios Complementarios</h3>
                    <StudiesTab record={record} />
    
                    <h3>Escalas</h3>
                    <ScalesTab record={record} />
    
                    <h3>Impacto y Banderas</h3>
                    <ImpactTab record={record} />
                </div>
            ))}
        </div>
    );
    
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
                    <div className="mt-4 p-4 bg-slate-800 rounded-lg border border-slate-700 text-white animate-fadeIn">
                        <MarkdownRenderer text={evolutionSummary} className="prose-invert prose-sm" />
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
             {isPrinting && patient && (
                <div ref={printRef} className="print-root-container">
                    <style>{`
                        .print-root-container {
                            position: absolute; left: -9999px; top: 0;
                            width: 210mm; padding: 15mm;
                            background-color: white; color: black;
                            font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4;
                        }
                        .print-root-container h1 { font-size: 24pt; margin-bottom: 10px; color: #111; }
                        .print-root-container h2 { font-size: 18pt; margin-top: 25px; margin-bottom: 8px; border-bottom: 2px solid #333; padding-bottom: 4px; color: #222; }
                        .print-root-container h3 { font-size: 14pt; margin-top: 20px; margin-bottom: 5px; border-bottom: 1px solid #ccc; padding-bottom: 2px; color: #333; }
                        .print-root-container h4 { font-size: 12pt; font-weight: bold; margin-top: 15px; margin-bottom: 5px; color: #444; }
                        .print-root-container h5 { font-weight: bold; color: #555; }
                        .print-root-container .record-container { page-break-inside: avoid; margin-top: 25px; border-top: 3px double #000; padding-top: 15px; }
                        .print-root-container .markdown-print-view { color: #333 !important; }
                        .print-root-container .markdown-print-view strong { color: #000 !important; }
                        .print-root-container .markdown-print-view p, .print-root-container .markdown-print-view ul, .print-root-container .markdown-print-view ol { color: #333 !important; font-size: 10pt;}
                        .print-root-container .prose-sm { font-size: 9pt; }
                        .print-root-container .prose-invert { color: #333; }
                        .print-root-container .prose-invert strong { color: #000; }
                        .print-root-container img { max-width: 100%; height: auto; border: 1px solid #eee; border-radius: 4px; margin-top: 5px; page-break-inside: avoid; }
                        .print-root-container .text-slate-900 { color: #1e293b !important; }
                        .print-root-container .text-slate-600 { color: #475569 !important; }
                        .print-root-container .bg-slate-50 { background-color: #f8fafc !important; }
                        .print-root-container .border { border: 1px solid #e2e8f0 !important; }
                    `}</style>
                    <PrintableView patient={patient} evolutionSummary={evolutionSummary} />
                </div>
            )}
        </div>
    );
};

export default PatientDetailPage;