import {Outlet, Navigate} from "react-router-dom";
import { decodeJWT } from "./auth";

const ProtectedRoutes = () =>{
    const token = localStorage.getItem("token");

    if(!token){
        return <Navigate to="/" replace/>
    }
    const user = decodeJWT(token);
    console.log(user)

    return user ? <Outlet/> :<Navigate to="/"/>
}

export default ProtectedRoutes;