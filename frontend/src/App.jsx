import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Details from "./pages/Details";
import CreatePage from "./pages/CreatePage";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage/>} />
      <Route path="/task" element={<CreatePage/>} />
      <Route path="/task/:id" element={<Details/>}/>
      
    </Routes>
  
    
  )
}

export default App
