// Test script per verificare la rotazione indipendente delle risorse part-time
import { generateShift } from './src/Application Code/Shift Management/ShiftManagement.ts';
import { ResourceType, Days } from './src/model/model.ts';

// Test resources: alcuni full-time e alcuni part-time
const testResources = [
  // Full-time
  { id: 'ft1', name: 'Full Time 1', type: ResourceType.FULL_TIME, fixedDays: [] },
  { id: 'ft2', name: 'Full Time 2', type: ResourceType.FULL_TIME, fixedDays: [] },
  
  // Part-time con giorni fissi
  { id: 'pt1', name: 'Part Time 1', type: ResourceType.PART_TIME, fixedDays: [Days.Monday, Days.Wednesday, Days.Friday] },
  { id: 'pt2', name: 'Part Time 2', type: ResourceType.PART_TIME, fixedDays: [Days.Tuesday, Days.Thursday] },
];

// Test per un mese
const startDate = new Date(2025, 0, 1); // January 2025
const schedule = generateShift(startDate, testResources);

// Analizza i risultati per le risorse part-time
console.log('=== ANALISI ROTAZIONE PART-TIME ===');

const partTimeSchedule = schedule.filter(s => 
  testResources.find(r => r.id === s.resourceId && r.type !== ResourceType.FULL_TIME)
);

// Raggruppa per risorsa
const byResource = {};
partTimeSchedule.forEach(shift => {
  if (!byResource[shift.resourceId]) byResource[shift.resourceId] = [];
  byResource[shift.resourceId].push(shift);
});

Object.entries(byResource).forEach(([resourceId, shifts]) => {
  console.log(`\n--- Risorsa ${resourceId} ---`);
  
  const workingShifts = shifts.filter(s => s.shiftType !== 'Free');
  console.log(`Giorni lavorativi: ${workingShifts.length}`);
  
  // Verifica ciclo dei turni
  const shiftSequence = workingShifts.map(s => s.shiftType);
  console.log('Sequenza turni:', shiftSequence.slice(0, 12)); // Prime due settimane
  
  // Verifica rotazione piani
  const floorSequence = workingShifts.map(s => `${s.shiftType}:P${s.floor}`);
  console.log('Sequenza turni+piani:', floorSequence.slice(0, 12));
});

console.log('\n=== FINE ANALISI ===');
