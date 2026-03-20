import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav style={{ padding: "10px", background: "#eee" }}>
      <Link to="/" style={{ marginRight: "20px" }}>Chat Tutor</Link>
      {/* <Link to="/generate-test" style={{ marginRight: "20px" }}>Generate Test</Link> */}
      <Link to="/test">Take Test</Link>
    </nav>
  );
}

export default Navbar;