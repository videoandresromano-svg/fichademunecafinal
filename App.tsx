import React, { useState } from 'react';
import FormPage from './pages/FormPage';
import HistoryPage from './pages/HistoryPage';
import PatientDetailPage from './pages/PatientDetailPage';
import { HistoryIcon, UserPlusIcon, CloseIcon } from './components/IconComponents';
import Chatbot from './components/Chatbot';
import { ClinicalData } from './types';

type PageView = {
    page: 'form' | 'history' | 'patientDetail';
    patientId?: string;
    initialData?: ClinicalData;
};

const App: React.FC = () => {
    const [view, setView] = useState<PageView>({ page: 'history' });
    const [isChatOpen, setIsChatOpen] = useState(false);

    const navigateTo = (page: PageView['page'], options: { patientId?: string; initialData?: ClinicalData } = {}) => {
        setView({ page, ...options });
         window.scrollTo(0, 0);
    };

    const NavLink: React.FC<{ targetPage: PageView['page']; children: React.ReactNode; icon: React.ReactNode }> = ({ targetPage, children, icon }) => (
        <a
            href="#"
            onClick={(e) => {
                e.preventDefault();
                navigateTo(targetPage);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                view.page === targetPage
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
        >
            {icon}
            {children}
        </a>
    );
    
    const renderContent = () => {
        switch (view.page) {
            case 'history':
                return <HistoryPage onSelectPatient={(patientId) => navigateTo('patientDetail', { patientId })} />;
            case 'patientDetail':
                return <PatientDetailPage patientId={view.patientId!} onNavigate={navigateTo} />;
            case 'form':
            default:
                return <FormPage onFormSubmit={() => navigateTo('history')} initialData={view.initialData} />;
        }
    };

    return (
        <div className="min-h-screen">
            <header className="bg-white/80 backdrop-blur-lg shadow-md sticky top-0 z-40 border-b border-slate-200/80">
                <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-4 text-3xl font-bold">
                            <img src="https://i.imgur.com/lryVYcP.png" alt="Ficha de Muñeca Logo" className="h-12 w-12" />
                             <span className="bg-gradient-to-r from-blue-600 to-teal-500 text-transparent bg-clip-text">
                                Ficha de Muñeca
                            </span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <NavLink targetPage="form" icon={<UserPlusIcon />} >Nueva Ficha</NavLink>
                            <NavLink targetPage="history" icon={<HistoryIcon />}>Historial</NavLink>
                        </div>
                    </div>
                </nav>
            </header>
            <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                {renderContent()}
            </main>

            {/* Chatbot and FAB */}
            <div className="fixed bottom-6 right-6 z-50">
                {isChatOpen && <Chatbot onClose={() => setIsChatOpen(false)} />}
                <button
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className={`mt-4 w-20 h-20 ${isChatOpen ? 'bg-red-600 text-white hover:bg-red-700' : ''} rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all transform hover:scale-110 flex items-center justify-center`}
                    aria-label={isChatOpen ? "Cerrar chat" : "Abrir chat de asistente"}
                >
                    {isChatOpen ? <CloseIcon className="w-10 h-10"/> : <img src="https://i.imgur.com/7nzSia0.png" alt="Abrir chat de asistente" className="w-20 h-20 rounded-full object-cover" />}
                </button>
            </div>
        </div>
    );
};

export default App;
