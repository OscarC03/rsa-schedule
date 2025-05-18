import { Floor } from "./shift";

export interface Employee {
  id: string;
  name: string;
  canWorkFloors: Floor[];
  isPartTime: boolean;
  rotationEnabled: boolean;
  color: string;
}