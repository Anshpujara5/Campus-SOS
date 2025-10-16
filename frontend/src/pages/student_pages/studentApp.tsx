import {  Route, Routes } from "react-router-dom";
import { SidebarProvider } from "../../components/sidebar";
import { Signup } from "../common_pages/signup";
import { Alert } from "../common_pages/alert";
import MyAlerts from "../common_pages/myAlerts";
import ForYou from "../common_pages/forYou";

export default function StudentApp(){
    return (
      <SidebarProvider>
        <Routes>
            <Route index element={<Signup/>} />
            <Route path="/alert/:id" element={<Alert/>}/>
            <Route path="/my-alerts" element={<MyAlerts/>}/>
            <Route path="/foryou" element={<ForYou/>}/>
        </Routes>
      </SidebarProvider>
    )
}