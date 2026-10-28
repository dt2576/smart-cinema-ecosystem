import { ManagerCinemaDetail } from "@/features/manager/manager-cinema-screen";
export default async function Page({params}:{params:Promise<{cinemaId:string}>}){return <ManagerCinemaDetail cinemaId={(await params).cinemaId} />;}
