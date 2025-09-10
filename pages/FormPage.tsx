import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { STEPS } from '../constants';
import { ClinicalData, FiliatoriosData, AnamnesisData, PhysicalExamData, ScalesData, RadiologyData, ImpactData, PRWEData, DASHData, GoniometriaValue, StudyImage } from '../types';
import { Input, Select, Textarea, Checkbox } from '../components/FormControls';
import { ChevronLeftIcon, ChevronRightIcon, SparklesIcon, LoaderIcon, CloseIcon } from '../components/IconComponents';
import { generateAISummary, interpretRadiograph } from '../services/ai';
import { saveClinicalRecord } from '../services/db';
import { allTestPatients } from '../services/testPatients';
import { initialClinicalData } from '../initialData';

const FormPage: React.FC<{ onFormSubmit: () => void; initialData?: ClinicalData }> = ({ onFormSubmit, initialData }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState<ClinicalData>(initialClinicalData);
    const [summary, setSummary] = useState('');
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [isLoadingRadiology, setIsLoadingRadiology] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeScaleTab, setActiveScaleTab] = useState('prwe');
    const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
    const [isExistingPatient, setIsExistingPatient] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
            setIsExistingPatient(true);
        }
    }, [initialData]);


    useEffect(() => {
        window.scrollTo(0, 0);
    }, [currentStep]);

    const handleLoadTestData = (patientData: ClinicalData) => {
        setFormData(patientData);
        setIsExistingPatient(false); // Test patients are treated as new entries
        setIsPatientModalOpen(false);
        alert(`Se han cargado los datos para: ${patientData.filiatorios.nombre} ${patientData.filiatorios.apellido}.`);
    };

    const handleFiliatoriosChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let updatedFiliatorios = { ...formData.filiatorios, [name]: value };

        if (name === "fechaNacimiento") {
            const birthDate = new Date(value);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            updatedFiliatorios.edad = age >= 0 ? age.toString() : '';
        }
        setFormData({ ...formData, filiatorios: updatedFiliatorios });
    };

    const handleAnamnesisChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const updatedAnamnesis = { ...formData.anamnesis, [name]: value };

        if (name === 'qx' && value !== 'si') {
            updatedAnamnesis.osteosintesis1Tipo = '';
        }
        
        if (name === 'inmovilizacion' && value !== 'si') {
            updatedAnamnesis.inmovilizacion1Tipo = '';
            updatedAnamnesis.inmovilizacion1Periodo = '';
        }

        if (name === 'dmo' && value !== 'si') {
            updatedAnamnesis.ultimaDmo = '';
        }

        if (name === 'caidasFrecuentes' && value !== 'si') {
            updatedAnamnesis.caidas6meses = '';
        }


        setFormData({ ...formData, anamnesis: updatedAnamnesis });
    };

    const handlePhysicalExamChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
        const parts = name.split('.');

        setFormData(prev => {
            const newPhysicalExam = JSON.parse(JSON.stringify(prev.physicalExam)); // Deep copy to avoid mutation issues
            let currentLevel: any = newPhysicalExam;

            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                currentLevel = currentLevel[part];
            }

            currentLevel[parts[parts.length - 1]] = type === 'checkbox' ? checked : value;

            return { ...prev, physicalExam: newPhysicalExam };
        });
    };
    
    const handleRadiologyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            radiology: { ...prev.radiology, [name]: value }
        }));
    };
    
    const handleScalesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, scales: { ...formData.scales, [e.target.name]: e.target.value } });
    };
    
    const handleImpactChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            impact: { ...prev.impact, [name]: value }
        }));
    };

    const handlePRWEChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const [section, field] = name.split('.');
    
        const numValue = parseInt(value, 10);
        if (value !== '' && (isNaN(numValue) || numValue < 0 || numValue > 10)) {
            return;
        }
    
        setFormData(prev => ({
            ...prev,
            scales: {
                ...prev.scales,
                prwe: {
                    ...prev.scales.prwe,
                    [section]: {
                        // @ts-ignore
                        ...prev.scales.prwe[section],
                        [field]: value,
                    }
                }
            }
        }));
    };

    const prweScores = useMemo(() => {
        const { dolor, funcion } = formData.scales.prwe;
        const parse = (val: string) => parseInt(val, 10) || 0;
    
        const totalDolor = Object.values(dolor).reduce((sum, val) => sum + parse(val), 0);
        
        const totalFuncionRaw = Object.values(funcion).reduce((sum, val) => sum + parse(val), 0);
        const totalFuncion = totalFuncionRaw / 2;
        
        const prweGlobal = totalDolor + totalFuncion;
    
        return { totalDolor, totalFuncion, prweGlobal };
    }, [formData.scales.prwe]);

    const handleDASHChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const numValue = parseInt(value, 10);
        if (value !== '' && (isNaN(numValue) || numValue < 1 || numValue > 5)) {
            return;
        }
        setFormData(prev => ({
            ...prev,
            scales: {
                ...prev.scales,
                dash: {
                    ...prev.scales.dash,
                    items: {
                        ...prev.scales.dash.items,
                        [name]: value
                    }
                }
            }
        }));
    };

    const dashScores = useMemo(() => {
        const { items } = formData.scales.dash;
        const calculateScore = (itemKeys: string[]) => {
            const values = itemKeys.map(key => items[key]).filter(val => val && val !== '');
            if (values.length === 0) return null;
            const sum = values.reduce((acc, val) => acc + parseInt(val, 10), 0);
            const n = values.length;
            const score = ((sum / n) - 1) * 25;
            return Math.round(score * 100) / 100;
        };
        
        const mainKeys = Array.from({ length: 30 }, (_, i) => `item${i + 1}`);
        const workKeys = Array.from({ length: 4 }, (_, i) => `work${i + 1}`);
        const sportsKeys = Array.from({ length: 4 }, (_, i) => `sports${i + 1}`);

        const mainScore = calculateScore(mainKeys);
        const workScore = calculateScore(workKeys);
        const sportsScore = calculateScore(sportsKeys);

        return { mainScore, workScore, sportsScore };
    }, [formData.scales.dash.items]);

    const goToStep = (index: number) => {
        setCurrentStep(index);
    };

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

    const handleGenerateSummary = async () => {
        setIsLoadingAI(true);
         const fullFormData = {
            ...formData,
            scales: {
                ...formData.scales,
                dash: {
                    ...formData.scales.dash,
                    ...dashScores
                }
            }
        };
        const result = await generateAISummary(fullFormData);
        setSummary(result);
        setIsLoadingAI(false);
    };
    
    const handleSave = async () => {
      setIsSaving(true);
      try {
        const fullFormData = {
            ...formData,
            scales: {
                ...formData.scales,
                dash: {
                    ...formData.scales.dash,
                    ...dashScores
                }
            }
        };
        await saveClinicalRecord({...fullFormData, summary});
        alert('Ficha guardada con éxito!');
        onFormSubmit();
      } catch (error) {
        console.error("Error saving record:", error);
        alert('Hubo un error al guardar la ficha.');
      } finally {
        setIsSaving(false);
      }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const filePromises = Array.from(files).map(file => {
                return new Promise<StudyImage>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (loadEvent) => {
                        resolve({
                            name: file.name,
                            base64: loadEvent.target?.result as string,
                            type: file.type
                        });
                    };
                    reader.onerror = (error) => reject(error);
                    reader.readAsDataURL(file);
                });
            });

            Promise.all(filePromises).then(newlyReadStudies => {
                setFormData(prev => ({
                    ...prev,
                    radiology: { 
                        ...prev.radiology, 
                        studies: [...prev.radiology.studies, ...newlyReadStudies]
                    }
                }));
            });
            e.target.value = '';
        }
    };

    const handleRemoveImage = (indexToRemove: number) => {
        setFormData(prev => ({
            ...prev,
            radiology: {
                ...prev.radiology,
                studies: prev.radiology.studies.filter((_, index) => index !== indexToRemove)
            }
        }));
    };


    const handleInterpretImage = async () => {
        if (formData.radiology.studies.length === 0) {
            alert("Por favor, suba uno o más estudios primero.");
            return;
        }
        setIsLoadingRadiology(true);
        const result = await interpretRadiograph(formData.radiology.studies);
        setFormData(prev => ({
            ...prev,
            radiology: { ...prev.radiology, interpretation: result }
        }));
        setIsLoadingRadiology(false);
    };


    const isFiliatoriosComplete = useMemo(() => formData.filiatorios.nombre && formData.filiatorios.apellido && formData.filiatorios.dni, [formData.filiatorios]);

    const renderStepContent = () => {
        switch (STEPS[currentStep].id) {
            case 'filiatorios':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {isExistingPatient && (
                            <div className="md:col-span-2 lg:col-span-3 bg-blue-50 text-blue-800 p-4 rounded-lg border border-blue-200 text-sm">
                                Creando un nuevo registro para <strong>{formData.filiatorios.nombre} {formData.filiatorios.apellido}</strong>. Los datos filiatorios y de anamnesis han sido precargados desde el último registro.
                            </div>
                        )}
                        <Input label="Nombre" name="nombre" value={formData.filiatorios.nombre} onChange={handleFiliatoriosChange} required />
                        <Input label="Apellido" name="apellido" value={formData.filiatorios.apellido} onChange={handleFiliatoriosChange} required />
                        <Input label="DNI" name="dni" value={formData.filiatorios.dni} onChange={handleFiliatoriosChange} required readOnly={isExistingPatient} />
                        <Input label="Fecha de Nacimiento" name="fechaNacimiento" type="date" value={formData.filiatorios.fechaNacimiento} onChange={handleFiliatoriosChange} />
                        <Input label="Edad" name="edad" value={formData.filiatorios.edad} readOnly disabled />
                        <Input label="Estado Civil" name="estadoCivil" value={formData.filiatorios.estadoCivil} onChange={handleFiliatoriosChange} />
                        <Input label="Obra Social (Nombre y número)" name="obraSocial" value={formData.filiatorios.obraSocial} onChange={handleFiliatoriosChange} />
                        <Input label="Teléfono" name="telefono" value={formData.filiatorios.telefono} onChange={handleFiliatoriosChange} />
                        <Input label="Domicilio" name="domicilio" value={formData.filiatorios.domicilio} onChange={handleFiliatoriosChange} />
                        <Input label="Localidad" name="localidad" value={formData.filiatorios.localidad} onChange={handleFiliatoriosChange} />
                        <Input label="Partido" name="partido" value={formData.filiatorios.partido} onChange={handleFiliatoriosChange} />
                        <Input label="Ocupación" name="ocupacion" value={formData.filiatorios.ocupacion} onChange={handleFiliatoriosChange} />
                        <Input label="Actividades Actuales" name="actividadesActuales" value={formData.filiatorios.actividadesActuales} onChange={handleFiliatoriosChange} />
                        <Input label="Deportes Actuales" name="deportesActuales" value={formData.filiatorios.deportesActuales} onChange={handleFiliatoriosChange} />
                    </div>
                );
            case 'anamnesis':
                return (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Input label="Diagnóstico Médico" name="diagnosticoMedico" value={formData.anamnesis.diagnosticoMedico} onChange={handleAnamnesisChange} />
                        <Input label="Nombre y Apellido de médico/s tratante/s" name="medicoTratante" value={formData.anamnesis.medicoTratante} onChange={handleAnamnesisChange} />
                        <Input label="Fecha de Fractura/Lesión" name="fechaFractura" type="date" value={formData.anamnesis.fechaFractura} onChange={handleAnamnesisChange} />
                        <Textarea label="Causa de Fractura/Lesión" name="causaFractura" value={formData.anamnesis.causaFractura} onChange={handleAnamnesisChange} />
                        <Input label="Fecha Atención Médica" name="fechaAtencionMedica" type="date" value={formData.anamnesis.fechaAtencionMedica} onChange={handleAnamnesisChange} />
                        <Input label="Fecha Atención Kinésica" name="fechaAtencionKinesica" type="date" value={formData.anamnesis.fechaAtencionKinesica} onChange={handleAnamnesisChange} />
                         <Select label="Dominancia" name="dominancia" value={formData.anamnesis.dominancia} onChange={handleAnamnesisChange}>
                            <option value="">Seleccionar</option>
                            <option value="Derecha">Derecha</option>
                            <option value="Izquierda">Izquierda</option>
                            <option value="Ambidiestro">Ambidiestro</option>
                        </Select>
                        <Select label="Cirugía (Qx)" name="qx" value={formData.anamnesis.qx} onChange={handleAnamnesisChange}>
                           <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                        </Select>
                        <Input label="Osteosíntesis" name="osteosintesis1Tipo" value={formData.anamnesis.osteosintesis1Tipo} onChange={handleAnamnesisChange} disabled={formData.anamnesis.qx !== 'si'} placeholder="Tipo de material (si aplica)"/>
                        
                        <Select label="Inmovilización" name="inmovilizacion" value={formData.anamnesis.inmovilizacion} onChange={handleAnamnesisChange}>
                            <option value="">Seleccionar</option>
                            <option value="si">Sí</option>
                            <option value="no">No</option>
                        </Select>
                        <Input label="Tipo de Inmovilización" name="inmovilizacion1Tipo" value={formData.anamnesis.inmovilizacion1Tipo} onChange={handleAnamnesisChange} disabled={formData.anamnesis.inmovilizacion !== 'si'} placeholder="Ej: Yeso, Férula"/>
                        <Input label="Tiempo de Inmovilización" name="inmovilizacion1Periodo" value={formData.anamnesis.inmovilizacion1Periodo} onChange={handleAnamnesisChange} disabled={formData.anamnesis.inmovilizacion !== 'si'} placeholder="Ej: 4 semanas"/>
                        
                        <Select label="Diabetes" name="diabetes" value={formData.anamnesis.diabetes} onChange={handleAnamnesisChange}>
                           <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                        </Select>
                         <Select label="Tabaquismo" name="tabaquismo" value={formData.anamnesis.tabaquismo} onChange={handleAnamnesisChange}>
                           <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                        </Select>
                        <Select label="Osteoporosis/Osteopenia" name="osteopeniaOsteoporosis" value={formData.anamnesis.osteopeniaOsteoporosis} onChange={handleAnamnesisChange}>
                           <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                        </Select>
                        <Select label="Menopausia" name="menopausia" value={formData.anamnesis.menopausia} onChange={handleAnamnesisChange}>
                           <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                        </Select>
                        <Select label="¿DMO?" name="dmo" value={formData.anamnesis.dmo} onChange={handleAnamnesisChange}>
                           <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                        </Select>
                        <Input label="Última DMO" name="ultimaDmo" type="date" value={formData.anamnesis.ultimaDmo} onChange={handleAnamnesisChange} disabled={formData.anamnesis.dmo !== 'si'}/>
                        <Select label="Caídas Frecuentes" name="caidasFrecuentes" value={formData.anamnesis.caidasFrecuentes} onChange={handleAnamnesisChange}>
                           <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                        </Select>
                        <Input label="Nº caídas (6 meses)" name="caidas6meses" type="number" min="0" value={formData.anamnesis.caidas6meses} onChange={handleAnamnesisChange} disabled={formData.anamnesis.caidasFrecuentes !== 'si'} />
                         <div className="md:col-span-2 lg:col-span-3 border-t pt-4 mt-2">
                            <h3 className="text-md font-medium text-slate-800 mb-2">Medicación Actual</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Textarea label="Medicación para el Dolor" name="medicacionDolor" value={formData.anamnesis.medicacionDolor} onChange={handleAnamnesisChange} placeholder="Ej: Ibuprofeno 400mg cada 8hs" />
                                <Textarea label="Otra Medicación Relevante" name="medicacionExtra" value={formData.anamnesis.medicacionExtra} onChange={handleAnamnesisChange} placeholder="Listar otros medicamentos, dosis y frecuencia. Ej: Levotiroxina 50mcg/día, Omeprazol 20mg/día" />
                            </div>
                        </div>
                    </div>
                );
            case 'exam':
                const goniometriaMovements = [
                    { key: 'flexion', label: 'Flexión' },
                    { key: 'extension', label: 'Extensión' },
                    { key: 'inclinacionRadial', label: 'Desv. Radial' },
                    { key: 'inclinacionCubital', label: 'Desv. Cubital' },
                    { key: 'supinacion', label: 'Supinación' },
                    { key: 'pronacion', label: 'Pronación' },
                ];
                 const medidasKapandji = [
                    { key: 'estiloideo', label: 'Ø Estiloideo (cm)' },
                    { key: 'palmar', label: 'Ø Palmar (cm)' },
                    { key: 'mtcpf', label: 'Ø MTCPF (cm)' },
                ];
                const crpsRiskFactors = [
                    { name: 'manosTranspiran', label: 'Manos Transpiran' },
                    { name: 'tiroidismo', label: 'Tiroidismo' },
                    { name: 'dupuytren', label: 'Dupuytren' },
                    { name: 'hiperlipidemia', label: 'Hiperlipidemia' },
                    { name: 'altVascular', label: 'Alteraciones o Qx Vascular' },
                ];
                 return (
                     <div className="space-y-6">
                        <Textarea label="Inspección" name="inspeccion" value={formData.physicalExam.inspeccion} onChange={handlePhysicalExamChange} />
                        <div>
                            <Textarea label="Palpación" name="palpacion" value={formData.physicalExam.palpacion} onChange={handlePhysicalExamChange} />
                            <div className="mt-2">
                                <a
                                    href="https://app.tellmewhereithurtsnow.com/?clinic=5fe5b6d9-65f5-4b50-acce-6ea5a824118c&form=https://tellmewhereithurtsnow.com&theme=light"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                    Registrar Dolor en Mapa Corporal (TellMeWhereItHurts)
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                </a>
                            </div>
                        </div>
                        <Input label="Medida en 8 (Edema)" name="medidas.figuraEn8" value={formData.physicalExam.medidas.figuraEn8} onChange={handlePhysicalExamChange} placeholder="cm" />
                        
                        <fieldset className="border p-4 rounded-md">
                            <legend className="text-md font-medium px-2 text-slate-800">Medidas de Diámetro y Kapandji</legend>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 mt-2">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Medida</th>
                                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Derecha</th>
                                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Izquierda</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {medidasKapandji.map(item => {
                                            // FIX: Cast to GoniometriaValue to access properties safely.
                                            // The indexed access results in a union type `string | GoniometriaValue`
                                            // because `medidas` contains `figuraEn8` which is a string. We know
                                            // from `medidasKapandji` array that we are only accessing properties of
                                            // type `GoniometriaValue`.
                                            const medidaValue = formData.physicalExam.medidas[item.key as keyof typeof formData.physicalExam.medidas] as GoniometriaValue;
                                            return (
                                                <tr key={item.key}>
                                                    <td className="px-4 py-1.5 whitespace-nowrap text-sm font-medium text-slate-800">{item.label}</td>
                                                    <td className="px-4 py-1.5 whitespace-nowrap">
                                                       <Input label="" aria-label={`${item.label} Derecha`} name={`medidas.${item.key}.derecha`} value={medidaValue.derecha} onChange={handlePhysicalExamChange} className="!mt-0"/>
                                                    </td>
                                                    <td className="px-4 py-1.5 whitespace-nowrap">
                                                        <Input label="" aria-label={`${item.label} Izquierda`} name={`medidas.${item.key}.izquierda`} value={medidaValue.izquierda} onChange={handlePhysicalExamChange} className="!mt-0"/>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                         <tr>
                                            <td className="px-4 py-1.5 whitespace-nowrap text-sm font-medium text-slate-800">Test de Kapandji (/10)</td>
                                            <td className="px-4 py-1.5 whitespace-nowrap">
                                                <Input label="" aria-label="Test de Kapandji Derecha" name="testKapandji.derecha" value={formData.physicalExam.testKapandji.derecha} onChange={handlePhysicalExamChange} className="!mt-0"/>
                                            </td>
                                            <td className="px-4 py-1.5 whitespace-nowrap">
                                                <Input label="" aria-label="Test de Kapandji Izquierda" name="testKapandji.izquierda" value={formData.physicalExam.testKapandji.izquierda} onChange={handlePhysicalExamChange} className="!mt-0"/>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </fieldset>


                        <fieldset className="border p-4 rounded-md">
                            <legend className="text-md font-medium px-2 text-slate-800">Pruebas de Fractura de Escafoides</legend>
                            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Select label="Dolor en supinación contra resistencia" name="pruebasFracturaEscafoides.dolorSupinacionResistencia" value={formData.physicalExam.pruebasFracturaEscafoides.dolorSupinacionResistencia} onChange={handlePhysicalExamChange}>
                                        <option value="">Seleccionar</option>
                                        <option value="si">Sí</option>
                                        <option value="no">No</option>
                                    </Select>
                                    <p className="mt-1 text-xs text-slate-500">LR+ 45. Muy fuerte para sospecha.</p>
                                </div>
                                <div>
                                    <Select label="Supinación < 10% del lado opuesto" name="pruebasFracturaEscafoides.supinacionLimitada" value={formData.physicalExam.pruebasFracturaEscafoides.supinacionLimitada} onChange={handlePhysicalExamChange}>
                                        <option value="">Seleccionar</option>
                                        <option value="si">Sí</option>
                                        <option value="no">No</option>
                                    </Select>
                                </div>
                                <div>
                                    <Select label="Dolor en desviación cubital" name="pruebasFracturaEscafoides.dolorDesviacionCubital" value={formData.physicalExam.pruebasFracturaEscafoides.dolorDesviacionCubital} onChange={handlePhysicalExamChange}>
                                        <option value="">Seleccionar</option>
                                        <option value="si">Sí</option>
                                        <option value="no">No</option>
                                    </Select>
                                </div>
                                <div>
                                    <Select label="Dolor en tabaquera anatómica" name="pruebasFracturaEscafoides.dolorTabaqueraAnatomica" value={formData.physicalExam.pruebasFracturaEscafoides.dolorTabaqueraAnatomica} onChange={handlePhysicalExamChange}>
                                        <option value="">Seleccionar</option>
                                        <option value="si">Sí</option>
                                        <option value="no">No</option>
                                    </Select>
                                    <p className="mt-1 text-xs text-slate-500">Ausencia de dolor reduce probabilidad (LR- 0.2).</p>
                                </div>
                            </div>
                            <p className="mt-3 text-xs text-slate-500 bg-slate-50 p-2 rounded-md">
                                <strong>Nota:</strong> Ninguna prueba por sí sola descarta una fractura, pero la combinación mejora la especificidad. El dolor a la supinación contra resistencia es un fuerte indicador. (Rev. Sistemática 2023)
                            </p>
                        </fieldset>

                        <fieldset className="border p-4 rounded-md">
                            <legend className="text-md font-medium px-2 text-slate-800">Lesión del Complejo Fibrocartílago Triangular (CFCT)</legend>
                            <div className="mt-2 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Localización del Dolor</label>
                                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                                        <Checkbox id="cft-loc-cubital" label="Lado cubital" name="cftLesion.dolorLocalizacion.ladoCubital" checked={formData.physicalExam.cftLesion.dolorLocalizacion.ladoCubital} onChange={handlePhysicalExamChange} />
                                        <Checkbox id="cft-loc-fovea" label="Fóvea cubital" name="cftLesion.dolorLocalizacion.foveaCubital" checked={formData.physicalExam.cftLesion.dolorLocalizacion.foveaCubital} onChange={handlePhysicalExamChange} />
                                        <Checkbox id="cft-loc-dorsal" label="Dorsal" name="cftLesion.dolorLocalizacion.dorsal" checked={formData.physicalExam.cftLesion.dolorLocalizacion.dorsal} onChange={handlePhysicalExamChange} />
                                        <Checkbox id="cft-loc-palmar" label="Palmar" name="cftLesion.dolorLocalizacion.palmar" checked={formData.physicalExam.cftLesion.dolorLocalizacion.palmar} onChange={handlePhysicalExamChange} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Select label="Tipo de Dolor" name="cftLesion.dolorTipo" value={formData.physicalExam.cftLesion.dolorTipo} onChange={handlePhysicalExamChange}>
                                        <option value="">Seleccionar</option>
                                        <option value="mecanico">Mecánico</option>
                                        <option value="constante">Constante</option>
                                    </Select>
                                    <Input label="Desencadenantes del Dolor" name="cftLesion.dolorDesencadenantes" value={formData.physicalExam.cftLesion.dolorDesencadenantes} onChange={handlePhysicalExamChange} placeholder="Ej: Abrir pomo, levantar jarra..." />
                                </div>
                                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t mt-4">
                                    <Select label="Chasquido en pronosupinación" name="cftLesion.chasquidoPronosupinacion" value={formData.physicalExam.cftLesion.chasquidoPronosupinacion} onChange={handlePhysicalExamChange}>
                                        <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                                    </Select>
                                    <Select label="Crepitación en rotación" name="cftLesion.crepitacionRotacion" value={formData.physicalExam.cftLesion.crepitacionRotacion} onChange={handlePhysicalExamChange}>
                                        <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                                    </Select>
                                    <Select label="Sensación de inestabilidad" name="cftLesion.sensacionInestabilidad" value={formData.physicalExam.cftLesion.sensacionInestabilidad} onChange={handlePhysicalExamChange}>
                                        <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                                    </Select>
                                    <Select label="Tumefacción en RCD" name="cftLesion.tumefaccionRCD" value={formData.physicalExam.cftLesion.tumefaccionRCD} onChange={handlePhysicalExamChange}>
                                        <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t mt-4">
                                    <Select label="Test de la fóvea cubital" name="cftLesion.testFoveaCubital" value={formData.physicalExam.cftLesion.testFoveaCubital} onChange={handlePhysicalExamChange}>
                                        <option value="">Seleccionar</option><option value="positivo">Positivo</option><option value="negativo">Negativo</option>
                                    </Select>
                                    <Select label="Test de estrés cubital" name="cftLesion.testEstresCubital" value={formData.physicalExam.cftLesion.testEstresCubital} onChange={handlePhysicalExamChange}>
                                        <option value="">Seleccionar</option><option value="positivo">Positivo</option><option value="negativo">Negativo</option>
                                    </Select>
                                    <Select label="Signo de la tecla de piano" name="cftLesion.signoTeclaPiano" value={formData.physicalExam.cftLesion.signoTeclaPiano} onChange={handlePhysicalExamChange}>
                                        <option value="">Seleccionar</option><option value="positivo">Positivo</option><option value="negativo">Negativo</option>
                                    </Select>
                                    <Select label="Test de peloteo cúbito-carpiano" name="cftLesion.testPeloteoCubitoCarpiano" value={formData.physicalExam.cftLesion.testPeloteoCubitoCarpiano} onChange={handlePhysicalExamChange}>
                                        <option value="">Seleccionar</option><option value="positivo">Positivo</option><option value="negativo">Negativo</option>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t mt-4">
                                    <Select label="Limitación dolorosa de pronosup." name="cftLesion.limitacionDolorPronosupinacion" value={formData.physicalExam.cftLesion.limitacionDolorPronosupinacion} onChange={handlePhysicalExamChange}>
                                        <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                                    </Select>
                                    <Select label="Dolor con desviación cubital (test)" name="cftLesion.dolorTestDesviacionCubital" value={formData.physicalExam.cftLesion.dolorTestDesviacionCubital} onChange={handlePhysicalExamChange}>
                                        <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                                    </Select>
                                    <Select label="Fuerza de prensión disminuida" name="cftLesion.fuerzaPrensionDisminuida" value={formData.physicalExam.cftLesion.fuerzaPrensionDisminuida} onChange={handlePhysicalExamChange}>
                                        <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                                    </Select>
                                </div>
                            </div>
                        </fieldset>

                        <fieldset className="border p-4 rounded-md">
                            <legend className="text-md font-medium px-2 text-slate-800">Riesgo de Capsulitis Adhesiva / Rigidez</legend>
                            <p className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-md">
                                <strong>Contexto:</strong> Períodos de inmovilización cortos (3-4 semanas) muestran mejores resultados funcionales que los largos (5-6 sem) en fracturas de radio distal no desplazadas, sin comprometer la consolidación (Sayudo et al., 2024).
                            </p>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <Input label="Duración Inmovilización (Semanas)" name="riesgoCapsulitisAdhesiva.duracionInmovilizacionSemanas" value={formData.physicalExam.riesgoCapsulitisAdhesiva.duracionInmovilizacionSemanas} onChange={handlePhysicalExamChange} type="number" />
                                <Input label="Tipo de Yeso/Férula" name="riesgoCapsulitisAdhesiva.tipoInmovilizacion" value={formData.physicalExam.riesgoCapsulitisAdhesiva.tipoInmovilizacion} onChange={handlePhysicalExamChange} />
                                <Input label="Posición Inicial de la Muñeca" name="riesgoCapsulitisAdhesiva.posicionMunecaInmovilizacion" value={formData.physicalExam.riesgoCapsulitisAdhesiva.posicionMunecaInmovilizacion} onChange={handlePhysicalExamChange} />
                                <Select label="Limitación ROM Pasivo" name="riesgoCapsulitisAdhesiva.romPasivoLimitado" value={formData.physicalExam.riesgoCapsulitisAdhesiva.romPasivoLimitado} onChange={handlePhysicalExamChange}>
                                    <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                                </Select>
                                <Select label="Test de Compresión Radiocarpiana" name="riesgoCapsulitisAdhesiva.testCompresionRadiocarpiana" value={formData.physicalExam.riesgoCapsulitisAdhesiva.testCompresionRadiocarpiana} onChange={handlePhysicalExamChange}>
                                    <option value="">Seleccionar</option><option value="positivo">Positivo</option><option value="negativo">Negativo</option>
                                </Select>
                                <div className="lg:col-span-3">
                                    <Textarea label="Hallazgos en Tejido Blando" name="riesgoCapsulitisAdhesiva.hallazgosTejidoBlando" value={formData.physicalExam.riesgoCapsulitisAdhesiva.hallazgosTejidoBlando} onChange={handlePhysicalExamChange} placeholder="Ej: Fibrosis, atrofia muscular..." rows={2}/>
                                </div>
                                <div className="md:col-span-2 lg:col-span-3">
                                    <label className="block text-sm font-medium text-slate-700">Factores de Riesgo / Signos de CRPS</label>
                                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 p-3 bg-slate-50 rounded-md border">
                                        {crpsRiskFactors.map(factor => (
                                            <Checkbox 
                                                key={factor.name}
                                                id={`crps-${factor.name}`}
                                                label={factor.label} 
                                                name={`riesgoCapsulitisAdhesiva.signosCRPS.${factor.name}`} 
                                                checked={formData.physicalExam.riesgoCapsulitisAdhesiva.signosCRPS[factor.name as keyof typeof formData.physicalExam.riesgoCapsulitisAdhesiva.signosCRPS]} 
                                                onChange={handlePhysicalExamChange} 
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </fieldset>

                        <fieldset className="border p-4 rounded-md">
                            <legend className="text-md font-medium px-2 text-slate-800">Goniometría (°)</legend>
                            <div className="overflow-x-auto">
                               <table className="min-w-full divide-y divide-slate-200 mt-2">
                                   <thead className="bg-slate-50">
                                       <tr>
                                           <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Movimiento</th>
                                           <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Derecha</th>
                                           <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Izquierda</th>
                                       </tr>
                                   </thead>
                                   <tbody className="bg-white divide-y divide-slate-200">
                                       {goniometriaMovements.map(mov => (
                                           <tr key={mov.key}>
                                               <td className="px-4 py-1.5 whitespace-nowrap text-sm font-medium text-slate-800">{mov.label}</td>
                                               <td className="px-4 py-1.5 whitespace-nowrap">
                                                  <Input label="" aria-label={`${mov.label} Derecha`} name={`goniometria.${mov.key}.derecha`} value={formData.physicalExam.goniometria[mov.key as keyof typeof formData.physicalExam.goniometria].derecha} onChange={handlePhysicalExamChange} className="!mt-0"/>
                                               </td>
                                               <td className="px-4 py-1.5 whitespace-nowrap">
                                                   <Input label="" aria-label={`${mov.label} Izquierda`} name={`goniometria.${mov.key}.izquierda`} value={formData.physicalExam.goniometria[mov.key as keyof typeof formData.physicalExam.goniometria].izquierda} onChange={handlePhysicalExamChange} className="!mt-0"/>
                                               </td>
                                           </tr>
                                       ))}
                                   </tbody>
                               </table>
                           </div>
                        </fieldset>
                     </div>
                 );
            case 'radiology':
                return (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-slate-700 border-b pb-2">Estudios Complementarios</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start pt-4">
                            {/* Left Column: Interactive Area */}
                            <div className="space-y-6">
                                <div>
                                    <label htmlFor="radiograph-upload" className="block text-sm font-medium text-slate-700">Subir estudios complementarios</label>
                                    <input id="radiograph-upload" type="file" accept="image/*" onChange={handleImageUpload} multiple className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                                </div>
                                
                                {formData.radiology.studies.length > 0 && (
                                    <div className="space-y-4 animate-fadeIn">
                                        <div>
                                            <h3 className="font-semibold text-slate-800">Vistas Previas ({formData.radiology.studies.length})</h3>
                                            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                {formData.radiology.studies.map((study, index) => (
                                                    <div key={index} className="relative group bg-slate-50 p-2 rounded-lg border">
                                                        <img src={study.base64} alt={study.name} className="rounded-md w-full h-28 object-cover" />
                                                        <p className="text-xs text-slate-600 mt-1 truncate" title={study.name}>{study.name}</p>
                                                        <button
                                                            onClick={() => handleRemoveImage(index)}
                                                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                                                            aria-label={`Eliminar ${study.name}`}
                                                        >
                                                            <CloseIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                             <button onClick={handleInterpretImage} disabled={isLoadingRadiology}  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                                                {isLoadingRadiology ? <><LoaderIcon /> Analizando...</> : <><SparklesIcon /> Interpretar con IA</>}
                                             </button>
                                             <Textarea label="Interpretación de IA (Editable)" name="interpretation" value={formData.radiology.interpretation} onChange={handleRadiologyChange} rows={10} disabled={isLoadingRadiology} />
                                             <fieldset className="border p-4 rounded-md mt-4">
                                                <legend className="text-md font-medium px-2 text-slate-800">Parámetros Radiográficos Medidos</legend>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                                    <Input label="Inclinación Radial (°)" name="inclinacionRadial" value={formData.radiology.inclinacionRadial || ''} onChange={handleRadiologyChange} type="number" />
                                                    <Input label="Inclinación Palmar (°)" name="inclinacionPalmar" value={formData.radiology.inclinacionPalmar || ''} onChange={handleRadiologyChange} type="number" />

                                                    {/* Varianza Cubital Section */}
                                                    <div className="md:col-span-2 space-y-3 border-t pt-4 mt-2">
                                                        <label className="block text-sm font-medium text-slate-700">Varianza Cubital (RX PA neutra)</label>
                                                        
                                                        <div className="flex flex-col sm:flex-row gap-4 items-start">
                                                            <div className="space-y-2 flex-grow">
                                                                <div className="flex items-start">
                                                                    <input id="vc-neutra" name="varianzaCubitalClasificacion" type="radio" value="neutra" checked={formData.radiology.varianzaCubitalClasificacion === 'neutra'} onChange={handleRadiologyChange} className="h-4 w-4 mt-1 border-slate-300 text-blue-600 focus:ring-blue-600" />
                                                                    <label htmlFor="vc-neutra" className="ml-3 block text-sm text-slate-900">
                                                                        <span className="font-semibold">Neutra (–1 a +2 mm):</span> <span className="text-slate-600">Distribución normal de cargas.</span>
                                                                    </label>
                                                                </div>
                                                                <div className="flex items-start">
                                                                    <input id="vc-positiva" name="varianzaCubitalClasificacion" type="radio" value="positiva" checked={formData.radiology.varianzaCubitalClasificacion === 'positiva'} onChange={handleRadiologyChange} className="h-4 w-4 mt-1 border-slate-300 text-blue-600 focus:ring-blue-600" />
                                                                    <label htmlFor="vc-positiva" className="ml-3 block text-sm text-slate-900">
                                                                        <span className="font-semibold">Positiva (&gt; +2 mm):</span> <span className="text-slate-600">↑ carga cubital (TFCC, artrosis).</span>
                                                                    </label>
                                                                </div>
                                                                <div className="flex items-start">
                                                                    <input id="vc-negativa" name="varianzaCubitalClasificacion" type="radio" value="negativa" checked={formData.radiology.varianzaCubitalClasificacion === 'negativa'} onChange={handleRadiologyChange} className="h-4 w-4 mt-1 border-slate-300 text-blue-600 focus:ring-blue-600" />
                                                                    <label htmlFor="vc-negativa" className="ml-3 block text-sm text-slate-900">
                                                                        <span className="font-semibold">Negativa (&lt; –1 mm):</span> <span className="text-slate-600">↑ riesgo Kienböck / sobrecarga radial.</span>
                                                                    </label>
                                                                </div>
                                                            </div>

                                                            <div className="w-full sm:w-40 sm:flex-shrink-0">
                                                                <Input 
                                                                    label="Valor exacto" 
                                                                    name="varianzaCubital" 
                                                                    value={formData.radiology.varianzaCubital || ''} 
                                                                    onChange={handleRadiologyChange} 
                                                                    type="number"
                                                                    step="0.1"
                                                                    placeholder="mm"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Clasificación de fractura de radio distal */}
                                                    <div className="md:col-span-2 space-y-3 border-t pt-4 mt-2">
                                                        <label className="block text-sm font-medium text-slate-700">Clasificación de fractura de radio distal</label>
                                                        <div className="space-y-2">
                                                            <div className="flex items-start">
                                                                <input id="frd-estable" name="clasificacionFracturaRadioDistal" type="radio" value="estable" checked={formData.radiology.clasificacionFracturaRadioDistal === 'estable'} onChange={handleRadiologyChange} className="h-4 w-4 mt-1 border-slate-300 text-blue-600 focus:ring-blue-600" />
                                                                <label htmlFor="frd-estable" className="ml-3 block text-sm text-slate-900">
                                                                    <span className="font-semibold">Estable:</span> <span className="text-slate-600">Angulación &lt; 9°, sin conminución o leve, acortamiento &lt; 4 mm.</span>
                                                                </label>
                                                            </div>
                                                            <div className="flex items-start">
                                                                <input id="frd-potencial" name="clasificacionFracturaRadioDistal" type="radio" value="potencialmente_inestable" checked={formData.radiology.clasificacionFracturaRadioDistal === 'potencialmente_inestable'} onChange={handleRadiologyChange} className="h-4 w-4 mt-1 border-slate-300 text-blue-600 focus:ring-blue-600" />
                                                                <label htmlFor="frd-potencial" className="ml-3 block text-sm text-slate-900">
                                                                    <span className="font-semibold">Potencialmente inestable:</span> <span className="text-slate-600">Angulación &gt; 10°, conminución moderada, acortamiento &gt; 5 mm.</span>
                                                                </label>
                                                            </div>
                                                            <div className="flex items-start">
                                                                <input id="frd-inestable" name="clasificacionFracturaRadioDistal" type="radio" value="inestable" checked={formData.radiology.clasificacionFracturaRadioDistal === 'inestable'} onChange={handleRadiologyChange} className="h-4 w-4 mt-1 border-slate-300 text-blue-600 focus:ring-blue-600" />
                                                                <label htmlFor="frd-inestable" className="ml-3 block text-sm text-slate-900">
                                                                    <span className="font-semibold">Inestable:</span> <span className="text-slate-600">Angulación ≥ 29°, conminución severa, acortamiento &gt; 10 mm.</span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </fieldset>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Right Column: Reference Image */}
                            <div className="lg:sticky lg:top-24 space-y-6">
                                 <div>
                                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Guía de Clasificación AO</h3>
                                    <p className="text-sm text-slate-500 mb-4">Referencia para fracturas de radio distal.</p>
                                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                                        <img src="https://i.imgur.com/jj36j4Q.png" alt="Guía de Clasificación AO para fracturas" className="rounded-md w-full" />
                                    </div>
                                 </div>
                                 <div>
                                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Parámetros Radiográficos</h3>
                                    <p className="text-sm text-slate-500 mb-4">Referencia para mediciones angulares.</p>
                                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                                        <img src="https://i.imgur.com/aWDOshk.png" alt="Parámetros radiográficos de la muñeca" className="rounded-md w-full" />
                                    </div>
                                 </div>
                            </div>
                        </div>
                    </div>
                );
            case 'scales':
                 const prweDolorItems = [
                    { name: 'enReposo', label: 'Cuando tiene la mano en reposo' },
                    { name: 'movimientoRepetitivo', label: 'Al realizar una tarea con mov. repetitivo' },
                    { name: 'objetoPesado', label: 'Al levantar un objeto pesado' },
                    { name: 'peorMomento', label: 'Cuando el dolor está en su peor momento' },
                    { name: 'conQueFrecuencia', label: '¿Qué tan seguido experimenta su dolor?' },
                ];
                const prweFuncionEspecificaItems = [
                    { name: 'darVueltaManija', label: 'Al dar vuelta la manija de la puerta' },
                    { name: 'cortarCarne', label: 'Al cortar carne con un cuchillo' },
                    { name: 'abrocharseCamisa', label: 'Al abrocharse una camisa' },
                    { name: 'levantarseSilla', label: 'Al levantarse de una silla con la mano' },
                    { name: 'cargar5kg', label: 'Al cargar 5 kg con la mano afectada' },
                    { name: 'usarPapelHigienico', label: 'Al usar papel higiénico con la mano' },
                ];
                const prweFuncionCotidianaItems = [
                    { name: 'cuidadoPersonal', label: 'Actividades de cuidado personal' },
                    { name: 'tareasHogar', label: 'Tareas del hogar' },
                    { name: 'trabajo', label: 'Trabajo (su trabajo habitual)' },
                    { name: 'tiempoLibre', label: 'Actividades de tiempo libre' },
                ];
                const dashMainItems = [
                    "Abrir un frasco nuevo y apretado", "Escribir", "Girar una llave", "Preparar una comida", "Empujar para abrir una puerta pesada",
                    "Colocar un objeto en un estante por encima de su cabeza", "Hacer tareas domésticas pesadas (ej. lavar paredes, pisos)", "Hacer jardinería o trabajo de patio", "Hacer la cama", "Cargar una bolsa de compras o un maletín",
                    "Cargar un objeto pesado (más de 5 kg)", "Cambiar una bombilla de luz por encima de la cabeza", "Lavarse o secarse el pelo", "Lavarse la espalda", "Ponerse un pullover",
                    "Usar un cuchillo para cortar alimentos", "Actividades recreativas que requieren poco esfuerzo (ej. jugar a las cartas, tejer)", "Actividades recreativas en las que usted se golpea el brazo (ej. golf, tenis, martillar)", "Actividades recreativas en las que usted se mueve con libertad (ej. nadar, jugar a los bolos)", "Manejar sus finanzas (ej. usar el transporte, ir de compras)",
                    "Dolor en el brazo, hombro o mano", "Dolor en el brazo, hombro o mano al realizar una actividad específica", "Hormigueo (sensación de alfileres y agujas) en su brazo, hombro o mano", "Debilidad en su brazo, hombro o mano", "Rigidez en su brazo, hombro o mano",
                    "Dificultad para dormir debido al dolor", "Me siento menos capaz, menos seguro o menos útil", "Interferencia social normal con familia, amigos, vecinos o grupos", "Dificultad para trabajar o realizar sus tareas diarias", "Dificultad para usar su técnica habitual para la actividad"
                ];
                const dashWorkItems = ["Usar su técnica habitual para hacer su trabajo", "Hacer su trabajo habitual debido al dolor en el brazo, hombro o mano", "Hacer su trabajo tan bien como le gustaría", "Pasar su tiempo habitual haciendo su trabajo"];
                const dashSportsItems = ["Usar su técnica habitual para tocar su instrumento o practicar su deporte", "Tocar su instrumento o practicar su deporte debido al dolor en el brazo, hombro o mano", "Tocar su instrumento o practicar su deporte tan bien como le gustaría", "Pasar su tiempo habitual tocando su instrumento o practicando su deporte"];

                return (
                    <div className="space-y-6">
                        <div className="p-4 border rounded-lg bg-slate-50">
                            <label htmlFor="dolorVAS" className="block text-lg font-semibold text-slate-800 mb-2">Escala Visual Analógica (EVA) de Dolor Actual</label>
                            <p className="text-sm text-slate-600 mb-4">Mueva el cursor para indicar el nivel de dolor que siente en este momento.</p>
                            <img src="https://i.imgur.com/3xDcVvb.png" alt="Escala Visual Analógica de Dolor" className="w-full h-auto object-contain rounded-md" />
                            <input
                                id="dolorVAS"
                                type="range"
                                min="0"
                                max="10"
                                step="1"
                                name="dolorVAS"
                                value={formData.scales.dolorVAS || '0'}
                                onChange={handleScalesChange}
                                className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-4 accent-blue-600"
                            />
                            <div className="flex justify-between text-xs text-slate-500 px-1 mt-1">
                                <span>0 (Sin Dolor)</span>
                                <span>5</span>
                                <span>10 (Peor Dolor)</span>
                            </div>
                            <div className="text-center mt-4">
                                <span className="text-slate-700">Nivel de Dolor Seleccionado: </span>
                                <span className="text-2xl font-bold text-blue-600">{formData.scales.dolorVAS || '0'}</span>
                                <span className="text-slate-600"> / 10</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            {[
                              {name: "dolorNocturnoSeveridad", label: "Dolor Nocturno - Severidad (0-10)"},
                              {name: "dolorDiurnoFrecuencia", label: "Dolor Diurno - Frecuencia (0-10)"},
                              {name: "entumecimiento", label: "Entumecimiento (0-10)"},
                              {name: "debilidad", label: "Debilidad (0-10)"},
                              {name: "hormigueo", label: "Hormigueo (0-10)"},
                              {name: "dificultadAgarre", label: "Dificultad Agarre (0-10)"}
                            ].map(({name, label}) => (
                               <Input key={name} label={label} name={name} type="number" min="0" max="10" 
                               // @ts-ignore
                               value={formData.scales[name]} onChange={handleScalesChange} />
                            ))}
                            <div>
                                <Input label="Get up and Go Test (TUG)" name="tugTest" value={formData.scales.tugTest} onChange={handleScalesChange} placeholder="segs." />
                                <p className="mt-1 text-xs text-slate-500">* &gt;20s implica riesgo de caídas</p>
                            </div>
                        </div>

                         <div className="border-t pt-6 mt-6">
                            <div className="border-b border-gray-200">
                                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                                    <button onClick={() => setActiveScaleTab('prwe')} className={`${activeScaleTab === 'prwe' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Cuestionario PRWE</button>
                                    <button onClick={() => setActiveScaleTab('dash')} className={`${activeScaleTab === 'dash' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Cuestionario DASH</button>
                                </nav>
                            </div>

                            <div className="mt-6">
                            {activeScaleTab === 'prwe' && (
                                <div className="space-y-6 animate-fadeIn">
                                    <h4 className="text-lg font-semibold text-slate-700">PRWE: <span className="text-sm font-normal text-slate-500">Evalúe dolor/dificultad en la última semana. Si no realizó una actividad, estime el valor.</span></h4>
                                    <div>
                                        <h5 className="font-medium text-slate-600 mb-3">1. Dolor (0 = Sin dolor, 10 = Máximo dolor)</h5>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {prweDolorItems.map(item => <Input key={item.name} label={item.label} name={`dolor.${item.name}`} type="number" min="0" max="10" value={formData.scales.prwe.dolor[item.name as keyof typeof formData.scales.prwe.dolor]} onChange={handlePRWEChange} />)}
                                        </div>
                                    </div>
                                    <div>
                                        <h5 className="font-medium text-slate-600 mb-2">2. Función (0 = Sin dificultad, 10 = Imposible)</h5>
                                        <div className="space-y-4">
                                            <div>
                                                <h6 className="font-normal text-slate-500 mb-2">A. Actividades Específicas</h6>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {prweFuncionEspecificaItems.map(item => <Input key={item.name} label={item.label} name={`funcion.${item.name}`} type="number" min="0" max="10" value={formData.scales.prwe.funcion[item.name as keyof typeof formData.scales.prwe.funcion]} onChange={handlePRWEChange} />)}
                                                </div>
                                            </div>
                                            <div>
                                                <h6 className="font-normal text-slate-500 mb-2">B. Actividades Cotidianas</h6>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {prweFuncionCotidianaItems.map(item => <Input key={item.name} label={item.label} name={`funcion.${item.name}`} type="number" min="0" max="10" value={formData.scales.prwe.funcion[item.name as keyof typeof formData.scales.prwe.funcion]} onChange={handlePRWEChange} />)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <h4 className="text-lg font-semibold text-blue-800">Resumen de Puntuación PRWE</h4>
                                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                                            <div><div className="text-sm font-medium text-blue-700">Total Dolor</div><div className="text-2xl font-bold text-blue-900">{prweScores.totalDolor} <span className="text-lg font-medium text-slate-500">/ 50</span></div></div>
                                            <div><div className="text-sm font-medium text-blue-700">Total Función</div><div className="text-2xl font-bold text-blue-900">{prweScores.totalFuncion} <span className="text-lg font-medium text-slate-500">/ 50</span></div></div>
                                            <div><div className="text-sm font-bold text-blue-700">PRWE GLOBAL</div><div className="text-2xl font-bold text-blue-900">{prweScores.prweGlobal} <span className="text-lg font-medium text-slate-500">/ 100</span></div></div>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <a
                                            href="https://docs.google.com/forms/d/e/1FAIpQLSeEq-NSf7qRq_IYPsBEYgNCm5sdp1JjWlCVnvrsDO_u9yCkDA/viewform?usp=dialog"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                                        >
                                            Completar PRWE en formulario externo
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                        </a>
                                    </div>
                                </div>
                            )}

                            {activeScaleTab === 'dash' && (
                                <div className="space-y-6 animate-fadeIn">
                                    <h4 className="text-lg font-semibold text-slate-700">DASH: <span className="text-sm font-normal text-slate-500">Indique el grado de dificultad para realizar las siguientes actividades en la última semana.</span></h4>
                                    <p className="text-xs text-slate-500 -mt-4">1 = Sin dificultad, 2 = Dificultad leve, 3 = Dificultad moderada, 4 = Dificultad severa, 5 = Imposible de hacer</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                        {dashMainItems.map((label, index) => (
                                            <Input key={`item${index + 1}`} label={`${index + 1}. ${label}`} name={`item${index + 1}`} type="number" min="1" max="5" value={formData.scales.dash.items[`item${index + 1}`] || ''} onChange={handleDASHChange} />
                                        ))}
                                    </div>
                                    
                                    <fieldset className="border p-4 rounded-md mt-4">
                                        <legend className="text-md font-medium px-2 text-slate-800">Módulo Opcional - Trabajo</legend>
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2">
                                            {dashWorkItems.map((label, index) => (
                                                <Input key={`work${index + 1}`} label={label} name={`work${index + 1}`} type="number" min="1" max="5" value={formData.scales.dash.items[`work${index + 1}`] || ''} onChange={handleDASHChange} />
                                            ))}
                                        </div>
                                    </fieldset>
                                    
                                    <fieldset className="border p-4 rounded-md mt-4">
                                        <legend className="text-md font-medium px-2 text-slate-800">Módulo Opcional - Deportes / Música</legend>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2">
                                            {dashSportsItems.map((label, index) => (
                                                <Input key={`sports${index + 1}`} label={label} name={`sports${index + 1}`} type="number" min="1" max="5" value={formData.scales.dash.items[`sports${index + 1}`] || ''} onChange={handleDASHChange} />
                                            ))}
                                        </div>
                                    </fieldset>
                                    
                                    <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                                        <h4 className="text-lg font-semibold text-purple-800">Resumen de Puntuación DASH</h4>
                                        <p className="text-xs text-purple-600 mb-3">La puntuación se calcula con los campos completados. Un mínimo de 27/30 items principales son necesarios para un resultado válido.</p>
                                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                                            <div><div className="text-sm font-bold text-purple-700">DASH Global</div><div className="text-2xl font-bold text-purple-900">{dashScores.mainScore !== null ? dashScores.mainScore : 'N/A'} <span className="text-lg font-medium text-slate-500">/ 100</span></div></div>
                                            <div><div className="text-sm font-medium text-purple-700">Módulo Trabajo</div><div className="text-2xl font-bold text-purple-900">{dashScores.workScore !== null ? dashScores.workScore : 'N/A'} <span className="text-lg font-medium text-slate-500">/ 100</span></div></div>
                                            <div><div className="text-sm font-medium text-purple-700">Módulo Deportes/Música</div><div className="text-2xl font-bold text-purple-900">{dashScores.sportsScore !== null ? dashScores.sportsScore : 'N/A'} <span className="text-lg font-medium text-slate-500">/ 100</span></div></div>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <a
                                            href="https://docs.google.com/forms/d/e/1FAIpQLSeIHNOloRS7ScT1hU8bbaYfvGQbwykoVCLpWdFKsq1FYHTF8g/viewform?usp=header"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                                        >
                                            Completar DASH en formulario externo
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                        </a>
                                    </div>
                                </div>
                            )}
                            </div>
                         </div>
                    </div>
                );
             case 'impact':
                const FlagSection: React.FC<{color: string; title: string; children: React.ReactNode}> = ({ color, title, children }) => (
                    <div className="rounded-lg border-l-4 p-4 bg-slate-50/50" style={{ borderLeftColor: color }}>
                        <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800">
                            <span className="w-4 h-4 rounded-full" style={{ backgroundColor: color }}></span>
                            {title}
                        </h3>
                        <div className="mt-4 space-y-4 pl-7">
                            {children}
                        </div>
                    </div>
                );

                return (
                    <div className="space-y-6">
                        <Textarea 
                           label="Interpretación del Profesional / Hipótesis Clínica" 
                           name="interpretacionProfesional" 
                           value={formData.impact.interpretacionProfesional} 
                           onChange={handleImpactChange} 
                           rows={3} 
                           placeholder="Describa su hipótesis clínica inicial, factores contribuyentes, y pronóstico preliminar..."/>

                        <div className="space-y-6">
                           <FlagSection color="#ef4444" title="Rojas (Orgánico/Urgencia)">
                                <Select label="¿El dolor empezó tras golpe/caída fuerte?" name="roja_dolor_golpe" value={formData.impact.roja_dolor_golpe} onChange={handleImpactChange}>
                                    <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                                </Select>
                                <Select label="¿Hay fiebre, inflamación marcada o pérdida repentina de fuerza?" name="roja_fiebre_inflamacion" value={formData.impact.roja_fiebre_inflamacion} onChange={handleImpactChange}>
                                    <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                                </Select>
                                {(formData.impact.roja_dolor_golpe === 'si' || formData.impact.roja_fiebre_inflamacion === 'si') && (
                                    <div className="p-4 rounded-md bg-red-50 border border-red-200 space-y-4 animate-fadeIn">
                                        <h4 className="font-semibold text-red-800">Indagar más (2ª Estación)</h4>
                                        <Select label="¿El dolor empeoró en las últimas 24–48 hs?" name="roja_dolor_empeoro" value={formData.impact.roja_dolor_empeoro} onChange={handleImpactChange}>
                                            <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                                        </Select>
                                        <Select label="¿Puede mover la mano/dedos igual que antes?" name="roja_movilidad_mano" value={formData.impact.roja_movilidad_mano} onChange={handleImpactChange}>
                                             <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                                        </Select>
                                    </div>
                                )}
                           </FlagSection>
                           
                           <FlagSection color="#f59e0b" title="Amarillas (Psicosocial Individual)">
                                <Select label="¿Qué piensa sobre su dolor?" name="amarilla_creencia_dolor" value={formData.impact.amarilla_creencia_dolor} onChange={handleImpactChange}>
                                    <option value="">Seleccionar</option><option value="mejorara">Va a mejorar</option><option value="empeorara">Va a empeorar</option><option value="no_sabe">No sabe</option>
                                </Select>
                                {formData.impact.amarilla_creencia_dolor && (
                                    <div className="p-4 rounded-md bg-amber-50 border border-amber-200 space-y-4 animate-fadeIn">
                                        <h4 className="font-semibold text-amber-800">Indagar más (2ª Estación)</h4>
                                        <Select label="¿Evita actividades por miedo a empeorar?" name="amarilla_evita_actividades" value={formData.impact.amarilla_evita_actividades} onChange={handleImpactChange}>
                                            <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                                        </Select>
                                        <Select label="¿Qué tanto interfiere el dolor en su vida diaria?" name="amarilla_interferencia_dolor" value={formData.impact.amarilla_interferencia_dolor} onChange={handleImpactChange}>
                                            <option value="">Seleccionar</option><option value="poco">Poco</option><option value="moderado">Moderado</option><option value="mucho">Mucho</option>
                                        </Select>
                                    </div>
                                )}
                           </FlagSection>

                           <FlagSection color="#3b82f6" title="Azules (Laborales)">
                                <Select label="¿Su trabajo o tareas influyen en su dolor o lo dificultan?" name="azul_trabajo_dificulta" value={formData.impact.azul_trabajo_dificulta} onChange={handleImpactChange}>
                                    <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                                </Select>
                                {formData.impact.azul_trabajo_dificulta === 'si' && (
                                     <div className="p-4 rounded-md bg-blue-50 border border-blue-200 space-y-4 animate-fadeIn">
                                        <h4 className="font-semibold text-blue-800">Indagar más (2ª Estación)</h4>
                                        <Select label="¿Su trabajo le ayuda a recuperarse o lo empeora?" name="azul_trabajo_ayuda_empeora" value={formData.impact.azul_trabajo_ayuda_empeora} onChange={handleImpactChange}>
                                            <option value="">Seleccionar</option><option value="ayuda">Ayuda</option><option value="empeora">Empeora</option>
                                        </Select>
                                        <Select label="¿Tiene apoyo de su entorno laboral para volver progresivamente?" name="azul_apoyo_laboral" value={formData.impact.azul_apoyo_laboral} onChange={handleImpactChange}>
                                            <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                                        </Select>
                                    </div>
                                )}
                           </FlagSection>

                           <FlagSection color="#374151" title="Negras (Contexto/Sistema)">
                                <Select label="¿Tiene trabas externas (seguros, turnos, entorno) que dificulten su recuperación?" name="negra_barreras_recuperacion" value={formData.impact.negra_barreras_recuperacion} onChange={handleImpactChange}>
                                    <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                                </Select>
                                {formData.impact.negra_barreras_recuperacion === 'si' && (
                                     <div className="p-4 rounded-md bg-slate-100 border border-slate-200 space-y-4 animate-fadeIn">
                                        <h4 className="font-semibold text-slate-800">Indagar más (2ª Estación)</h4>
                                         <Select label="¿Hay trámites o barreras del sistema de salud que retrasan su atención?" name="negra_barreras_sistema" value={formData.impact.negra_barreras_sistema} onChange={handleImpactChange}>
                                            <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                                        </Select>
                                        <Select label="¿Su familia/entorno le ayuda o le limita?" name="negra_apoyo_entorno" value={formData.impact.negra_apoyo_entorno} onChange={handleImpactChange}>
                                            <option value="">Seleccionar</option><option value="ayuda">Ayuda</option><option value="limita">Limita</option>
                                        </Select>
                                    </div>
                                )}
                           </FlagSection>

                           <FlagSection color="#f97316" title="Naranjas (Salud Mental)">
                                <Select label="En las últimas 2 semanas, ¿se sintió desanimado o sin interés en sus actividades?" name="naranja_animo_interes" value={formData.impact.naranja_animo_interes} onChange={handleImpactChange}>
                                    <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                                </Select>
                                {formData.impact.naranja_animo_interes === 'si' && (
                                     <div className="p-4 rounded-md bg-orange-50 border border-orange-200 space-y-4 animate-fadeIn">
                                        <h4 className="font-semibold text-orange-800">Indagar más (2ª Estación)</h4>
                                        <Input label="¿Cómo impacta este dolor en su ánimo día a día?" name="naranja_impacto_animo" value={formData.impact.naranja_impacto_animo} onChange={handleImpactChange} />
                                        <Select label="¿Tiene pensamientos de desesperanza?" name="naranja_desesperanza" value={formData.impact.naranja_desesperanza} onChange={handleImpactChange}>
                                             <option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option>
                                        </Select>
                                    </div>
                                )}
                           </FlagSection>
                        </div>
                        
                        <Textarea label="Otras Consideraciones" name="otrasConsideraciones" value={formData.impact.otrasConsideraciones} onChange={handleImpactChange} />

                    </div>
                );
            case 'summary':
                return (
                    <div className="flex flex-col gap-8 items-center pt-4">
                        <div className="text-center">
                            <p className="text-slate-600 max-w-xl">
                                La ficha está lista para ser guardada. Opcionalmente, puede generar un análisis con IA antes de finalizar.
                            </p>
                        </div>
                        
                        <div className="w-full max-w-sm flex flex-col items-center gap-4">
                            <button
                                onClick={handleGenerateSummary}
                                disabled={isLoadingAI || isSaving || !isFiliatoriosComplete}
                                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoadingAI ? <><LoaderIcon /> Generando...</> : <><SparklesIcon /> Generar Análisis con IA (Opcional)</>}
                            </button>
                            
                            <button
                                onClick={handleSave}
                                disabled={isSaving || isLoadingAI || !isFiliatoriosComplete}
                                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-slate-700 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50"
                            >
                                {isSaving ? <><LoaderIcon /> Guardando...</> : "Guardar Ficha"}
                            </button>
                        </div>

                        {summary && (
                            <div className="w-full mt-4 bg-slate-50 p-4 rounded-lg border animate-fadeIn">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Resumen y Análisis (Editable)</label>
                                <textarea
                                    value={summary}
                                    onChange={(e) => setSummary(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 bg-slate-800 text-slate-100 font-mono border border-slate-600 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[300px] whitespace-pre-wrap"
                                />
                            </div>
                        )}
                    </div>
                );
            default:
                return <div>Paso no encontrado</div>;
        }
    };
    
    return (
        <div className="animate-fadeIn space-y-8">
            {isPatientModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white p-6 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                        <div className="flex justify-between items-center mb-4">
                            <h3 id="modal-title" className="text-xl font-bold text-slate-800">Seleccionar Paciente de Prueba</h3>
                            <button onClick={() => setIsPatientModalOpen(false)} className="text-slate-500 hover:text-slate-800" aria-label="Cerrar modal">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="overflow-y-auto pr-2 -mr-2">
                            <ul className="space-y-3">
                                {allTestPatients.map((patient, index) => (
                                    <li key={index}>
                                        <button
                                            onClick={() => handleLoadTestData(patient)}
                                            className="w-full text-left p-4 rounded-lg bg-slate-50 hover:bg-blue-100 border border-slate-200 hover:border-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <p className="font-semibold text-slate-800">{patient.filiatorios.nombre} {patient.filiatorios.apellido}</p>
                                            <p className="text-sm text-slate-600">{patient.anamnesis.diagnosticoMedico}</p>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-800">
                    {initialData ? 'Nuevo Registro Clínico' : 'Nueva Ficha de Paciente'}
                </h1>
                <button 
                    onClick={() => setIsPatientModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50"
                >
                    <SparklesIcon />
                    Cargar datos de prueba
                </button>
            </div>
            
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-slate-200/80">
                <div className="mb-6 overflow-x-auto pb-2">
                    <nav className="flex space-x-2 sm:space-x-4 border-b border-slate-200">
                        {STEPS.map((step, index) => (
                            <button
                                key={step.id}
                                onClick={() => goToStep(index)}
                                className={`flex items-center gap-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:text-slate-400 ${
                                    currentStep === index
                                        ? 'border-b-2 border-blue-600 text-blue-600'
                                        : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${currentStep >= index ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{index + 1}</span>
                                {step.name}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="animate-fadeIn">
                   {renderStepContent()}
                </div>
            </div>

            <div className="flex justify-between items-center mt-6">
                <button
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className="inline-flex items-center gap-1 px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
                >
                    <ChevronLeftIcon />
                    Anterior
                </button>
                <div className="text-sm text-slate-500">
                    Paso {currentStep + 1} de {STEPS.length}
                </div>
                <button
                    onClick={nextStep}
                    disabled={currentStep === STEPS.length - 1}
                    className="inline-flex items-center gap-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                    Siguiente
                    <ChevronRightIcon />
                </button>
            </div>
        </div>
    );
};

// Fix: Add default export to resolve import error in App.tsx
export default FormPage;