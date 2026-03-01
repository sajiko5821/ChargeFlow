import { useState, useEffect, useCallback } from 'react';
import {
    initDatabase,
    getCar,
    saveCarAndPersist,
    getAllSessions,
    addSessionAndPersist,
    updateSessionAndPersist,
    deleteSessionAndPersist,
} from '../db/database';
import type { CarData, ChargingSession } from '../types';

const DEFAULT_CAR: CarData = {
    name: '',
    batteryCapacityKWh: 0,
    maxDCChargingKW: 0,
    maxACChargingKW: 0,
};

interface UseDatabase {
    ready: boolean;
    carData: CarData;
    sessions: ChargingSession[];
    saveCar: (car: CarData) => Promise<void>;
    addSession: (session: ChargingSession) => Promise<void>;
    updateSession: (session: ChargingSession) => Promise<void>;
    deleteSession: (id: string) => Promise<void>;
}

export function useDatabase(): UseDatabase {
    const [ready, setReady] = useState(false);
    const [carData, setCarData] = useState<CarData>(DEFAULT_CAR);
    const [sessions, setSessions] = useState<ChargingSession[]>([]);

    // Initialize DB on mount
    useEffect(() => {
        initDatabase()
            .then(async () => {
                setCarData(await getCar());
                setSessions(await getAllSessions());
                setReady(true);
            })
            .catch((err) => {
                console.error('Failed to initialize database:', err);
            });
    }, []);

    const saveCar = useCallback(async (car: CarData) => {
        await saveCarAndPersist(car);
        setCarData(car);
    }, []);

    const addSessionCb = useCallback(async (session: ChargingSession) => {
        await addSessionAndPersist(session);
        setSessions(await getAllSessions());
    }, []);

    const updateSessionCb = useCallback(async (session: ChargingSession) => {
        await updateSessionAndPersist(session);
        setSessions(await getAllSessions());
    }, []);

    const deleteSessionCb = useCallback(async (id: string) => {
        await deleteSessionAndPersist(id);
        setSessions(await getAllSessions());
    }, []);

    return {
        ready,
        carData,
        sessions,
        saveCar,
        addSession: addSessionCb,
        updateSession: updateSessionCb,
        deleteSession: deleteSessionCb,
    };
}
