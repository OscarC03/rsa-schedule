"use client";

import { GenerateShift } from "@/Application Code/Shift Management/ShiftManagement";
import { Resource, ResourceType, Shift, ShiftType } from "@/model/model";
import { useEffect } from "react";

export default function Page() {
    const resources: Resource[] = [
        // 23 OSS A TEMPO PIENO
        ...Array.from({ length: 23 }, (_, i) => ({
            id: i + 1,
            firstName: `OSS${i + 1}`,
            lastName: `FullTime`,
            forbiddenShiftTypes: [],
            type: ResourceType.FULL_TIME,
            fixedDays: []
        })),
        // 1 OSS PART TIME 50%
        {
            id: 24,
            firstName: "OSS24",
            lastName: "PartTime50",
            forbiddenShiftTypes: [],
            type: ResourceType.PART_TIME_50,
            fixedDays: []
        },
        // 3 OSS PART TIME 70%
        ...Array.from({ length: 3 }, (_, i) => ({
            id: 25 + i,
            firstName: `OSS${25 + i}`,
            lastName: "PartTime70",
            forbiddenShiftTypes: [],
            type: ResourceType.PART_TIME_70,
            fixedDays: []
        }))
    ];

    const shifts: Shift[] = [
        {
            code: "MORNING",
            description: "Mattina",
            type: ShiftType.Morning,
            startTime: "07:00",
            endTime: "14:00"
        },
        {
            code: "AFTERNOON",
            description: "Pomeriggio",
            type: ShiftType.Afternoon,
            startTime: "14:00",
            endTime: "21:00"
        },
        {
            code: "NIGHT",
            description: "Notte",
            type: ShiftType.Night,
            startTime: "21:00",
            endTime: "07:00"
        },
        {
            code: "SPLIT",
            description: "Spezzato",
            type: ShiftType.Split,
            startTime: "09:00",
            endTime: "18:00"
        },
        {
            code: "FREE",
            description: "Riposo",
            type: ShiftType.Free,
            startTime: "",
            endTime: ""
        }
    ];

    useEffect(() => {
        const startDate = new Date('2025-05-01');
        const resourceShifts = GenerateShift(startDate, resources, shifts);
        console.log(resourceShifts);
    }, []);

    return (
        <></>
    );
}