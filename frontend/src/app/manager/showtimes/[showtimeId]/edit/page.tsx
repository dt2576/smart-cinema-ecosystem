import { ManagerShowtimeEditor } from "@/features/manager/manager-showtime-screen";
export default async function Page({params}:{params:Promise<{showtimeId:string}>}){return <ManagerShowtimeEditor showtimeId={(await params).showtimeId} />;}
