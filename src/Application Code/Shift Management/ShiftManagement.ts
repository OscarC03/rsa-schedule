import { Resource, ResourceShift, Shift, ShiftType } from "@/model/model";

export const GenerateShift = (startDate: Date, resources: Resource[]): ResourceShift[] => {
    const SHIFT_TO_FILL: Record<ShiftType, number> = {
        Morning: 5,
        Afternoon: 4,
        Split: 3,
        Night: 2,
        Free: 0,
    };

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

    const year = startDate.getFullYear();
    const month = startDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);

    let result: ResourceShift[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
        const currDate = new Date(year, month, day).toISOString().split('T')[0];

        // Calcola il turno previsto per ogni risorsa quel giorno
        const previsioneTurni: { resource: Resource; shift: ShiftType }[] = resources.map((resource, index) => {
            const shiftIndex = ((day - 1) + (SHIFT_SCHEME.length - (index % SHIFT_SCHEME.length))) % SHIFT_SCHEME.length;
            return { resource, shift: SHIFT_SCHEME[shiftIndex] };
        });

        // Raggruppa risorse per turno
        const gruppi: Record<ShiftType, Resource[]> = {
            Morning: [],
            Afternoon: [],
            Split: [],
            Night: [],
            Free: [],
        };

        previsioneTurni.forEach(({ resource, shift }) => {
        gruppi[shift].push(resource);
        });

        // Assegna esattamente N risorse per turno, il resto a Free
        const assegnati: ResourceShift[] = [];

        // Funzione helper per assegnare max n risorse al turno
        const assegnaRisorse = (turno: ShiftType, maxCount: number) => {
        const daAssegnare = gruppi[turno].slice(0, maxCount);
        daAssegnare.forEach(resource => {
            assegnati.push({
            resourceId: resource.id.toString(),
            shiftCode: turno.toString(),
            date: currDate,
            shiftType: turno,
            });
        });
        // Rimuovi le risorse assegnate da gruppi[turno]
        gruppi[turno] = gruppi[turno].slice(maxCount);
        };

        // Assegna i turni principali con i numeri esatti
        assegnaRisorse(ShiftType.Morning, SHIFT_TO_FILL.Morning);
        assegnaRisorse(ShiftType.Afternoon, SHIFT_TO_FILL.Afternoon);
        assegnaRisorse(ShiftType.Split, SHIFT_TO_FILL.Split);
        assegnaRisorse(ShiftType.Night, SHIFT_TO_FILL.Night);

        // Tutte le risorse rimaste (anche quelle che inizialmente erano Free e quelle tagliate fuori) vanno in Free
        const risorseRimanenti = [
        ...gruppi.Morning,
        ...gruppi.Afternoon,
        ...gruppi.Split,
        ...gruppi.Night,
        ...gruppi.Free,
        ];

        risorseRimanenti.forEach(resource => {
        assegnati.push({
            resourceId: resource.id.toString(),
            shiftCode: ShiftType.Free.toString(),
            date: currDate,
            shiftType: ShiftType.Free,
        });
        });

        result.push(...assegnati);
    }

    // Ordina per data e risorsa
    result.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.resourceId.localeCompare(b.resourceId);
    });

    return result;
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
