import axios from "axios";
import { useEffect, useState } from "react"
import { BACKEND_URL } from "../config";

type Role = 'student' | 'security' | 'driver';

export interface InnerAlert{
    id: string;
    message: string;
    type: Role;
    status?: "active" | "resolved";
    createdAt?: string;
    createdById?: string | null;
    createdByName:string | null;
    name:string;
    title:string;
    callTo:Role[];
}

interface AlertResponse {
  UniqueAlert: InnerAlert;
}

export const useAlert = ({id} : {id:string})=>{
    const [loading , setLoading ] = useState(true);
    const [alert , setAlert ] = useState<InnerAlert | null>(null);

    useEffect(()=>{
        const token=localStorage.getItem("token");
        if(!token){
            console.warn("Token not found");
            setLoading(false);
            return;
        }

        axios.get<AlertResponse>(`${BACKEND_URL}/api/v1/alert/alerts/${id}`,{
            headers:{
                Authorization:token
            }
        })
        .then(res=>{
            setAlert(res.data.UniqueAlert)
        })
        .catch(err=>{
            console.error("Failed to fetch Alert",err);
        })
        .finally(()=>{
            setLoading(false);
        });

    },[id]);

    return {
        loading,
        alert
    }
}

export const useAlerts = ()=>{
    const [ loading , setLoading ] = useState(true);
    const [ alerts , setAlerts ] = useState<InnerAlert[]>([]);

    useEffect(()=>{
        axios.get(`${BACKEND_URL}/api/v1/alert/alerts`,{
            headers:{
                Authorization:localStorage.getItem("token")
            }
        })
        .then(response=>{
            setAlerts(response.data);
            setLoading(false);
        })
    },[]);

    return {
        loading,
        alerts
    }
}

export interface MeResponse {
  id: string;
  email: string; 
  name: string;  
  role: Role;     
}

export const useMe = async()=>{
    const token = localStorage.getItem("token") ?? "";
    const res = await fetch( `${BACKEND_URL}/api/v1/user/me`,{
        headers:{
            Authorization:token,
            "Content-Type": "application/json",
        }
    });
    if(!res.ok){
        throw new Error(`HTTP ${res.status}`);
    }

    return res.json();
}