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
        if (morningCount === 0) {
            while(morningCount <= 5){
                for (let resource of resources) {
                    if (canUseResource(resourceShifts, resource, ShiftType.Morning, currentDay)) {
                        resourceShifts.push({
                            resourceId: resource.id,
                            shiftCode: 'MORNING',
                            shiftType: ShiftType.Morning,
                            date: currentDay
                        });

                        morningCount += 1;
                    }

                    if (morningCount >= 5)
                        break;
                }

                if (morningCount >= 5)
                    break;
            }
        }

        if(splitCount === 0) {
            while(splitCount <= 3){
                for (let resource of resources) {
                    if (canUseResource(resourceShifts, resource, ShiftType.Split, currentDay)) {
                        resourceShifts.push({
                            resourceId: resource.id,
                            shiftCode: 'SPLIT',
                            shiftType: ShiftType.Split,
                            date: currentDay
                        });
                        
                        splitCount += 1;
                    }

                    if (splitCount >= 3)
                        break;
                };

                if (splitCount >= 3)
                    break;
            }
        }
        
        if(afternoonCount === 0) {
            while(afternoonCount <= 4){
                for (let resource of resources) {
                    if (canUseResource(resourceShifts, resource, ShiftType.Afternoon, currentDay)) {
                        resourceShifts.push({
                            resourceId: resource.id,
                            shiftCode: 'AFTERNOON',
                            shiftType: ShiftType.Afternoon,
                            date: currentDay
                        });
                        
                        afternoonCount += 1;
                    }

                    if (afternoonCount >= 4)
                        break;
                };

                if (afternoonCount >= 4)
                    break;
            }
        }

        if(nightCount === 0) {
            while(nightCount <= 2){
                for (let resource of resources) {
                    if (canUseResource(resourceShifts, resource, ShiftType.Night, currentDay)) {
                        resourceShifts.push({
                            resourceId: resource.id,
                            shiftCode: 'NIGHT',
                            shiftType: ShiftType.Night,
                            date: currentDay
                        });
                        
                        nightCount += 1;
                    }

                    if (nightCount >= 2)
                        break;
                };

                if (nightCount >= 2)
                    break;
            }
        }

        if (morningCount >= 5 && splitCount >= 3 && afternoonCount >= 4 && nightCount >= 2) {
            currentDay.setDate(currentDay.getDate() + 1);
            morningCount = 0;
            splitCount = 0;
            afternoonCount = 0;
            nightCount = 0;
            
            resourceShifts.forEach((shift) => {
                let shiftDate: Date = new Date(shift.date);
                for(let i = 0; i < 3; i++) {
                    let currFreeDay: Date = new Date(shiftDate.setDate(shiftDate.getDate() + i+1));
                    resourceShifts.push({
                        resourceId: shift.resourceId,
                        shiftCode: 'FREE',
                        shiftType: ShiftType.Free,
                        date: currFreeDay
                    });
                }
            });
        }

        if (currentDay >= endDay) {
            break;
        }
    }

    return resourceShifts;
}

export const canUseResource = (resourceShifts: ResourceShift[], resource: Resource, shiftType: ShiftType, date: Date): boolean => {
    if (resource.forbiddenShiftTypes.includes(shiftType)) {
        return false;
    }
    if (resourceShifts.findIndex(e => e.date === date && e.resourceId === resource.id) !== -1) {
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
