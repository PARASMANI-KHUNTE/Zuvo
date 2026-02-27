"use client";
import React, { createContext, useContext, useState } from "react";

type ModalType = "compose" | "edit-profile" | "settings" | null;

interface ModalContextType {
    activeModal: ModalType;
    openModal: (type: ModalType) => void;
    closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
    const [activeModal, setActiveModal] = useState<ModalType>(null);

    const openModal = (type: ModalType) => setActiveModal(type);
    const closeModal = () => setActiveModal(null);

    return (
        <ModalContext.Provider value={{ activeModal, openModal, closeModal }}>
            {children}
        </ModalContext.Provider>
    );
}

export function useModals() {
    const context = useContext(ModalContext);
    if (!context) throw new Error("useModals must be used within a ModalProvider");
    return context;
}
