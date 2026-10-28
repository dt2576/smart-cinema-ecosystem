import { ManagerSeatManagement } from "@/features/manager/manager-seat-screen";
export default async function Page({params}:{params:Promise<{hallId:string}>}){return <ManagerSeatManagement hallId={(await params).hallId} />;}
