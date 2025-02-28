import "./App.css";
import { useState } from "react";
import ChatInterface from "./pages/ChatInterface";
import LandingPage from "./pages/LandingPage";


function App() {
  const [isModelOpen, setIsModelOpen] = useState<boolean>(false);
  const navigateModel =()=>{
    setIsModelOpen(true)
  }
  return (
    <>
     {isModelOpen ? (<ChatInterface/>) : (<LandingPage navigateToModel={navigateModel}/>)}
    </>
  );
}

export default App;
