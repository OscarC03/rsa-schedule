import { Resource, ResourceShift, Shift, ShiftType } from "@/model/model";

export const GenerateShift = (startDate: Date, resources: Resource[], shifts: Shift[]): ResourceShift[] => {
    let resourceShifts: ResourceShift[] = [];
    const startDay = new Date(startDate);
    const endDay: Date = new Date('2025-05-31');
    let currentDay: Date = new Date(startDay);

    let morningCount: number = 0;
    let splitCount: number = 0;
    let afternoonCount: number = 0;
    let nightCount: number = 0;
    while(startDay <= endDay) {
        while(morningCount = 5){
            resources.forEach(resource => {
                if (canUseResource(resourceShifts, resource, ShiftType.Morning, currentDay)) {
                    resourceShifts.push({
                        resourceId: resource.id,
                        shiftCode: 'MORNING',
                        shiftType: ShiftType.Morning,
                        date: currentDay
                    });

                    morningCount++;
                }
            });
        }

        while(splitCount = 3){
            resources.forEach(resource => {
                if (canUseResource(resourceShifts, resource, ShiftType.Split, currentDay)) {
                    resourceShifts.push({
                        resourceId: resource.id,
                        shiftCode: 'SPLIT',
                        shiftType: ShiftType.Split,
                        date: currentDay
                    });
                    
                    splitCount++;
                }
            });
        }

        while(afternoonCount = 4){
            resources.forEach(resource => {
                if (canUseResource(resourceShifts, resource, ShiftType.Afternoon, currentDay)) {
                    resourceShifts.push({
                        resourceId: resource.id,
                        shiftCode: 'AFTERNOON',
                        shiftType: ShiftType.Afternoon,
                        date: currentDay
                    });
                    
                    afternoonCount++;
                }
            });
        }

        while(nightCount = 2){
            resources.forEach(resource => {
                if (canUseResource(resourceShifts, resource, ShiftType.Night, currentDay)) {
                    resourceShifts.push({
                        resourceId: resource.id,
                        shiftCode: 'NIGHT',
                        shiftType: ShiftType.Night,
                        date: currentDay
                    });
                    
                    nightCount++;
                }
            });
        }

        currentDay.setDate(currentDay.getDate() + 1);
    }

    return resourceShifts;
}

export const canUseResource = (resourceShifts: ResourceShift[], resource: Resource, shiftType: ShiftType, date: Date): boolean => {
    if (resource.forbiddenShiftTypes.includes(shiftType)) {
        return false;
    }
    if (resourceShifts.findIndex(e => e.date === date) !== -1) {
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
}

export const getDaysInMonth = (year: number, month: number): number => {
  // month: 0 = gennaio, 1 = febbraio, ..., 11 = dicembre
  return new Date(year, month + 1, 0).getDate();
}
