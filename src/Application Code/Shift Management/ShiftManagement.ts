import { Resource, ResourceShift, ShiftType } from "@/model/model";

export const GenerateShift = (startDate: Date, resources: Resource[]): ResourceShift[] => {
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

  // Inizializza il punto nel ciclo per ogni risorsa
  const resourceCycleIndex: Record<string, number> = {};
  resources.forEach((r, i) => {
    resourceCycleIndex[r.id] = i % SHIFT_CYCLE.length;
  });

  const schedule: ResourceShift[] = [];

  for (let day = 0; day < daysInMonth; day++) {
    const currentDate = new Date(year, month, day + 1).toISOString().split("T")[0];

    const dailyCount: Record<ShiftType, number> = {
      Morning: 0,
      Afternoon: 0,
      Split: 0,
      Night: 0,
      Free: 0,
    };

    // Ruota le risorse ogni giorno per distribuire equamente chi "inizia"
    const rotatedResources = rotateArray(resources, day);

    // Prima passata: assegna il turno del ciclo
    for (const resource of rotatedResources) {
      const cycleIdx = resourceCycleIndex[resource.id];
      const shift = SHIFT_CYCLE[cycleIdx];

      schedule.push({
        resourceId: resource.id,
        shiftType: shift,
        shiftCode: shift,
        date: currentDate,
      });

      dailyCount[shift]++;
      resourceCycleIndex[resource.id] = (cycleIdx + 1) % SHIFT_CYCLE.length;
    }

    // Seconda passata: correggi se mancano turni da coprire
    for (const shiftType of ["Morning", "Afternoon", "Split", "Night"] as ShiftType[]) {
      while (dailyCount[shiftType] < DAILY_REQUIREMENTS[shiftType]) {
        // Trova una risorsa a cui è stato assegnato "Free"
        const free = schedule.find(
          (s) => s.date === currentDate && s.shiftType === ShiftType.Free
        );

        if (!free) break;

        free.shiftType = shiftType;
        free.shiftCode = shiftType;
        dailyCount[shiftType]++;
        dailyCount[ShiftType.Free]--;
      }
    }
  }

  return schedule;
};

function rotateArray<T>(arr: T[], shift: number): T[] {
  const len = arr.length;
  shift = ((shift % len) + len) % len; // shift positivo modulo len
  return arr.slice(shift).concat(arr.slice(0, shift));
}



/*export const canUseResource = (resourceShifts: ResourceShift[], resource: Resource, shiftType: ShiftType, date: Date): boolean => {
    if (resource.forbiddenShiftTypes.includes(shiftType)) {
        return false;
    }
    if (resourceShifts.findIndex(e => e.date === date && e.resourceId === resource.id && e.shiftType !== ShiftType.Free) !== -1) {
        return false;
    }

    let prevDate: Date = new Date(date.setDate(date.getDate() - 1));
    let prevResourceShift: ResourceShift | undefined = resourceShifts.find(e => e.resourceId === resource.id && e.date === prevDate);
    if (prevResourceShift) {
        if ((prevResourceShift.shiftType === ShiftType.Afternoon || prevResourceShift.shiftType === ShiftType.Split) && shiftType === ShiftType.Morning) {
            return false;
        }
    }

    return true;
}*/

export const getDaysInMonth = (year: number, month: number): number => {
  // month: 0 = gennaio, 1 = febbraio, ..., 11 = dicembre
  return new Date(year, month + 1, 0).getDate();
}
