import { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import VotePage from "./pages/VotePage";
import CreateElection from "./pages/CreateElection";
import ElectionManage from "./pages/ElectionManage";
import { NotificationProvider } from "./components/Notifications";
import { getConnectedWallet } from "./services/blockchain";

const WALLET_SESSION_KEY = "walletDisconnected";

function App() {
  const [wallet, setWallet] = useState("");

  useEffect(() => {
    const syncWallet = async () => {
      try {
        const isDisconnected = localStorage.getItem(WALLET_SESSION_KEY) === "true";

        if (isDisconnected) {
          setWallet("");
          return;
        }

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
      const isDisconnected = localStorage.getItem(WALLET_SESSION_KEY) === "true";
      const nextWallet = accounts[0] || "";

      if (isDisconnected) {
        setWallet("");
        return;
      }

      setWallet(nextWallet);

      if (nextWallet) {
        localStorage.removeItem(WALLET_SESSION_KEY);
      } else {
        localStorage.setItem(WALLET_SESSION_KEY, "true");
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, []);

  const handleDisconnectWallet = () => {
    localStorage.setItem(WALLET_SESSION_KEY, "true");
    setWallet("");
  };

  return (
    <NotificationProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <Home
                wallet={wallet}
                setWallet={setWallet}
                onDisconnectWallet={handleDisconnectWallet}
              />
            }
          />
          <Route path="/vote/:id" element={<VotePage wallet={wallet} />} />
          <Route path="/create" element={<CreateElection wallet={wallet} />} />
          <Route path="/manage/:id" element={<ElectionManage wallet={wallet} />} />
        </Routes>
      </BrowserRouter>
    </NotificationProvider>
  );
}

export default App;
