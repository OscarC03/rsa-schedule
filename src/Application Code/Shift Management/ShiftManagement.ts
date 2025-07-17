import { Resource, ResourceShift, ResourceType, ShiftType, Days } from "@/model/model";

// Helper function to convert JavaScript day of week to our Days enum
const getJSDayOfWeek = (date: Date): Days => {
  const jsDay = date.getDay(); // Sunday = 0, Monday = 1, etc.
  // Convert to our enum: Monday = 1, Tuesday = 2, ..., Sunday = 7
  return jsDay === 0 ? Days.Sunday : jsDay as Days;
};

// Helper function to check if a resource should work on a specific date
const shouldResourceWork = (resource: Resource, date: Date): boolean => {
  // Full-time resources work every day
  if (resource.type === ResourceType.FULL_TIME) {
    return true;
  }
  
  // Part-time resources work only on their fixed days
  if (resource.fixedDays.length === 0) {
    return true; // If no fixed days specified, assume they can work any day
  }
  
  const dayOfWeek = getJSDayOfWeek(date);
  return resource.fixedDays.includes(dayOfWeek);
};

// Debug function for part-time rotation
const logPartTimeDebug = (resourceId: string, currentDate: Date, workingDayIndex: number, cycleIdx: number, shift: ShiftType) => {
  if (typeof window !== 'undefined') {
    console.log(`[PART-TIME DEBUG] ${resourceId} - ${currentDate.toDateString()} - Working day #${workingDayIndex} - Cycle ${cycleIdx} - Shift: ${shift}`);
  }
};

