import { useParams } from "react-router-dom";
import { Appbar } from "../../components/Appbar";
import { FullAlert } from "../../components/FullAlert";
import { useAlert } from "../../hooks";
export const Alert = ()=>{
    const {id} = useParams();
    const {loading,alert} = useAlert({
        id:id || "" 
    });

    if(loading || !alert){
        return <div>
            <Appbar/>
            loading...
        </div>
    }
    
    return <div>
        <FullAlert alert={alert}/>
    </div>
}