import { CIFProfile, FiliatoriosData, AnamnesisData, PhysicalExamData, ScalesData, RadiologyData, HypothesisComparison, ImpactData } from '../types';
// @ts-ignore
import initSqlJs from 'sql.js';

let dbInstance: any = null;

export const DB_NAME = 'clinical_records_db.sqlite';

export const initDB = async () => {
    if (dbInstance) return dbInstance;

    try {
        const SQL = await initSqlJs({
            locateFile: (file: string) => `https://esm.sh/sql.js@1.10.3/dist/${file}`
        });

        const savedDb = localStorage.getItem(DB_NAME);

        if (savedDb) {
            const dbArray = new Uint8Array(JSON.parse(savedDb));
            dbInstance = new SQL.Database(dbArray);
            
            // Migration checks
            const tableInfo = dbInstance.exec("PRAGMA table_info(clinical_records);");
            const columns = tableInfo[0].values.map((row: any) => row[1]);
            let dbUpdated = false;

            if (!columns.includes('cif_profile')) {
                dbInstance.exec("ALTER TABLE clinical_records ADD COLUMN cif_profile TEXT;");
                console.log("Upgraded database: Added cif_profile column.");
                dbUpdated = true;
            }
            if (!columns.includes('hypothesis_comparison')) {
                dbInstance.exec("ALTER TABLE clinical_records ADD COLUMN hypothesis_comparison TEXT;");
                console.log("Upgraded database: Added hypothesis_comparison column.");
                dbUpdated = true;
            }
             if (!columns.includes('impact_data')) {
                dbInstance.exec("ALTER TABLE clinical_records ADD COLUMN impact_data TEXT;");
                console.log("Upgraded database: Added impact_data column.");
                dbUpdated = true;
            }

            if (dbUpdated) {
                saveDB();
            }

        } else {
            dbInstance = new SQL.Database();
            console.log('Creating new database...');
            const schema = `
                CREATE TABLE patients (
                    id TEXT PRIMARY KEY NOT NULL, -- DNI
                    filiatorios_data TEXT NOT NULL
                );

                CREATE TABLE clinical_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    anamnesis_data TEXT,
                    physical_exam_data TEXT,
                    scales_data TEXT,
                    radiology_data TEXT,
                    impact_data TEXT,
                    summary TEXT,
                    cif_profile TEXT,
                    hypothesis_comparison TEXT,
                    FOREIGN KEY (patient_id) REFERENCES patients (id)
                );
            `;
            dbInstance.exec(schema);
            saveDB();
        }
        return dbInstance;
    } catch (error) {
        console.error("Failed to initialize database:", error);
        return null;
    }
};

export const saveDB = () => {
    if (dbInstance) {
        const data = dbInstance.export();
        localStorage.setItem(DB_NAME, JSON.stringify(Array.from(data)));
        console.log('Database saved to localStorage.');
    }
};

export const getPatients = async () => {
    const db = await initDB();
    if (!db) return [];
    const res = db.exec("SELECT id, filiatorios_data FROM patients ORDER BY filiatorios_data");
    if (res.length > 0) {
        return res[0].values.map((row: any) => ({
            id: row[0],
            filiatorios: JSON.parse(row[1]) as FiliatoriosData,
        }));
    }
    return [];
};

export const getPatientDetails = async (patientId: string) => {
    const db = await initDB();
    if (!db) return null;

    let patient: any = { filiatorios: null, clinicalRecords: [] };

    const patientStmt = db.prepare("SELECT filiatorios_data FROM patients WHERE id = :id");
    const patientResult = patientStmt.getAsObject({ ':id': patientId });
    patientStmt.free();

    if (patientResult.filiatorios_data) {
        patient.filiatorios = JSON.parse(patientResult.filiatorios_data as string);
    } else {
        return null; // Patient not found
    }
    
    const recordsStmt = db.prepare("SELECT id, created_at, anamnesis_data, physical_exam_data, scales_data, radiology_data, impact_data, summary, cif_profile, hypothesis_comparison FROM clinical_records WHERE patient_id = :id ORDER BY created_at DESC");
    
    const records = [];
    recordsStmt.bind({ ':id': patientId });
    while (recordsStmt.step()) {
        const row = recordsStmt.getAsObject();
        records.push({
            id: row.id,
            createdAt: row.created_at,
            summary: row.summary,
            anamnesis: JSON.parse(row.anamnesis_data as string || '{}'),
            physicalExam: JSON.parse(row.physical_exam_data as string || '{}'),
            scales: JSON.parse(row.scales_data as string || '{}'),
            radiology: JSON.parse(row.radiology_data as string || '{}'),
            impact: row.impact_data ? JSON.parse(row.impact_data as string) : undefined,
            cifProfile: row.cif_profile ? JSON.parse(row.cif_profile as string) : undefined,
            hypothesisComparison: row.hypothesis_comparison ? JSON.parse(row.hypothesis_comparison as string) : undefined,
        });
    }
    recordsStmt.free();
    patient.clinicalRecords = records;

    return patient;
};

export const updateCIFProfile = async (recordId: number, cifProfile: CIFProfile) => {
    const db = await initDB();
    if (!db) throw new Error("Database not initialized");

    const stmt = db.prepare("UPDATE clinical_records SET cif_profile = ? WHERE id = ?");
    stmt.run([JSON.stringify(cifProfile), recordId]);
    stmt.free();
    saveDB();
};

export const updateHypothesisComparison = async (recordId: number, comparisonData: HypothesisComparison) => {
    const db = await initDB();
    if (!db) throw new Error("Database not initialized");

    const stmt = db.prepare("UPDATE clinical_records SET hypothesis_comparison = ? WHERE id = ?");
    stmt.run([JSON.stringify(comparisonData), recordId]);
    stmt.free();
    saveDB();
};

export const updateRecordSummary = async (recordId: number, summary: string) => {
    const db = await initDB();
    if (!db) throw new Error("Database not initialized");

    const stmt = db.prepare("UPDATE clinical_records SET summary = ? WHERE id = ?");
    stmt.run([summary, recordId]);
    stmt.free();
    saveDB();
};


export const saveClinicalRecord = async (data: {
    filiatorios: FiliatoriosData;
    anamnesis: AnamnesisData;
    physicalExam: PhysicalExamData;
    scales: ScalesData;
    radiology: RadiologyData;
    impact: ImpactData;
    summary: string;
}) => {
    const db = await initDB();
    if (!db) throw new Error("Database not initialized");

    const patientId = data.filiatorios.dni;

    // Check if patient exists, if not, create
    const patientExists = db.exec(`SELECT id FROM patients WHERE id = '${patientId}'`);
    if (patientExists.length === 0) {
        const stmt = db.prepare("INSERT INTO patients (id, filiatorios_data) VALUES (?, ?)");
        stmt.run([patientId, JSON.stringify(data.filiatorios)]);
        stmt.free();
    } else {
         const stmt = db.prepare("UPDATE patients SET filiatorios_data = ? WHERE id = ?");
        stmt.run([JSON.stringify(data.filiatorios), patientId]);
        stmt.free();
    }
    
    // Insert the clinical record
    const recordStmt = db.prepare(`
        INSERT INTO clinical_records (patient_id, created_at, anamnesis_data, physical_exam_data, scales_data, radiology_data, impact_data, summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    recordStmt.run([
        patientId,
        new Date().toISOString(),
        JSON.stringify(data.anamnesis),
        JSON.stringify(data.physicalExam),
        JSON.stringify(data.scales),
        JSON.stringify(data.radiology),
        JSON.stringify(data.impact),
        data.summary
    ]);

    recordStmt.free();
    saveDB();
};