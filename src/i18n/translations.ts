export type Locale = 'de' | 'en';

export interface Translations {
    // App
    appName: string;
    loadingDatabase: string;
    lightMode: string;
    darkMode: string;

    // Navigation
    navCharging: string;
    navStatistics: string;
    navCalculator: string;
    navCar: string;

    // Month names
    months: string[];

    // CarTab
    myCar: string;
    edit: string;
    vehicleData: string;
    batteryCapacity: string;
    maxDCCharging: string;
    maxACCharging: string;
    resetVehicle: string;
    editVehicle: string;
    setupVehicle: string;
    vehicleName: string;
    vehicleNamePlaceholder: string;
    batteryCapacityLabel: string;
    batteryCapacityPlaceholder: string;
    maxDCLabel: string;
    maxDCPlaceholder: string;
    maxACLabel: string;
    maxACPlaceholder: string;
    cancel: string;
    save: string;
    errorSavingCar: string;
    chargerDeals: string;
    noDealsYet: string;
    addDeal: string;
    editDeal: string;
    deleteDeal: string;
    dealName: string;
    dealNamePlaceholder: string;
    chargeType: string;
    chargeTypeAc: string;
    chargeTypeDc: string;
    chargeTypeBoth: string;
    errorSavingDeal: string;

    // ChargingTab
    total: string;
    charges: string;
    energy: string;
    avgPricePerKWh: string;
    addChargingSession: string;
    newChargingSession: string;
    date: string;
    charged: string;
    chargedPlaceholder: string;
    pricePerKWh: string;
    pricePerKWhPlaceholder: string;
    chargerDeal: string;
    noDealSelected: string;
    customCostPerKWh: string;
    customCostPerKWhPlaceholder: string;
    customOverridesDeal: string;
    dealLabel: string;
    cost: string;
    noteOptional: string;
    notePlaceholder: string;
    recentSessions: string;
    noSessionsYet: string;
    addFirstSession: string;
    errorSavingSession: string;

    // CalculatorTab
    noCarSetup: string;
    noCarSetupHint: string;
    chargingCalculator: string;
    dcCharging: string;
    acCharging: string;
    currentSoC: string;
    targetSoC: string;
    electricityPrice: string;
    electricityPricePlaceholder: string;
    result: string;
    requiredEnergy: string;
    estimatedDuration: string;
    estimatedCost: string;
    atPricePerKWh: string;
    atPowerKW: string;
    lessThan1Min: string;
    minutes: string;
    hours: string;
    hoursMinutes: string;
    chargingDisclaimer: string;
    targetMustBeHigher: string;

    // StatisticsTab
    noStatistics: string;
    noStatisticsHint: string;
    avgCostPerMonth: string;
    avgEnergyPerMonth: string;
    overMonths: string;
    costPerMonth: string;
    showLess: string;
    showAllMonths: string;
    yearlyOverview: string;
}

