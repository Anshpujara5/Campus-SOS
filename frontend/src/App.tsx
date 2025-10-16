import { BrowserRouter,Route,Routes } from "react-router-dom";
import './index.css';
import { SidebarProvider } from "./components/sidebar";
import StudentApp from "./pages/student_pages/studentApp";
import { Signin } from "./pages/common_pages/signin";
import { Signup } from "./pages/common_pages/signup";
import { Alerts } from "./pages/common_pages/alerts";
import MyAlerts from "./pages/common_pages/myAlerts";
import { Publish } from "./pages/common_pages/publish";
import Settings from "./pages/common_pages/settings";
import ForYou from "./pages/common_pages/forYou";
import { Alert } from "./pages/common_pages/alert";
import CampusMapEmbed from "./pages/common_pages/campusMapEmbed";
import "leaflet/dist/leaflet.css";
import ShareLocation from "./pages/common_pages/location_share";

function App() {

  return (
    <BrowserRouter>
      <SidebarProvider>
        <Routes>
          <Route path="/*" element={<StudentApp/>}/>
          <Route path="/signin" element={<Signin/>}/>
          <Route path="/" element={<Signup/>}/>
          <Route path="/alerts" element={<Alerts/>}/>
          <Route path="/my-alerts" element={<MyAlerts/>}/>
          <Route path="/publish" element={<Publish/>}/>
          <Route path="/settings" element={<Settings/>}/>
          <Route path="/alert/:id" element={<Alert/>}/>
          <Route path="/my-alerts" element={<MyAlerts/>}/>
          <Route path="/foryou" element={<ForYou/>}/>
          <Route path="/map" element={<CampusMapEmbed />} />
          <Route path="/share" element={<ShareLocation />} />
        </Routes>
      </SidebarProvider>
    </BrowserRouter>
  );
}

export default App
