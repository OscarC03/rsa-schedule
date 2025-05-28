import { Resource, ResourceShift, ResourceType, ShiftType } from "@/model/model";

export const generateShift = (startDate: Date, resources: Resource[]): ResourceShift[] => {
  const DAILY_REQUIREMENTS: Record<ShiftType, number> = {
    Morning: 5,
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

  const resourceCycleIndex: Record<string, number> = {};
  resources.forEach((r, i) => {
    resourceCycleIndex[r.id] = i % SHIFT_CYCLE.length;
  });

  const schedule: ResourceShift[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day + 1).toISOString().split("T")[0];

    const dailyCount: Record<ShiftType, number> = {
      Morning: 0,
      Afternoon: 0,
      Split: 0,
      Night: 0,
      Free: 0,
    };

    const rotatedResources = rotateArray(resources, day);

    for (const resource of rotatedResources) {
      const cycleIdx = resourceCycleIndex[resource.id];
      let shift = SHIFT_CYCLE[cycleIdx];

      // Skip Night if resource is part-time
      if (
        shift === ShiftType.Night &&
        (resource.type === ResourceType.PART_TIME_50 || resource.type === ResourceType.PART_TIME_70)
      ) {
        shift = ShiftType.Free;
      }

      schedule.push({
        resourceId: resource.id,
        shiftType: shift,
        shiftCode: shift,
        date: currentDate,
        floor: 0, // da assegnare dopo
        cycleIndex: cycleIdx,
      });

      dailyCount[shift]++;
      resourceCycleIndex[resource.id] = (cycleIdx + 1) % SHIFT_CYCLE.length;
    }

    for (const shiftType of ["Morning", "Afternoon", "Split", "Night"] as ShiftType[]) {
      while (dailyCount[shiftType] < DAILY_REQUIREMENTS[shiftType]) {
        const free = schedule.find(
          (s) =>
            s.date === currentDate &&
            s.shiftType === ShiftType.Free &&
            !(
              shiftType === ShiftType.Night &&
              resources.find((r) => r.id === s.resourceId)?.type !== ResourceType.FULL_TIME
            )
        );

        if (!free) break;

        free.shiftType = shiftType;
        free.shiftCode = shiftType;
        dailyCount[shiftType]++;
        dailyCount[ShiftType.Free]--;
      }
    }

    // Assegna i floor
    const shiftsOfDay = schedule.filter(s => s.date === currentDate);

    assignFloors(shiftsOfDay);
  }

  return schedule;
};

function assignFloors(shifts: ResourceShift[]) {
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

  const morningShifts = rotate(
    shifts.filter(s => s.shiftType === ShiftType.Morning).sort(sortByResourceId),
    weekIndex
  );
  const afternoonShifts = rotate(
    shifts.filter(s => s.shiftType === ShiftType.Afternoon).sort(sortByResourceId),
    weekIndex
  );
  const splitShifts = rotate(
    shifts.filter(s => s.shiftType === ShiftType.Split).sort(sortByResourceId),
    weekIndex
  );

  // Morning: 1 at floor 4, rest floors 1-3
  if (morningShifts.length > 0) {
    morningShifts[0].floor = 4;
    for (let i = 1; i < morningShifts.length; i++) {
      morningShifts[i].floor = ((i - 1) % 3) + 1;
    }
  }

  // Afternoon: one for each floor 1-4
  afternoonShifts.forEach((s, idx) => {
    s.floor = (idx % 4) + 1;
  });

  // Split: 1 at floor 4, rest floors 1-3
  if (splitShifts.length > 0) {
    splitShifts[0].floor = 4;
    for (let i = 1; i < splitShifts.length; i++) {
      splitShifts[i].floor = ((i - 1) % 3) + 1;
    }
  }

  // Night and Free: no floor
  shifts.forEach(s => {
    if (s.shiftType === ShiftType.Night || s.shiftType === ShiftType.Free) {
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

  const baseYear = new Date(originalSchedule[0].date).getFullYear();
  const baseMonth = new Date(originalSchedule[0].date).getMonth();
  const baseDaysInMonth = new Date(baseYear, baseMonth + 1, 0).getDate();

  const newSchedule: ResourceShift[] = [];

  for (let day = 1; day <= daysInTargetMonth; day++) {
    const currentDateStr = new Date(targetYear, targetMonth, day + 1).toISOString().split("T")[0];

    // Per ogni risorsa calcoliamo il turno assegnato quel giorno
    for (const resource of resources) {
      // indice ultimo turno fatto
      const lastIndex = lastShiftIndexByResourceId[resource.id] ?? 0;

      // calcolo indice turno per il giorno corrente:
      // (ultimo indice + giorno corrente) modulo lunghezza ciclo
      const cycleIdx = (lastIndex + day) % SHIFT_CYCLE.length;
      let shift = SHIFT_CYCLE[cycleIdx];

      // Skip Night se part-time
      if (
        shift === ShiftType.Night &&
        (resource.type === ResourceType.PART_TIME_50 || resource.type === ResourceType.PART_TIME_70)
      ) {
        shift = ShiftType.Free;
      }

      newSchedule.push({
        resourceId: resource.id,
        shiftType: shift,
        shiftCode: shift,
        date: currentDateStr,
        floor: 0,
        cycleIndex: cycleIdx,
      });
    }
  }

  // assegna i floor per ogni giorno
  for (let day = 1; day <= daysInTargetMonth; day++) {
    const dateStr = new Date(targetYear, targetMonth, day + 1).toISOString().split("T")[0];
    const shiftsOfDay = newSchedule.filter(s => s.date === dateStr);
    assignFloors(shiftsOfDay);
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


