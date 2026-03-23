import { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import VotePage from "./pages/VotePage";
import CreateElection from "./pages/CreateElection";
import ElectionManage from "./pages/ElectionManage";
import { getConnectedWallet } from "./services/blockchain";

function App() {
  const [wallet, setWallet] = useState("");

  useEffect(() => {
    const syncWallet = async () => {
      try {
        const address = await getConnectedWallet();
        setWallet(address);
      } catch (error) {
        console.error(error);
      }
    };

    syncWallet();

    if (!window.ethereum) {
      return undefined;
    }

    const handleAccountsChanged = (accounts) => {
      setWallet(accounts[0] || "");
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Home wallet={wallet} setWallet={setWallet} />}
        />
        <Route path="/vote/:id" element={<VotePage wallet={wallet} />} />
        <Route path="/create" element={<CreateElection wallet={wallet} />} />
        <Route path="/manage/:id" element={<ElectionManage wallet={wallet} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
