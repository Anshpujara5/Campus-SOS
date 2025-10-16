import { Appbar } from "../../components/Appbar"
import Auth from "../../components/Auth"

export const Signin = ()=>{
    return <div className="grid grid-col">
        <Appbar/>
        <Auth mode="signin"/>
    </div>
}