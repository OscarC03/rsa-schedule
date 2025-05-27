
export class Resource {
    public id: number = 0;
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
    public type: ShiftType = ShiftType.None;
    public startTime: string = "";
    public endTime: string = "";
}

export enum ShiftType {
    None,
    Morning,
    Split,
    Afternoon,
    Night,
    Free,
}

export class ResourceShift {
    public resourceId: number = 0;
    public shiftCode: string = "";
    public shiftType: ShiftType = ShiftType.None;
    public date: Date = new Date();
}