
export class Resource {
    public id: string = '';
    public firstName: string = "";
    public lastName: string = "";
    public forbiddenShiftTypes: ShiftType[] = [];
    public type: ResourceType = ResourceType.None;
    public fixedDays: Days[] = [];
}

export enum ResourceType {
    None,
    FULL_TIME,
    PART_TIME_50,
    PART_TIME_70
}

export enum Days {
    Monday = 1,
    Tuesday = 2,
    Wednesday = 3,
    Thursday = 4,
    Friday = 5,
    Saturday = 6,
    Sunday = 7
}

export class Shift {
    public code: string = "";
    public description: string = "";
    public type: ShiftType = ShiftType.Morning;
    public startTime: string = "";
    public endTime: string = "";
}

export enum ShiftType {
    Morning = 'Morning',
    Split = 'Split',
    Afternoon = 'Afternoon',
    Night = 'Night',
    Free = 'Free',
}

export class ResourceShift {
    public resourceId: string = '';
    public shiftCode: string = "";
    public shiftType: ShiftType = ShiftType.Morning;
    public date: string = '';
}