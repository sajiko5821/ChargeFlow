import { useState, useEffect, useCallback } from 'react';
import {
    initDatabase,
    getCar,
    saveCarAndPersist,
    getAllSessions,
    addSessionAndPersist,
    updateSessionAndPersist,
    deleteSessionAndPersist,
    getAllDeals,
    addDealAndPersist,
    updateDealAndPersist,
    deleteDealAndPersist,
} from '../db/database';
import type { CarData, ChargerDeal, ChargingSession } from '../types';

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
    deals: ChargerDeal[];
    saveCar: (car: CarData) => Promise<void>;
    addSession: (session: ChargingSession) => Promise<void>;
    updateSession: (session: ChargingSession) => Promise<void>;
    deleteSession: (id: string) => Promise<void>;
    addDeal: (deal: Omit<ChargerDeal, 'id'>) => Promise<void>;
    updateDeal: (deal: ChargerDeal) => Promise<void>;
    deleteDeal: (id: string) => Promise<void>;
}

export function useDatabase(): UseDatabase {
    const [ready, setReady] = useState(false);
    const [carData, setCarData] = useState<CarData>(DEFAULT_CAR);
    const [sessions, setSessions] = useState<ChargingSession[]>([]);
    const [deals, setDeals] = useState<ChargerDeal[]>([]);

    // Initialize DB on mount
    useEffect(() => {
        initDatabase()
            .then(async () => {
                const [carResult, sessionsResult, dealsResult] = await Promise.allSettled([
                    getCar(),
                    getAllSessions(),
                    getAllDeals(),
                ]);

                if (carResult.status === 'fulfilled') {
                    setCarData(carResult.value);
                } else {
                    console.error('Failed to load car data:', carResult.reason);
                }

                if (sessionsResult.status === 'fulfilled') {
                    setSessions(sessionsResult.value);
                } else {
                    console.error('Failed to load sessions:', sessionsResult.reason);
                }

                if (dealsResult.status === 'fulfilled') {
                    setDeals(dealsResult.value);
                } else {
                    console.error('Failed to load deals:', dealsResult.reason);
                }

                setReady(true);
            })
            .catch((err) => {
                console.error('Failed to initialize database:', err);
                setReady(true);
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

    const addDealCb = useCallback(async (deal: Omit<ChargerDeal, 'id'>) => {
        await addDealAndPersist(deal);
        setDeals(await getAllDeals());
    }, []);

    const updateDealCb = useCallback(async (deal: ChargerDeal) => {
        await updateDealAndPersist(deal);
        setDeals(await getAllDeals());
        setSessions(await getAllSessions());
    }, []);

    const deleteDealCb = useCallback(async (id: string) => {
        await deleteDealAndPersist(id);
        setDeals(await getAllDeals());
        setSessions(await getAllSessions());
    }, []);

    return {
        ready,
        carData,
        sessions,
        deals,
        saveCar,
        addSession: addSessionCb,
        updateSession: updateSessionCb,
        deleteSession: deleteSessionCb,
        addDeal: addDealCb,
        updateDeal: updateDealCb,
        deleteDeal: deleteDealCb,
    };
}
