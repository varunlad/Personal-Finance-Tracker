
// src/context/ProfileModalContext.jsx
import { createContext, useContext, useState } from "react";

const ProfileModalContext = createContext(null);

export function ProfileModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const openProfile = () => setIsOpen(true);
  const closeProfile = () => setIsOpen(false);

  return (
    <ProfileModalContext.Provider value={{ isOpen, openProfile, closeProfile }}>
      {children}
    </ProfileModalContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProfileModal() {
  const ctx = useContext(ProfileModalContext);
  if (!ctx) {
    throw new Error("useProfileModal must be used within ProfileModalProvider");
  }
  return ctx;
}
