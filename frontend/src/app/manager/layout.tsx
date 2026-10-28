import type { ReactNode } from "react";
import { ManagerShell } from "@/features/manager/manager-shell";
export default function Layout({children}:{children:ReactNode}) {return <ManagerShell>{children}</ManagerShell>;}
