import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import IssueList from "./IssueList";
import IssueDetail from "./IssueDetail";

function App() {
  return (
    <Router basename="/weekly-retrospective">
      <Routes>
        <Route path="/" element={<IssueList />} />
        <Route path="/:number" element={<IssueDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