const de: Translations = {
    appName: 'ChargeFlow',
    loadingDatabase: 'Datenbank wird geladen…',
    lightMode: 'Heller Modus',
    darkMode: 'Dunkler Modus',

    navCharging: 'Laden',
    navStatistics: 'Statistik',
    navCalculator: 'Rechner',
    navCar: 'Auto',

    months: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],

    myCar: 'Mein Fahrzeug',
    edit: 'Bearbeiten',
    vehicleData: 'Fahrzeugdaten',
    batteryCapacity: 'Akkukapazität',
    maxDCCharging: 'Max. DC-Laden',
    maxACCharging: 'Max. AC-Laden',
    resetVehicle: 'Fahrzeug zurücksetzen',
    editVehicle: 'Fahrzeug bearbeiten',
    setupVehicle: 'Fahrzeug einrichten',
    vehicleName: 'Fahrzeugname',
    vehicleNamePlaceholder: 'z.B. Tesla Model 3',
    batteryCapacityLabel: 'Akkukapazität (kWh)',
    batteryCapacityPlaceholder: 'z.B. 75',
    maxDCLabel: 'Max. DC-Ladegeschwindigkeit (kW)',
    maxDCPlaceholder: 'z.B. 170',
    maxACLabel: 'Max. AC-Ladegeschwindigkeit (kW)',
    maxACPlaceholder: 'z.B. 11',
    cancel: 'Abbrechen',
    save: 'Speichern',
    errorSavingCar: 'Fehler beim Speichern der Fahrzeugdaten.',
    chargerDeals: 'Ladedeals',
    noDealsYet: 'Noch keine Ladedeals gespeichert.',
    addDeal: 'Deal hinzufügen',
    editDeal: 'Deal bearbeiten',
    deleteDeal: 'Deal löschen',
    dealName: 'Anbieter',
    dealNamePlaceholder: 'z.B. IONITY',
    chargeType: 'Ladetyp',
    chargeTypeAc: 'AC',
    chargeTypeDc: 'DC',
    chargeTypeBoth: 'AC/DC',
    errorSavingDeal: 'Fehler beim Speichern des Ladedeals.',

    total: 'Gesamt',
    charges: 'Ladungen',
    energy: 'Energie',
    avgPricePerKWh: '€/kWh',
    addChargingSession: 'Ladevorgang erfassen',
    newChargingSession: 'Neuer Ladevorgang',
    date: 'Datum',
    charged: 'Geladen (kWh)',
    chargedPlaceholder: 'z.B. 45.3',
    pricePerKWh: 'Preis (€/kWh)',
    pricePerKWhPlaceholder: 'z.B. 0.39',
    chargerDeal: 'Ladedeal',
    noDealSelected: 'Kein Deal ausgewählt',
    customCostPerKWh: 'Preis (€/kWh)',
    customCostPerKWhPlaceholder: 'z.B. 0.42',
    customOverridesDeal: 'Eigener Preis überschreibt den Deal-Preis.',
    dealLabel: 'Deal',
    cost: 'Kosten',
    noteOptional: 'Notiz (optional)',
    notePlaceholder: 'z.B. IONITY Autobahn A3',
    recentSessions: 'Letzte Ladevorgänge',
    noSessionsYet: 'Noch keine Ladevorgänge',
    addFirstSession: 'Erfasse deinen ersten Ladevorgang!',
    errorSavingSession: 'Fehler beim Speichern des Ladevorgangs.',

    noCarSetup: 'Kein Fahrzeug eingerichtet',
    noCarSetupHint: 'Bitte richte zuerst dein Fahrzeug im Auto-Tab ein, um den Rechner zu nutzen.',
    chargingCalculator: 'Laderechner',
    dcCharging: 'DC-Laden',
    acCharging: 'AC-Laden',
    currentSoC: 'Aktueller Ladestand',
    targetSoC: 'Ziel-Ladestand',
    electricityPrice: 'Strompreis (€/kWh)',
    electricityPricePlaceholder: 'z.B. 0.39',
    result: 'Ergebnis',
    requiredEnergy: 'Benötigte Energie',
    estimatedDuration: 'Geschätzte Ladedauer',
    estimatedCost: 'Geschätzte Kosten',
    atPricePerKWh: 'bei {price} €/kWh',
    atPowerKW: 'bei {power} kW ({type})',
    lessThan1Min: '< 1 Min.',
    minutes: '{m} Min.',
    hours: '{h} Std.',
    hoursMinutes: '{h} Std. {m} Min.',
    chargingDisclaimer: 'ℹ️ Die Ladedauer ist eine Schätzung. In der Realität sinkt die Ladegeschwindigkeit bei höherem Ladestand.',
    targetMustBeHigher: 'Der Ziel-Ladestand muss höher sein als der aktuelle Ladestand.',

    noStatistics: 'Noch keine Statistiken',
    noStatisticsHint: 'Erfasse Ladevorgänge, um Statistiken zu sehen.',
    avgCostPerMonth: '⌀ Kosten/Monat',
    avgEnergyPerMonth: '⌀ Energie/Monat',
    overMonths: 'über {n} Monate',
    costPerMonth: 'Kosten pro Monat',
    showLess: 'Weniger anzeigen',
    showAllMonths: 'Alle {n} Monate anzeigen',
    yearlyOverview: 'Jahresübersicht',
};

