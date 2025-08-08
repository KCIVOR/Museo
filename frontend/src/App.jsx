import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Homepage from "./pages/Homepage"
import { Routes, Route, useLocation } from 'react-router-dom';

import { useState, useEffect } from 'react';

function App(){
  const location = useLocation();
  const hideNavbar = location.pathname === '/';
  return (
    <>

      {!hideNavbar && <Navbar />}
      

      <Routes>
        <Route path="/" element={<Login/>}></Route>
        <Route path="/Homepage" element={<Homepage/>}></Route>
      </Routes>

    </>
  )
  
}


export default App