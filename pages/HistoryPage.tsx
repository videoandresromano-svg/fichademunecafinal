import React, { useEffect, useState, useMemo } from 'react';
import { getPatients, DB_NAME } from '../services/db';
import { Patient } from '../types';
import { LoaderIcon, DatabaseIcon } from '../components/IconComponents';

interface HistoryPageProps {
    onSelectPatient: (patientId: string) => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ onSelectPatient }) => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const loadPatients = async () => {
            setIsLoading(true);
            try {
                const patientData = await getPatients();
                // @ts-ignore
                setPatients(patientData);
            } catch (error) {
                console.error("Failed to load patients:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadPatients();
    }, []);

    const filteredPatients = useMemo(() => {
        if (!searchTerm) return patients;
        return patients.filter(p =>
            `${p.filiatorios.nombre} ${p.filiatorios.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.filiatorios.dni.includes(searchTerm)
        );
    }, [patients, searchTerm]);

    const handleDownloadDb = () => {
        const dbDataString = localStorage.getItem(DB_NAME);
        if (dbDataString) {
            try {
                const dbArray = new Uint8Array(JSON.parse(dbDataString));
                const blob = new Blob([dbArray], { type: 'application/x-sqlite3' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'Ficha_de_Muneca.db';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch(e) {
                console.error("Error creating DB file for download", e);
                alert("Hubo un error al generar el archivo de la base de datos.");
            }

        } else {
            alert('No se encontró la base de datos para descargar.');
        }
    };


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64 animate-fadeIn">
                <LoaderIcon />
                <span className="ml-4 text-slate-500">Cargando historial de pacientes...</span>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-800">Historial de Pacientes</h1>
                 <div className="flex items-center gap-4">
                     <button
                        onClick={handleDownloadDb}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                        <DatabaseIcon />
                        Descargar .db
                    </button>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar por nombre o DNI..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64 pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                         <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </div>
                </div>
            </div>

            {filteredPatients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPatients.map((patient) => (
                        <div
                            key={patient.id}
                            onClick={() => onSelectPatient(patient.id)}
                            className="bg-white p-6 rounded-xl shadow-md border border-slate-200/80 hover:shadow-lg hover:border-blue-400 transition-all cursor-pointer"
                        >
                            <h2 className="text-xl font-semibold text-slate-900 truncate">{patient.filiatorios.nombre} {patient.filiatorios.apellido}</h2>
                            <p className="text-slate-500 mt-1">DNI: {patient.filiatorios.dni}</p>
                            <div className="mt-4 pt-4 border-t border-slate-200">
                                <p className="text-sm text-slate-600">
                                    {/* Placeholder for last visit */}
                                </p>
                                <a href="#" className="text-sm font-semibold text-blue-600 hover:text-blue-800">Ver Ficha Completa →</a>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 px-6 bg-white rounded-xl shadow-md border border-slate-200/80">
                    <h3 className="text-xl font-semibold text-slate-700">No se encontraron pacientes</h3>
                    <p className="text-slate-500 mt-2">
                        {searchTerm ? 'Intente con otro término de búsqueda.' : 'Aún no se ha registrado ninguna ficha. Comience creando una nueva.'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default HistoryPage;
