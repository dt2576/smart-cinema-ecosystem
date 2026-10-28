import { ManagerStaffScreen } from "@/features/manager/manager-staff-screen";
export default async function Page({params}:{params:Promise<{cinemaId:string}>}){return <ManagerStaffScreen cinemaId={(await params).cinemaId} />;}
