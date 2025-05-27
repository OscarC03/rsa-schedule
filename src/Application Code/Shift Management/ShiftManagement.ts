import { Resource, ResourceShift, Shift, ShiftType } from "@/model/model";

export const GenerateShift = (startDate: Date, resources: Resource[]): ResourceShift[] => {
    let resourceShifts: ResourceShift[] = [];
    const SHIFT_SCHEME: ShiftType[] = [
        ShiftType.Morning,
        ShiftType.Morning,
        ShiftType.Split,
        ShiftType.Afternoon,
        ShiftType.Night,
        ShiftType.Free,
        ShiftType.Free,
        ShiftType.Free,
    ];

    let year: number = startDate.getFullYear();
    let month: number = startDate.getMonth();
    let daysInMonth: number = getDaysInMonth(year, month);
    for (let day = 1; day <= daysInMonth; day++) {
        const currDate = new Date(year, month, day).toISOString().split('T')[0];

        resources.forEach((resource, index) => {
            // Calcolo posizione nel ciclo di 8 giorni: ogni risorsa ha un ciclo indipendente
            // Si somma il giorno - 1 (zero-based) e si sottrae l'offset della risorsa per fare partire il ciclo in giorni diversi
            const shiftIndex = ((day - 1) + (SHIFT_SCHEME.length - (index % SHIFT_SCHEME.length))) % SHIFT_SCHEME.length;
            const shift: ShiftType = SHIFT_SCHEME[shiftIndex];

            resourceShifts.push({
                resourceId: resource.id,
                shiftCode: shift.toString(),
                date: currDate,
                shiftType: shift,
            });
        });
    }

    return resourceShifts;
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
