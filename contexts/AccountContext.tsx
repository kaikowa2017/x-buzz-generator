"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

export type AccountInfo = {
  id: string;
  name: string;
  handle: string;
};

type AccountContextType = {
  account: AccountInfo | null;
  setAccount: (account: AccountInfo) => void;
  clearAccount: () => void;
  isLoading: boolean;
};

const AccountContext = createContext<AccountContextType>({
  account: null,
  setAccount: () => {},
  clearAccount: () => {},
  isLoading: true,
});

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccountState] = useState<AccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // DBのアクティブアカウントを優先、なければlocalStorageにフォールバック
    fetch("/api/accounts/active")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: AccountInfo | null) => {
        if (data) {
          setAccountState({ id: data.id, name: data.name, handle: data.handle });
          localStorage.setItem("activeAccount", JSON.stringify(data));
        } else {
          const saved = localStorage.getItem("activeAccount");
          if (saved) {
            try { setAccountState(JSON.parse(saved)); } catch {}
          }
        }
      })
      .catch(() => {
        const saved = localStorage.getItem("activeAccount");
        if (saved) {
          try { setAccountState(JSON.parse(saved)); } catch {}
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const setAccount = useCallback((newAccount: AccountInfo) => {
    setAccountState(newAccount);
    localStorage.setItem("activeAccount", JSON.stringify(newAccount));
  }, []);

  const clearAccount = useCallback(() => {
    setAccountState(null);
    localStorage.removeItem("activeAccount");
  }, []);

  return (
    <AccountContext.Provider value={{ account, setAccount, clearAccount, isLoading }}>
      {children}
    </AccountContext.Provider>
  );
}

export const useAccount = () => useContext(AccountContext);
