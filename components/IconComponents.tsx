import React from 'react';

export const HandWaveIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
        <path d="M18 18.5a1.5 1.5 0 0 1-1.5-1.5v-2.5a1.5 1.5 0 0 1 3 0V17a1.5 1.5 0 0 1-1.5 1.5z" />
        <path d="M12 18.5a1.5 1.5 0 0 1-1.5-1.5v-5.5a1.5 1.5 0 0 1 3 0V17a1.5 1.5 0 0 1-1.5 1.5z" />
        <path d="M6 18.5a1.5 1.5 0 0 1-1.5-1.5v-8.5a1.5 1.5 0 0 1 3 0V17a1.5 1.5 0 0 1-1.5 1.5z" />
        <path d="M2 14.5a1.5 1.5 0 0 1-1.5-1.5v-2.5a1.5 1.5 0 1 1 3 0V13a1.5 1.5 0 0 1-1.5 1.5z" />
        <path d="M22 11.5a1.5 1.5 0 0 1-1.5-1.5v-2.5a1.5 1.5 0 1 1 3 0V10a1.5 1.5 0 0 1-1.5 1.5z" />
    </svg>
);

export const UserPlusIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
        <line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/>
    </svg>
);

export const HistoryIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.19-9.51L1 10"/>
    </svg>
);

export const ChevronLeftIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6"/>
    </svg>
);

// FIX: Updated the component to accept a 'className' prop.
export const ChevronRightIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="9 18 15 12 9 6"/>
    </svg>
);

export const SparklesIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m12 3-1.9 4.2-4.3.6 3.1 3- .7 4.2 3.8-2 3.8 2-.7-4.2 3.1-3-4.3-.6L12 3Z"/><path d="M5 11.5 2.5 14l-2.5-2.5"/><path d="M19 11.5 21.5 14l2.5-2.5"/><path d="m12 18-1.9 4.2-4.3.6 3.1 3-.7 4.2 3.8-2 3.8 2-.7-4.2 3.1-3-4.3-.6L12 18Z" transform="scale(0.5) translate(12 12)"/>
    </svg>
);

export const FileDownIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
);

export const LoaderIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
);

export const DatabaseIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
    </svg>
);

export const ChatBotIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15.5 2A3.5 3.5 0 0 0 12 5.5V9a3 3 0 0 0-3 3 3 3 0 0 0-3 3 4 4 0 0 0 4 4h1.5a2.5 2.5 0 0 0 2.5-2.5V17a2.5 2.5 0 0 0-2.5-2.5h-1a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h4.5a2.5 2.5 0 0 1 2.5 2.5V13"/>
        <path d="M8.5 2A3.5 3.5 0 0 1 12 5.5V9a3 3 0 0 1 3 3 3 3 0 0 1 3 3 4 4 0 0 1-4 4h-1.5a2.5 2.5 0 0 1-2.5-2.5V17a2.5 2.5 0 0 1 2.5-2.5h1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H7.5a2.5 2.5 0 0 0-2.5 2.5V13"/>
        <path d="M12 9v1.5"/>
    </svg>
);

export const BrainCircuitIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 5a3 3 0 1 0-5.993.142"/><path d="M18 5a3 3 0 1 0-5.993.142"/><path d="M12 19a3 3 0 1 0 5.993-.142"/><path d="M6 19a3 3 0 1 0 5.993-.142"/><path d="M12 12a3 3 0 1 0-5.993.142"/><path d="M18 12a3 3 0 1 0-5.993.142"/><path d="M21 12h-3"/><path d="M9 12H6"/><path d="M15 5.142V3"/><path d="M9 5.142V3"/><path d="M15 18.858V21"/><path d="M9 18.858V21"/><path d="M12 9V6.142"/><path d="M12 18.858V15"/>
    </svg>
);


export const CloseIcon: React.FC<{className?: string}> = ({className}) => (
     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

export const PlusCircleIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
    </svg>
);

export const GoogleDriveIcon: React.FC = () => (
    <svg width="18" height="18" viewBox="0 0 24 27" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15.115 11.391L9.07404 0L0 16.096L6.05004 26.85L15.115 11.391Z" fill="#FFC107"/>
        <path d="M18.14 16.096L24.18 26.85H6.05005L3.03005 21.326L18.14 16.096Z" fill="#1DA462"/>
        <path d="M9.07404 0L15.115 11.391L24.18 26.85L18.14 16.096L9.07404 0Z" fill="#3367D6"/>
    </svg>
);

export const JsonIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
       <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
       <polyline points="14 2 14 8 20 8"/>
       <path d="M12 18v-6"/>
       <path d="m15 15-3 3-3-3"/>
    </svg>
  );
  
export const TrendingUpIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
        <polyline points="17 6 23 6 23 12"/>
    </svg>
);