export const generateShift = (startDate: Date, resources: Resource[]): ResourceShift[] => {
  const DAILY_REQUIREMENTS: Record<ShiftType, number> = {
    Morning: 5,
    MorningI: 0, // MorningI conteggiato insieme a Morning
    Afternoon: 4,
    Split: 3,
    Night: 2,
    Free: 0,
  };

  const SHIFT_CYCLE: ShiftType[] = [
    ShiftType.Morning,
    ShiftType.Morning,
    ShiftType.Split,
    ShiftType.Afternoon,
    ShiftType.Night,
    ShiftType.Free,
    ShiftType.Free,
    ShiftType.Free,
  ];

  const year = startDate.getFullYear();
  const month = startDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Separate full-time and part-time resources
  const fullTimeResources = resources.filter(r => r.type === ResourceType.FULL_TIME);
  const partTimeResources = resources.filter(r => r.type !== ResourceType.FULL_TIME);

  const resourceCycleIndex: Record<string, number> = {};
  fullTimeResources.forEach((r, i) => {
    resourceCycleIndex[r.id] = i % SHIFT_CYCLE.length;
  });
  // Separate cycle tracking for part-time resources
  const partTimeShiftCycle: ShiftType[] = [
    ShiftType.Morning,
    ShiftType.Afternoon,
    ShiftType.Split,
    ShiftType.Free,
  ];
  
  const partTimeCycleIndex: Record<string, number> = {};
  partTimeResources.forEach((r, i) => {
    partTimeCycleIndex[r.id] = i % partTimeShiftCycle.length;
  });

  // Track working days count for part-time resources
  const partTimeWorkingDaysCount: Record<string, number> = {};
  partTimeResources.forEach(r => {
    partTimeWorkingDaysCount[r.id] = 0;
  });

  const schedule: ResourceShift[] = [];for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    const currentDateStr = new Date(year, month, day + 1).toISOString().split("T")[0];

    const dailyCount: Record<ShiftType, number> = {
      Morning: 0,
      MorningI: 0,
      Afternoon: 0,
      Split: 0,
      Night: 0,
      Free: 0,
    };

    // === STEP 1: Assign shifts to FULL-TIME resources ===
    const rotatedFullTime = rotateArray(fullTimeResources, day);
    let morningIToAssign = 1; // solo uno per giorno

    for (const resource of rotatedFullTime) {
      const cycleIdx = resourceCycleIndex[resource.id];
      let shift = SHIFT_CYCLE[cycleIdx];

      // Se il turno è Morning e non abbiamo ancora assegnato MorningI, assegna MorningI
      if (shift === ShiftType.Morning && morningIToAssign > 0) {
        shift = ShiftType.MorningI;
        morningIToAssign--;
      }

      schedule.push({
        resourceId: resource.id,
        shiftType: shift,
        shiftCode: shift,
        date: currentDateStr,
        floor: 0, // da assegnare dopo
        cycleIndex: cycleIdx,
      });

      if (shift === ShiftType.MorningI) {
        dailyCount[ShiftType.MorningI]++;
        dailyCount[ShiftType.Morning]++;
      } else {
        dailyCount[shift]++;
      }
      resourceCycleIndex[resource.id] = (cycleIdx + 1) % SHIFT_CYCLE.length;
    }    // === STEP 2: Assign shifts to PART-TIME resources on their working days ===
    for (const resource of partTimeResources) {
      if (shouldResourceWork(resource, currentDate)) {        // Use working days count for cycle progression, not calendar days
        const workingDayIndex = partTimeWorkingDaysCount[resource.id];
        const cycleIdx = (partTimeCycleIndex[resource.id] + workingDayIndex) % partTimeShiftCycle.length;
        let shift = partTimeShiftCycle[cycleIdx];

        logPartTimeDebug(resource.id, currentDate, workingDayIndex, cycleIdx, shift);

        // Debug logging for part-time shift assignment
        logPartTimeDebug(resource.id, currentDate, workingDayIndex, cycleIdx, shift);

        schedule.push({
          resourceId: resource.id,
          shiftType: shift,
          shiftCode: shift,
          date: currentDateStr,
          floor: 0, // da assegnare dopo
          cycleIndex: cycleIdx,
        });

        if (shift === ShiftType.Morning) {
          dailyCount[ShiftType.Morning]++;
        } else {
          dailyCount[shift]++;
        }
        
        // Increment working days count only on working days
        partTimeWorkingDaysCount[resource.id]++;
      } else {
        // Part-time resource not working today
        schedule.push({
          resourceId: resource.id,
          shiftType: ShiftType.Free,
          shiftCode: ShiftType.Free,
          date: currentDateStr,
          floor: 0,
          cycleIndex: 0,
        });
        dailyCount[ShiftType.Free]++;
      }
    }

    // === STEP 3: Fill remaining requirements with available Free resources ===
    for (const shiftType of ["Morning", "Afternoon", "Split", "Night"] as ShiftType[]) {
      while (
        shiftType === ShiftType.Morning
          ? (dailyCount[ShiftType.Morning] < DAILY_REQUIREMENTS[ShiftType.Morning])
          : (dailyCount[shiftType] < DAILY_REQUIREMENTS[shiftType])
      ) {
        const free = schedule.find(
          (s) =>
            s.date === currentDateStr &&
            s.shiftType === ShiftType.Free &&
            !(
              shiftType === ShiftType.Night &&
              resources.find((r) => r.id === s.resourceId)?.type !== ResourceType.FULL_TIME
            )
        );

        if (!free) break;

        // Check if the resource can work on this day before assigning a shift
        const resource = resources.find(r => r.id === free.resourceId);
        if (resource && !shouldResourceWork(resource, currentDate)) {
          break; // Don't assign shifts to part-time workers on their off days
        }

        // Se stai assegnando Morning, non assegnare MorningI (già assegnato)
        free.shiftType = shiftType;
        free.shiftCode = shiftType;
        if (shiftType === ShiftType.Morning) {
          dailyCount[ShiftType.Morning]++;
        } else {
          dailyCount[shiftType]++;
        }
        dailyCount[ShiftType.Free]--;
      }
    }    // Assegna i floor
    const shiftsOfDay = schedule.filter(s => s.date === currentDateStr);

    assignFloors(shiftsOfDay, resources);
  }

  return schedule;
};

