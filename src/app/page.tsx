"use client";

import { GenerateShift } from "@/Application Code/Shift Management/ShiftManagement";
import { Resource, ResourceShift, ResourceType, Shift, ShiftType } from "@/model/model";
import { useEffect, useState } from "react";

export default function Page() {
    const [shifts, setShifts] = useState<ResourceShift[]>([]);
    const [matrix, setMatrix] = useState<Record<string, Record<string, ResourceShift>>>({});
    const [dateArray, setDateArray] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const resources: Resource[] = [
        // 23 OSS A TEMPO PIENO
        ...Array.from({ length: 23 }, (_, i) => ({
            id: (i + 1).toString(),
            firstName: `OSS${i + 1}`,
            lastName: `FullTime`,
            forbiddenShiftTypes: [],
            type: ResourceType.FULL_TIME,
            fixedDays: []
        })),
        // 1 OSS PART TIME 50%
        {
            id: '24',
            firstName: "OSS24",
            lastName: "PartTime50",
            forbiddenShiftTypes: [],
            type: ResourceType.PART_TIME_50,
            fixedDays: []
        },
        // 3 OSS PART TIME 70%
        ...Array.from({ length: 3 }, (_, i) => ({
            id: (25 + i).toString(),
            firstName: `OSS${25 + i}`,
            lastName: "PartTime70",
            forbiddenShiftTypes: [],
            type: ResourceType.PART_TIME_70,
            fixedDays: []
        }))
    ];

    const coloriTurni: Record<ShiftType, string> = {
        Morning: '#D1E7DD',    // verde chiaro
        Afternoon: '#FFE5B4', // arancio chiaro
        Split: '#CFE2FF',   // azzurro chiaro
        Night: '#B6D7A8',      // verde più scuro
        Free: '#F0F0F0',     // grigio chiaro
    };

    useEffect(() => {
        const startDate = new Date('2025-05-01');
        const resourceShifts = GenerateShift(startDate, resources);
        setShifts(resourceShifts);

        // Estrai tutte le date distinte ordinate
        const dateSet = new Set(resourceShifts.map(t => t.date));
        const dateArray = Array.from(dateSet).sort();
        setDateArray(dateArray);

        // Costruisci una mappa per accedere velocemente ai turni [risorsa][data] => turno
        const mappaTurni: Record<string, Record<string, ResourceShift>> = {};

        resources.forEach(resource => {
            mappaTurni[resource.id] = {};
        });

        resourceShifts.forEach((value: ResourceShift, index: number, array: ResourceShift[]) => {
            mappaTurni[value.resourceId][value.date] = value;
        });
        
        setMatrix(mappaTurni);
        setIsLoading(false);
    }, []);

    if(isLoading)
        return <div className="p-4">Caricamento in corso...</div>;

    return (
        <div className="p-4 overflow-auto">
            <h2 className="text-xl font-semibold mb-4">Turni OSS - Maggio 2025 (Copertura fissa)</h2>
            <table className="min-w-full border border-gray-300 table-auto">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="p-2 border sticky top-0 bg-gray-100 z-10 text-black">Risorsa</th>
                        {dateArray.map(date => (
                        <th key={date} className="p-2 border sticky top-0 bg-gray-100 text-black z-10" style={{ whiteSpace: 'nowrap' }}>
                            {date}
                        </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                {resources.map(risorsa => (
                    <tr key={risorsa.id} className="odd:bg-white even:bg-gray-50 text-black">
                    <td className="p-2 border font-medium text-black">{risorsa.firstName}</td>
                    {dateArray.map(date => {
                        const turno = matrix[risorsa.id][date];
                        return (
                        <td
                            key={date}
                            className="p-2 border text-center text-black"
                            style={{ backgroundColor: coloriTurni[turno.shiftType] || undefined }}
                            title={turno.shiftType.toString()}
                        >
                            {turno.shiftType.toString()}
                        </td>
                        );
                    })}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}