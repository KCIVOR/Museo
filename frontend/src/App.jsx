import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Home from "./pages/Home";
import { Routes, Route, useLocation } from 'react-router-dom';
import ProtectedRoutes from "./utils/protectedRoutes";

import { useState, useEffect } from 'react';
import Register from "./pages/Register";

function App(){
  const location = useLocation();
  const hideNavbar = location.pathname === '/' || location.pathname ==="/Register";
  
  return (
    <>

      {!hideNavbar && <Navbar />}
      

      <Routes>
        <Route path="/" element={<Login/>}></Route>
        <Route path="/Register" element={<Register/>}></Route>
        <Route element={<ProtectedRoutes/>}>
          <Route path="/Home" element={<Home/>}></Route>
        </Route>
      </Routes>

    </>
  )
  
}


export default App