function assignFloors(shifts: ResourceShift[], resources: Resource[] = []) {
  const day = new Date(shifts[0].date).getDate();
  const weekIndex = Math.floor((day - 1) / 7); // 0-based index for the week of the month

  // Ordina i turni per resourceId per consistenza
  const sortByResourceId = (a: ResourceShift, b: ResourceShift) =>
    a.resourceId.localeCompare(b.resourceId);

  const rotate = <T>(arr: T[], shift: number): T[] => {
    const len = arr.length;
    shift = ((shift % len) + len) % len;
    return arr.slice(shift).concat(arr.slice(0, shift));
  };

  // Separate full-time and part-time shifts by shift type
  const getShiftsByType = (shiftType: ShiftType, isFullTime: boolean = true) => {
    return shifts.filter(s => {
      if (s.shiftType !== shiftType) return false;
      const resource = resources.find(r => r.id === s.resourceId);
      const resourceIsFullTime = resource?.type === ResourceType.FULL_TIME;
      return resourceIsFullTime === isFullTime;
    }).sort(sortByResourceId);
  };

  // Get shifts by type, separated by resource type
  const fullTimeMorningShifts = rotate(getShiftsByType(ShiftType.Morning, true), weekIndex);
  const partTimeMorningShifts = rotate(getShiftsByType(ShiftType.Morning, false), weekIndex);
  
  const morningIShifts = shifts.filter(s => s.shiftType === ShiftType.MorningI);
  
  const fullTimeAfternoonShifts = rotate(getShiftsByType(ShiftType.Afternoon, true), weekIndex);
  const partTimeAfternoonShifts = rotate(getShiftsByType(ShiftType.Afternoon, false), weekIndex);
  
  const fullTimeSplitShifts = rotate(getShiftsByType(ShiftType.Split, true), weekIndex);
  const partTimeSplitShifts = rotate(getShiftsByType(ShiftType.Split, false), weekIndex);

  // Assign floors for Morning shifts (Full-time + Part-time combined with separate rotation)
  const allMorningShifts = [...fullTimeMorningShifts, ...partTimeMorningShifts];
  if (allMorningShifts.length > 0) {
    allMorningShifts[0].floor = 3; // RA (first person)
    for (let i = 1; i < allMorningShifts.length; i++) {
      allMorningShifts[i].floor = ((i - 1) % 2) + 1; // Alternate between floor 1 and 2
    }
  }

  // MorningI: no floor
  morningIShifts.forEach(s => {
    s.floor = 0;
  });

  // Assign floors for Afternoon shifts (Full-time + Part-time combined with separate rotation)
  const allAfternoonShifts = [...fullTimeAfternoonShifts, ...partTimeAfternoonShifts];
  allAfternoonShifts.forEach((s, idx) => {
    s.floor = (idx % 3) + 1; // Rotate between floors 1, 2, 3(RA)
  });

  // Assign floors for Split shifts (Full-time + Part-time combined with separate rotation)
  const allSplitShifts = [...fullTimeSplitShifts, ...partTimeSplitShifts];
  if (allSplitShifts.length > 0) {
    allSplitShifts[0].floor = 3; // RA (first person)
    for (let i = 1; i < allSplitShifts.length; i++) {
      allSplitShifts[i].floor = ((i - 1) % 2) + 1; // Alternate between floor 1 and 2
    }
  }

  // Night, Free: no floor
  shifts.forEach(s => {
    if (
      s.shiftType === ShiftType.Night ||
      s.shiftType === ShiftType.Free
    ) {
      s.floor = 0;
    }
  });
}

