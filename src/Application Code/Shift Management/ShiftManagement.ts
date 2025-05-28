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
  sourceMonth: number, // 0=gennaio, 4=maggio
  targetYear: number,
  targetMonth: number
): ResourceShift[] {
  // giorni del mese target
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

  // filtra la schedule base per ordinare per giorno
  // estrai i turni raggruppati per giorno (stringa ISO)
  const scheduleByDay: ResourceShift[][] = [];
  const baseYear = new Date(originalSchedule[0].date).getFullYear();
  const baseMonth = new Date(originalSchedule[0].date).getMonth();

  for (let day = 1; day <= daysInTargetMonth; day++) {
    // calcolo giorno modulo giorni mese base
    const baseDay = ((day - 1) % (new Date(baseYear, baseMonth + 1, 0).getDate())) + 1;

    // filtra i turni del baseDay
    const dayShifts = originalSchedule.filter(s => {
      const sDate = new Date(s.date);
      return sDate.getFullYear() === baseYear &&
        sDate.getMonth() === baseMonth &&
        sDate.getDate() === baseDay;
    });

    // cambia la data al targetYear/targetMonth/day
    const newDateStr = new Date(targetYear, targetMonth, day + 1).toISOString().split("T")[0];
    const newDayShifts = dayShifts.map(shift => ({
      ...shift,
      date: newDateStr,
    }));

    scheduleByDay.push(newDayShifts);
  }

  // appiattisci e restituisci
  return scheduleByDay.flat();
};


function rotateArray<T>(arr: T[], shift: number): T[] {
  const len = arr.length;
  shift = ((shift % len) + len) % len; // shift positivo modulo len
  return arr.slice(shift).concat(arr.slice(0, shift));
}


