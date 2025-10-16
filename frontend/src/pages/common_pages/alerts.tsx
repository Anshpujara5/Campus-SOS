import { AlertCard } from "../../components/alertCard";
import { Appbar } from "../../components/Appbar";
import { useAlerts } from "../../hooks";

export function Alerts(){
    const  {loading , alerts }  = useAlerts();

    if(loading){
        return <div>
            <Appbar/>
            loading....
        </div>
    }
    return <div>
        <Appbar/>
        <div className="flex justify-center">
            <div className="max-w-xl">
                {alerts.map(alert=><AlertCard
                id={alert.id}
                authorName={alert.createdByName || "Anonymous"}
                title={alert.title}
                content={alert.message}
                publishedDate={alert.createdAt || "None"}
                role={alert.type}
                status={alert.status}
                callTo={alert.callTo}
                />)}
            </div>
        </div>
    </div>
}