export function replicateScheduleForMonth(
  originalSchedule: ResourceShift[],
  resources: Resource[],
  lastShiftIndexByResourceId: Record<string, number>,
  targetYear: number,
  targetMonth: number
): ResourceShift[] {
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

  const SHIFT_CYCLE: ShiftType[] = [
    ShiftType.Morning,
    ShiftType.Morning,
    ShiftType.Split,
    ShiftType.Afternoon,
    ShiftType.Night,
    ShiftType.Free,
    ShiftType.Free,
    ShiftType.Free,
  ];

  const partTimeShiftCycle: ShiftType[] = [
    ShiftType.Morning,
    ShiftType.Afternoon,
    ShiftType.Split,
    ShiftType.Free,
  ];
  // Separate full-time and part-time resources
  const fullTimeResources = resources.filter(r => r.type === ResourceType.FULL_TIME);
  const partTimeResources = resources.filter(r => r.type !== ResourceType.FULL_TIME);

  const newSchedule: ResourceShift[] = [];

  // Track working days count for part-time resources to manage their rotation independently
  const partTimeWorkingDaysCount: Record<string, number> = {};
  partTimeResources.forEach(r => {
    partTimeWorkingDaysCount[r.id] = 0;
  });

  for (let day = 1; day <= daysInTargetMonth; day++) {
    const currentDate = new Date(targetYear, targetMonth, day);
    const currentDateStr = new Date(targetYear, targetMonth, day + 1).toISOString().split("T")[0];

    // Handle full-time resources
    for (const resource of fullTimeResources) {
      const lastIndex = lastShiftIndexByResourceId[resource.id] ?? 0;
      const cycleIdx = (lastIndex + day) % SHIFT_CYCLE.length;
      let shift = SHIFT_CYCLE[cycleIdx];

      newSchedule.push({
        resourceId: resource.id,
        shiftType: shift,
        shiftCode: shift,
        date: currentDateStr,
        floor: 0,
        cycleIndex: cycleIdx,
      });
    }

    // Handle part-time resources with independent rotation
    for (const resource of partTimeResources) {
      if (shouldResourceWork(resource, currentDate)) {        // Use working days count for cycle progression, not calendar days
        const workingDayIndex = partTimeWorkingDaysCount[resource.id];
        const lastIndex = lastShiftIndexByResourceId[resource.id] ?? 0;
        const cycleIdx = (lastIndex + workingDayIndex) % partTimeShiftCycle.length;
        let shift = partTimeShiftCycle[cycleIdx];

        logPartTimeDebug(resource.id, currentDate, workingDayIndex, cycleIdx, shift);

        newSchedule.push({
          resourceId: resource.id,
          shiftType: shift,
          shiftCode: shift,
          date: currentDateStr,
          floor: 0,
          cycleIndex: cycleIdx,
        });

        // Increment working days count only on working days
        partTimeWorkingDaysCount[resource.id]++;
      } else {
        newSchedule.push({
          resourceId: resource.id,
          shiftType: ShiftType.Free,
          shiftCode: ShiftType.Free,
          date: currentDateStr,
          floor: 0,
          cycleIndex: 0,
        });
      }
    }
  }
  // assegna i floor per ogni giorno
  for (let day = 1; day <= daysInTargetMonth; day++) {
    const dateStr = new Date(targetYear, targetMonth, day + 1).toISOString().split("T")[0];
    const shiftsOfDay = newSchedule.filter(s => s.date === dateStr);
    assignFloors(shiftsOfDay, resources);
  }

  return newSchedule;
}

export function getLastShiftIndexByResource(
  schedule: ResourceShift[]
): Record<string, number> {
  const lastShiftIndexByResource: Record<string, number> = {};

  // ordina per data ascendente per sicurezza
  const sortedSchedule = [...schedule].sort((a, b) => a.date.localeCompare(b.date));

  // raggruppa per risorsa
  const groupedByResource: Record<string, ResourceShift[]> = {};
  for (const shift of sortedSchedule) {
    if (!groupedByResource[shift.resourceId]) groupedByResource[shift.resourceId] = [];
    groupedByResource[shift.resourceId].push(shift);
  }

  for (const [resourceId, shifts] of Object.entries(groupedByResource)) {
    // cerca ultimo turno, anche Free
    for (let i = shifts.length - 1; i >= 0; i--) {
      if (shifts[i].cycleIndex !== undefined) {
        lastShiftIndexByResource[resourceId] = shifts[i].cycleIndex;
        break;
      }
    }
  }

  return lastShiftIndexByResource;
}

function rotateArray<T>(arr: T[], shift: number): T[] {
  const len = arr.length;
  shift = ((shift % len) + len) % len; // shift positivo modulo len
  return arr.slice(shift).concat(arr.slice(0, shift));
}