const en: Translations = {
    appName: 'ChargeFlow',
    loadingDatabase: 'Loading database…',
    lightMode: 'Light mode',
    darkMode: 'Dark mode',

    navCharging: 'Charging',
    navStatistics: 'Statistics',
    navCalculator: 'Calculator',
    navCar: 'Car',

    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],

    myCar: 'My Vehicle',
    edit: 'Edit',
    vehicleData: 'Vehicle data',
    batteryCapacity: 'Battery capacity',
    maxDCCharging: 'Max DC charging',
    maxACCharging: 'Max AC charging',
    resetVehicle: 'Reset vehicle',
    editVehicle: 'Edit vehicle',
    setupVehicle: 'Set up vehicle',
    vehicleName: 'Vehicle name',
    vehicleNamePlaceholder: 'e.g. Tesla Model 3',
    batteryCapacityLabel: 'Battery capacity (kWh)',
    batteryCapacityPlaceholder: 'e.g. 75',
    maxDCLabel: 'Max DC charging speed (kW)',
    maxDCPlaceholder: 'e.g. 170',
    maxACLabel: 'Max AC charging speed (kW)',
    maxACPlaceholder: 'e.g. 11',
    cancel: 'Cancel',
    save: 'Save',
    errorSavingCar: 'Failed to save vehicle data.',
    chargerDeals: 'Charger Deals',
    noDealsYet: 'No charger deals saved yet.',
    addDeal: 'Add deal',
    editDeal: 'Edit deal',
    deleteDeal: 'Delete deal',
    dealName: 'Deal name',
    dealNamePlaceholder: 'e.g. IONITY',
    chargeType: 'Charge type',
    chargeTypeAc: 'AC',
    chargeTypeDc: 'DC',
    chargeTypeBoth: 'AC/DC',
    errorSavingDeal: 'Failed to save charger deal.',

    total: 'Total',
    charges: 'charges',
    energy: 'Energy',
    avgPricePerKWh: '€/kWh',
    addChargingSession: 'Add charging session',
    newChargingSession: 'New charging session',
    date: 'Date',
    charged: 'Charged (kWh)',
    chargedPlaceholder: 'e.g. 45.3',
    pricePerKWh: 'Price (€/kWh)',
    pricePerKWhPlaceholder: 'e.g. 0.39',
    chargerDeal: 'Charger deal',
    noDealSelected: 'No deal selected',
    customCostPerKWh: 'Cost (€/kWh)',
    customCostPerKWhPlaceholder: 'e.g. 0.42',
    customOverridesDeal: 'Custom price overrides the deal price.',
    dealLabel: 'Deal',
    cost: 'Cost',
    noteOptional: 'Note (optional)',
    notePlaceholder: 'e.g. IONITY Highway A3',
    recentSessions: 'Recent sessions',
    noSessionsYet: 'No charging sessions yet',
    addFirstSession: 'Add your first charging session!',
    errorSavingSession: 'Failed to save charging session.',

    noCarSetup: 'No vehicle configured',
    noCarSetupHint: 'Please set up your vehicle in the Car tab first to use the calculator.',
    chargingCalculator: 'Charging Calculator',
    dcCharging: 'DC charging',
    acCharging: 'AC charging',
    currentSoC: 'Current charge level',
    targetSoC: 'Target charge level',
    electricityPrice: 'Electricity price (€/kWh)',
    electricityPricePlaceholder: 'e.g. 0.39',
    result: 'Result',
    requiredEnergy: 'Required energy',
    estimatedDuration: 'Estimated duration',
    estimatedCost: 'Estimated cost',
    atPricePerKWh: 'at {price} €/kWh',
    atPowerKW: 'at {power} kW ({type})',
    lessThan1Min: '< 1 min',
    minutes: '{m} min',
    hours: '{h} hrs',
    hoursMinutes: '{h} hrs {m} min',
    chargingDisclaimer: 'ℹ️ Charging time is an estimate. In reality, charging speed decreases at higher charge levels.',
    targetMustBeHigher: 'Target charge level must be higher than current level.',

    noStatistics: 'No statistics yet',
    noStatisticsHint: 'Add charging sessions to see statistics.',
    avgCostPerMonth: '⌀ Cost/month',
    avgEnergyPerMonth: '⌀ Energy/month',
    overMonths: 'over {n} months',
    costPerMonth: 'Cost per month',
    showLess: 'Show less',
    showAllMonths: 'Show all {n} months',
    yearlyOverview: 'Yearly overview',
};

export const translations: Record<Locale, Translations> = { de, en };
